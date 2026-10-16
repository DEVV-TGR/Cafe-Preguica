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
  velhas que alguém tem de lembrar de montar.

  O registo de quem entra no painel (`lib/painel/entradas.ts`) também cabe aqui:
  uma lista por dia, com hora de morte absoluta, e o Redis faz o papel do cron
  (ver `empurrarAte`, lá em baixo).
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

/*
  Vários comandos num pedido só, pelo `/pipeline` do Upstash.

  Existe para ler de uma vez as listas de um mês inteiro de entradas, ou os
  registos de todos os aparelhos: trinta pedidos HTTP em série eram trinta
  esperas, para uma página que duas pessoas abrem. Cada comando tem a sua
  resposta, e um erro em qualquer um atira — meia leitura não é leitura.
*/
async function emLote<T>(comandos: (string | number)[][]): Promise<T[]> {
  const ligado = ligacao();
  if (!ligado) throw new ErroDoRedis("sem ligação");
  if (comandos.length === 0) return [];

  const resposta = await fetch(`${ligado.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ligado.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(comandos.map((c) => c.map(String))),
    cache: "no-store",
  });
  if (!resposta.ok) {
    throw new ErroDoRedis(`${resposta.status} ${await resposta.text()}`);
  }

  const corpo = (await resposta.json()) as Resposta<T>[];
  return corpo.map((r) => {
    if ("error" in r) throw new ErroDoRedis(r.error);
    return r.result;
  });
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
export async function guardarSeNovo(
  chave: string,
  valor: string,
  segundos?: number,
): Promise<boolean> {
  if (!ligacao() && emMemoria()) {
    if (lerDaMemoria(chave) !== null) return false;
    memoria.set(chave, { valor, expira: segundos ? Date.now() + segundos * 1000 : 0 });
    return true;
  }

  const partes = segundos ? ["SET", chave, valor, "NX", "EX", segundos] : ["SET", chave, valor, "NX"];
  return (await comando<string | null>(partes)) === "OK";
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

/*
  Soma um a um campo de um hash, sem prazo.

  É o que guarda as leituras das mesas (`lib/mesas.ts`): contagens que valem a
  pena ter daqui a um ano, e por isso sem `EX`. O `HINCRBY` é atómico como o
  `INCR` — duas pessoas da mesma mesa ao mesmo tempo contam duas.
*/
export async function somarNoHash(chave: string, campo: string): Promise<void> {
  if (!ligacao() && emMemoria()) {
    const hash = JSON.parse(lerDaMemoria(chave) ?? "{}") as Record<string, number>;
    hash[campo] = (hash[campo] ?? 0) + 1;
    memoria.set(chave, { valor: JSON.stringify(hash), expira: 0 });
    return;
  }
  await comando(["HINCRBY", chave, campo, 1]);
}

/* O hash inteiro, com os valores já em número. O Upstash devolve o `HGETALL`
   como uma lista plana — campo, valor, campo, valor — e é aqui que se junta. */
export async function lerHash(chave: string): Promise<Record<string, number>> {
  if (!ligacao() && emMemoria()) {
    return JSON.parse(lerDaMemoria(chave) ?? "{}") as Record<string, number>;
  }

  const plana = (await comando<string[] | null>(["HGETALL", chave])) ?? [];
  const hash: Record<string, number> = {};
  for (let i = 0; i + 1 < plana.length; i += 2) hash[plana[i]] = Number(plana[i + 1]);
  return hash;
}

/*
  Uma linha nova no princípio de uma lista, que nunca passa de `maximo`.

  O `LTRIM` é o que dispensa o cron: a lista corta-se sozinha a cada escrita, e
  as linhas mais velhas caem pelo fim. O prazo é para a lista inteira — se
  ninguém escrever nela durante esse tempo, desaparece.
*/
export async function empurrarNaLista(
  chave: string,
  valor: string,
  maximo: number,
  segundos: number,
): Promise<void> {
  if (!ligacao() && emMemoria()) {
    const lista = JSON.parse(lerDaMemoria(chave) ?? "[]") as string[];
    memoria.set(chave, {
      valor: JSON.stringify([valor, ...lista].slice(0, maximo)),
      expira: Date.now() + segundos * 1000,
    });
    return;
  }

  await comando(["LPUSH", chave, valor]);
  await comando(["LTRIM", chave, 0, maximo - 1]);
  await comando(["EXPIRE", chave, segundos]);
}

/** As primeiras `quantas` linhas de uma lista — as mais recentes, com o `LPUSH`. */
export async function lerLista(chave: string, quantas: number): Promise<string[]> {
  if (!ligacao() && emMemoria()) {
    return (JSON.parse(lerDaMemoria(chave) ?? "[]") as string[]).slice(0, quantas);
  }

  return (await comando<string[] | null>(["LRANGE", chave, 0, quantas - 1])) ?? [];
}

/*
  Um hash de texto — campos com JSON lá dentro, sem prazo por campo.

  Foi o registo dos aparelhos do painel, até se perceber que um hash sem prazo
  não cumpre prazo nenhum (revisão legal de 2026-10-15). Fica para ler e migrar
  o que lá estava — ver `migrarHashAntigo` em `lib/painel/aparelhos.ts`. Para
  dados de pessoas, usar chaves com prazo (`guardarAte`).
*/
export async function guardarNoHash(chave: string, campo: string, valor: string): Promise<void> {
  if (!ligacao() && emMemoria()) {
    const hash = JSON.parse(lerDaMemoria(chave) ?? "{}") as Record<string, string>;
    hash[campo] = valor;
    memoria.set(chave, { valor: JSON.stringify(hash), expira: 0 });
    return;
  }
  await comando(["HSET", chave, campo, valor]);
}

/** O hash inteiro, com os valores em texto, como foram guardados. */
export async function lerHashDeTexto(chave: string): Promise<Record<string, string>> {
  if (!ligacao() && emMemoria()) {
    return JSON.parse(lerDaMemoria(chave) ?? "{}") as Record<string, string>;
  }

  const plana = (await comando<string[] | null>(["HGETALL", chave])) ?? [];
  const hash: Record<string, string> = {};
  for (let i = 0; i + 1 < plana.length; i += 2) hash[plana[i]] = plana[i + 1];
  return hash;
}

export async function apagarDoHash(chave: string, campo: string): Promise<void> {
  if (!ligacao() && emMemoria()) {
    const hash = JSON.parse(lerDaMemoria(chave) ?? "{}") as Record<string, string>;
    delete hash[campo];
    memoria.set(chave, { valor: JSON.stringify(hash), expira: 0 });
    return;
  }
  await comando(["HDEL", chave, campo]);
}

/* ---------------------------------------------- prazos que não se renovam -- */

/*
  O que vem daqui para baixo existe porque "o prazo da lista" não é "o prazo de
  cada linha" (revisão legal de 2026-10-15). Uma lista com `EXPIRE` renovado a
  cada escrita nunca expira enquanto alguém escrever nela, e a linha mais velha
  fica lá dentro o tempo que for. Quando a página de privacidade promete um
  prazo por registo, é a hora absoluta (`PXAT`/`PEXPIREAT`) que o cumpre: o Redis
  apaga a chave sozinho nessa hora, quer alguém volte a ler quer não.
*/

/** Guarda até `ateMs` (milissegundos desde 1970). Uma hora já passada apaga. */
export async function guardarAte(chave: string, valor: string, ateMs: number): Promise<void> {
  if (ateMs <= Date.now()) return apagar(chave);
  if (!ligacao() && emMemoria()) {
    memoria.set(chave, { valor, expira: ateMs });
    return;
  }
  await comando(["SET", chave, valor, "PXAT", Math.floor(ateMs)]);
}

/** Várias chaves de uma vez, pela ordem pedida; `null` nas que não existem. */
export async function lerVarias(chaves: string[]): Promise<(string | null)[]> {
  if (chaves.length === 0) return [];
  if (!ligacao() && emMemoria()) return chaves.map(lerDaMemoria);
  const [valores] = await emLote<(string | null)[]>([["MGET", ...chaves]]);
  return valores;
}

/*
  Uma linha nova no princípio de uma lista que morre a `ateMs`, aconteça o que
  acontecer. Ao contrário do `empurrarNaLista`, escrever outra vez não adia
  nada: a hora é a mesma para todas as linhas daquela lista.
*/
export async function empurrarAte(
  chave: string,
  valor: string,
  maximo: number,
  ateMs: number,
): Promise<void> {
  if (ateMs <= Date.now()) return;
  if (!ligacao() && emMemoria()) {
    const lista = JSON.parse(lerDaMemoria(chave) ?? "[]") as string[];
    memoria.set(chave, { valor: JSON.stringify([valor, ...lista].slice(0, maximo)), expira: ateMs });
    return;
  }
  await emLote([
    ["LPUSH", chave, valor],
    ["LTRIM", chave, 0, maximo - 1],
    ["PEXPIREAT", chave, Math.floor(ateMs)],
  ]);
}

/** As primeiras `quantas` linhas de cada lista, num pedido só. */
export async function lerListas(chaves: string[], quantas: number): Promise<string[][]> {
  if (!ligacao() && emMemoria()) {
    return chaves.map((c) => (JSON.parse(lerDaMemoria(c) ?? "[]") as string[]).slice(0, quantas));
  }
  const listas = await emLote<string[] | null>(chaves.map((c) => ["LRANGE", c, 0, quantas - 1]));
  return listas.map((l) => l ?? []);
}

/*
  Um conjunto de nomes, para saber que chaves ler. Guarda identificadores e
  mais nada: o que diz respeito a pessoas vive nas chaves com prazo próprio, e
  quem lê tira do conjunto as que o Redis já apagou.
*/
export async function juntarAoConjunto(chave: string, membro: string, segundos: number): Promise<void> {
  if (!ligacao() && emMemoria()) {
    const conjunto = new Set(JSON.parse(lerDaMemoria(chave) ?? "[]") as string[]);
    conjunto.add(membro);
    memoria.set(chave, { valor: JSON.stringify([...conjunto]), expira: Date.now() + segundos * 1000 });
    return;
  }
  await emLote([
    ["SADD", chave, membro],
    ["EXPIRE", chave, segundos],
  ]);
}

export async function tirarDoConjunto(chave: string, membros: string[]): Promise<void> {
  if (membros.length === 0) return;
  if (!ligacao() && emMemoria()) {
    const registo = memoria.get(chave);
    const conjunto = new Set(JSON.parse(lerDaMemoria(chave) ?? "[]") as string[]);
    for (const m of membros) conjunto.delete(m);
    memoria.set(chave, { valor: JSON.stringify([...conjunto]), expira: registo?.expira ?? 0 });
    return;
  }
  await comando(["SREM", chave, ...membros]);
}

export async function lerConjunto(chave: string): Promise<string[]> {
  if (!ligacao() && emMemoria()) return JSON.parse(lerDaMemoria(chave) ?? "[]") as string[];
  return (await comando<string[] | null>(["SMEMBERS", chave])) ?? [];
}

/** Põe prazo a uma chave que já existe (`segundos`), ou tira-lho (`null`). */
export async function mudarPrazo(chave: string, segundos: number | null): Promise<void> {
  if (!ligacao() && emMemoria()) {
    const registo = memoria.get(chave);
    if (registo) registo.expira = segundos === null ? 0 : Date.now() + segundos * 1000;
    return;
  }
  await comando(segundos === null ? ["PERSIST", chave] : ["EXPIRE", chave, segundos]);
}

/** Quanto falta para a chave expirar, em segundos: `-1` sem prazo, `-2` se não existe. */
export async function prazoDe(chave: string): Promise<number> {
  if (!ligacao() && emMemoria()) {
    const registo = memoria.get(chave);
    if (!registo || lerDaMemoria(chave) === null) return -2;
    return registo.expira === 0 ? -1 : Math.ceil((registo.expira - Date.now()) / 1000);
  }
  return comando<number>(["TTL", chave]);
}
