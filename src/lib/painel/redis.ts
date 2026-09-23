import "server-only";

/*
  O sítio onde se conta.

  Este ficheiro existe por uma razão só, e é a razão que estava escrita — como
  desculpa — no ficheiro que ele substitui: **em serverless não há memória
  partilhada.** Cada invocação pode ser uma instância nova, e um contador num
  `Map` reinicia-se sozinho. Um limite de tentativas que se apaga a si próprio
  não é um limite.

  Enquanto havia password, isso passava por defesa em profundidade: a password
  travava a força bruta e o contador era um extra. Sem password, o contador é a
  defesa — e uma defesa que não conta não serve.

  ## Upstash, por REST

  Só `fetch`, sem SDK. O Upstash serve os comandos no próprio caminho
  (`URL/INCR/chave`) e tem um `/pipeline` para mandar vários de uma vez. É a
  mesma escolha que já foi feita para o GitHub e para o Resend, e pela mesma
  razão: três chamadas HTTP não justificam uma árvore de dependências.

  ## Porquê Redis e não a base de dados que o documento pede

  Tudo o que aqui se guarda tem prazo — contadores de 15 minutos, códigos de 10,
  aparelhos de 30 dias. Num Redis isso é o `EX` de cada chave e mais nada; numa
  base de dados relacional seriam tabelas, migrações, e um cron a apagar linhas
  velhas que alguém tem de lembrar de montar. A única coisa que se perde é o
  registo de auditoria, e para uma casa com duas pessoas isso é o `git log` dos
  commits do painel.
*/

type Resposta<T> = { result: T } | { error: string };

export class ErroDoRedis extends Error {
  constructor(detalhe: string) {
    super(`Não foi possível falar com o armazenamento: ${detalhe}`);
    this.name = "ErroDoRedis";
  }

  /*
    A frase para quem está do outro lado.

    Existe pela mesma razão que a do `ErroAoEnviar` e a do `ErroDoGithub`: sem
    ela, o que aparecia era o ecrã de avaria da Vercel — em inglês, com um número
    de oito algarismos e mais nada. O `docs/PAINEL.md` promete esta frase na
    tabela de avarias desde que a tabela existe; até agora era só uma promessa.

    Não diz "Redis" nem "Upstash". Quem está a tentar entrar não tem de saber o
    nome do fornecedor — tem de saber que o problema não é o código que escreveu
    e que não vale a pena continuar a tentar.
  */
  get paraOEcra(): string {
    return (
      "O painel não está a conseguir falar com o armazenamento e por isso não " +
      "deixa entrar ninguém. Não é do teu código nem do teu email. Fala com o " +
      "Tomás."
    );
  }
}

/*
  A integração do Upstash pela Vercel injecta os nomes `UPSTASH_*`. As
  instalações antigas do Vercel KV usam `KV_REST_API_*` e apontam ao mesmo
  serviço — aceitar os dois evita uma hora de depuração no dia em que o projecto
  for ligado pela outra porta.

  Lido dentro da função, como tudo o que toca no ambiente: o `next build` da CI
  corre sem uma única variável definida.
*/
function ligacao(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

/*
  O recuo em desenvolvimento.

  Sem Upstash configurado, e **só fora de produção**, os contadores vivem num
  `Map` desta instância. É exactamente o mecanismo que este ficheiro existe para
  substituir, e não serve para nada a sério — serve para não obrigar quem quer
  ver um ecrã na própria máquina a montar um Redis primeiro.

  Em produção, sem ligação, atira. Um painel que conta em memória é um painel que
  não conta, e é melhor não abrir do que abrir sem trinco.
*/
const memoria = new Map<string, { valor: string; expira: number }>();
let avisou = false;

function emMemoria(): boolean {
  if (process.env.NODE_ENV === "production") {
    throw new ErroDoRedis(
      "UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN em falta. " +
        "Ver docs/PAINEL.md.",
    );
  }

  if (!avisou) {
    avisou = true;
    console.warn(
      "\n[painel] Sem Upstash configurado. Os contadores estão a viver na " +
        "memória deste processo — serve para desenvolvimento e mais nada.\n",
    );
  }
  return true;
}

function lerDaMemoria(chave: string): string | null {
  const registo = memoria.get(chave);
  if (!registo) return null;
  if (registo.expira !== 0 && registo.expira < Date.now()) {
    memoria.delete(chave);
    return null;
  }
  return registo.valor;
}

async function comando<T>(partes: (string | number)[]): Promise<T> {
  const ligado = ligacao();
  if (!ligado) throw new ErroDoRedis("sem ligação");

  /*
    Cada argumento vai num segmento do caminho, e por isso tem de ser escapado —
    um email tem `@` e um `.`, e um valor pode ter uma barra. Sem o
    `encodeURIComponent`, uma chave com barra partia o caminho em dois e o
    comando ia dar a outro sítio.
  */
  const caminho = partes.map((p) => encodeURIComponent(String(p))).join("/");

  const resposta = await fetch(`${ligado.url}/${caminho}`, {
    headers: { Authorization: `Bearer ${ligado.token}` },
    cache: "no-store",
  });

  if (!resposta.ok) {
    throw new ErroDoRedis(`${resposta.status} ${await resposta.text()}`);
  }

  const corpo = (await resposta.json()) as Resposta<T>;
  if ("error" in corpo) throw new ErroDoRedis(corpo.error);
  return corpo.result;
}

export async function ler(chave: string): Promise<string | null> {
  if (!ligacao() && emMemoria()) return lerDaMemoria(chave);
  return comando<string | null>(["GET", chave]);
}

export async function guardar(
  chave: string,
  valor: string,
  segundos?: number,
): Promise<void> {
  if (!ligacao() && emMemoria()) {
    memoria.set(chave, {
      valor,
      expira: segundos ? Date.now() + segundos * 1000 : 0,
    });
    return;
  }

  await comando(
    segundos ? ["SET", chave, valor, "EX", segundos] : ["SET", chave, valor],
  );
}

/*
  Guarda só se ainda não existir, e diz se foi ele quem a criou.

  É o que impede duas instâncias em arranque simultâneo de gerarem dois segredos
  de sessão diferentes — a primeira ganha, a segunda lê o que a primeira pôs. Um
  `GET` seguido de um `SET` não daria essa garantia; o `NX` é atómico do lado do
  Redis.
*/
export async function guardarSeNovo(chave: string, valor: string): Promise<boolean> {
  if (!ligacao() && emMemoria()) {
    if (lerDaMemoria(chave) !== null) return false;
    memoria.set(chave, { valor, expira: 0 });
    return true;
  }

  return (await comando<string | null>(["SET", chave, valor, "NX"])) === "OK";
}

export async function apagar(chave: string): Promise<void> {
  if (!ligacao() && emMemoria()) {
    memoria.delete(chave);
    return;
  }
  await comando(["DEL", chave]);
}

/*
  Soma um e devolve o total, pondo o prazo na primeira vez.

  O `INCR` é atómico, e é isso que faz este contador valer alguma coisa: dois
  pedidos ao mesmo tempo somam dois, não um. Era precisamente o que o contador
  dentro do cookie não conseguia — lá, quem atacava reenviava uma cópia antiga e
  punha a contagem a zero.

  O prazo põe-se só quando o contador nasce (`total === 1`), senão cada tentativa
  empurrava a janela para a frente e o limite nunca fechava.
*/
export async function somar(chave: string, segundos: number): Promise<number> {
  if (!ligacao() && emMemoria()) {
    const total = Number(lerDaMemoria(chave) ?? 0) + 1;
    const registo = memoria.get(chave);
    memoria.set(chave, {
      valor: String(total),
      expira: registo?.expira || Date.now() + segundos * 1000,
    });
    return total;
  }

  const total = await comando<number>(["INCR", chave]);
  if (total === 1) await comando(["EXPIRE", chave, segundos]);
  return total;
}
