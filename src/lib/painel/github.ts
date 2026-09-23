import "server-only";

/*
  Gravar no repositório.

  Não há base de dados. O painel escreve os ficheiros de `src/data/` no próprio
  repositório, pela API do GitHub, e a Vercel refaz o deploy ao ver o push. O
  histórico de quem mudou o preço de quê, e quando, é o `git log` — que já
  existia e não custa nada.

  Só `fetch`. O Octokit faria isto com menos linhas e traria uma árvore de
  dependências para três chamadas HTTP.

  ## O `sha` é do ficheiro, não do commit

  A Contents API devolve, e volta a exigir, o **blob sha** do ficheiro. Não é o
  sha do commit, apesar de os dois aparecerem na mesma resposta e terem o mesmo
  aspecto. Trocá-los dá 422 em todas as gravações, e a mensagem de erro do
  GitHub não ajuda nada a perceber porquê.

  Esse sha é também o cadeado: mandá-lo de volta é dizer "gravo por cima
  daquilo que li". Se entretanto mudou, o GitHub recusa em vez de esmagar.

  ## Porque é que o painel lê daqui e não do `import`

  O `src/data/ementa.json` importado em código fica **embutido no build**. Durante
  o minuto e meio em que a Vercel reconstrói, esse import é a versão anterior à
  que se acabou de gravar — duas edições seguidas e a segunda apagava a
  primeira sem aviso. E não traz o `sha`, que é metade do que a gravação
  precisa.

  O site continua a usar o `import`, e é isso que o mantém estático. Só o
  painel é que vem cá.
*/

const API = "https://api.github.com";

/* Cabe uma vez em `lib/site.ts`? Não — isto é do repositório, não da casa. */
const DONO = "DEVV-TGR";
const REPO = "Cafe-Preguica";

/*
  Em produção grava sempre no `main`, que é o que a Vercel publica.

  Fora de produção, `PAINEL_GITHUB_RAMO` deixa experimentar o painel na própria
  máquina contra uma branch de ensaio — sem ela, carregar em "Publicar" no
  `npm run dev` punha um preço de teste no site verdadeiro. A branch tem de
  existir antes; a API não a cria.
*/
function ramo(): string {
  if (process.env.NODE_ENV === "production") return "main";
  return process.env.PAINEL_GITHUB_RAMO?.trim() || "main";
}

export const CAMINHO_EMENTA = "src/data/ementa.json";
export const CAMINHO_CAFE = "src/data/cafe.json";
export const CAMINHO_MARCA = "src/data/marca.json";

export class ConflitoDeGravacao extends Error {
  constructor() {
    super("O ficheiro mudou no repositório desde que este ecrã foi aberto.");
    this.name = "ConflitoDeGravacao";
  }
}

export class ErroDoGithub extends Error {
  readonly estado: number;
  readonly detalhe: string;

  /*
    Campos declarados e atribuídos à mão, e não com `readonly` na assinatura do
    construtor. O açúcar do TypeScript ficava mais curto e tornava este ficheiro
    impossível de carregar fora do bundler — o Node despe tipos, mas não sabe
    converter *parameter properties* em código, e atira
    `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. Duas linhas a mais é o que este módulo
    custa para poder ser exercitado por um script, que é como se verificou o
    cadeado do `sha` sem gastar um commit verdadeiro.
  */
  constructor(estado: number, detalhe: string) {
    super(`O GitHub respondeu ${estado}.`);
    this.name = "ErroDoGithub";
    this.estado = estado;
    this.detalhe = detalhe;
  }

  /*
    A mensagem que se mostra a quem está do outro lado.

    ## Não configurado e expirado não são a mesma coisa

    Esta distinção nasceu de um engano real: sem `PAINEL_GITHUB_TOKEN` nenhum, o
    painel dizia *"o mais provável é o token ter expirado ou perdido
    permissões"* — e mandava quem o lesse procurar um problema que não existia,
    em vez de o mandar criar o token que faltava.

    Um erro que descreve mal a causa é pior do que um erro genérico: o genérico
    faz perguntar, o errado faz procurar no sítio errado.

    O 401 e o 403 do próprio GitHub continuam a merecer palavras próprias, e
    pela razão que já lá estava: um PAT caduca ao fim de um ano, no máximo, e
    sem isto escrito o sintoma seria "o painel deixou de gravar" e mais nada.
  */
  get paraOEcra(): string {
    if (this.estado === SEM_TOKEN) {
      return (
        "O painel ainda não tem acesso ao repositório — falta configurar o " +
        "PAINEL_GITHUB_TOKEN. Ver docs/PAINEL.md."
      );
    }
    if (this.estado === 401 || this.estado === 403) {
      return (
        "O painel não conseguiu falar com o GitHub — o mais provável é o " +
        "token ter expirado ou perdido permissões. Fala com o Tomás."
      );
    }
    if (this.estado === 404) {
      return (
        "O painel não encontrou o ficheiro no repositório. Ou o token não vê " +
        "este repositório, ou alguém mexeu na pasta src/data/. Fala com o Tomás."
      );
    }
    return `Não foi possível gravar (o GitHub respondeu ${this.estado}). Tenta outra vez daqui a pouco.`;
  }
}

/*
  Não é um código de estado do GitHub — o pedido nem chega a sair. É um número
  fora da gama do HTTP de propósito, para nunca colidir com uma resposta real.
*/
const SEM_TOKEN = 0;

/* Lido dentro da função: em module scope rebentava o `next build` da CI. */
function cabecalhos(): HeadersInit {
  const token = process.env.PAINEL_GITHUB_TOKEN;
  if (!token) throw new ErroDoGithub(SEM_TOKEN, "PAINEL_GITHUB_TOKEN em falta.");

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "painel-preguica",
  };
}

export type Ficheiro<T> = { dados: T; sha: string };

export async function ler<T>(caminho: string): Promise<Ficheiro<T>> {
  const resposta = await fetch(
    `${API}/repos/${DONO}/${REPO}/contents/${caminho}?ref=${ramo()}`,
    /*
      `no-store` porque o Next memoiza `fetch` por omissão e servir aqui uma
      versão em cache seria servir um `sha` velho — ou seja, um conflito
      garantido na gravação a seguir, ou pior.
    */
    { headers: cabecalhos(), cache: "no-store" },
  );

  if (!resposta.ok) {
    throw new ErroDoGithub(resposta.status, await resposta.text());
  }

  const corpo = (await resposta.json()) as { content: string; sha: string };

  return {
    dados: JSON.parse(
      Buffer.from(corpo.content, "base64").toString("utf8"),
    ) as T,
    sha: corpo.sha,
  };
}

const IDENTIDADE = {
  name: "Painel do Preguiça",
  email: "painel@cafepreguica.pt",
};

export async function gravar({
  caminho,
  dados,
  sha,
  mensagem,
}: {
  caminho: string;
  dados: unknown;
  /** O que veio do `ler()`. É o cadeado. */
  sha: string;
  mensagem: string;
}): Promise<{ commit: string; sha: string }> {
  /*
    Indentação a 2 e newline no fim — o mesmo que o resto do repositório.

    Sem isto, cada gravação daria um diff em que o ficheiro inteiro é uma linha
    só, e o histórico em git — que foi a razão de se escolher o GitHub em vez de
    uma base de dados — deixava de valer alguma coisa.
  */
  const texto = `${JSON.stringify(dados, null, 2)}\n`;

  const resposta = await fetch(`${API}/repos/${DONO}/${REPO}/contents/${caminho}`, {
    method: "PUT",
    headers: { ...cabecalhos(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: mensagem,
      content: Buffer.from(texto, "utf8").toString("base64"),
      sha,
      branch: ramo(),
      /*
        Autor e committer são o painel, e não quem entrou.

        Na Taskuinha o autor é o email verdadeiro de quem gravou. Aqui não pode
        ser: **este repositório é público**, e cada commit do painel publicava
        no GitHub o endereço pessoal do dono da casa — para sempre, porque o
        histórico não se reescreve. Quem gravou fica na mensagem do commit,
        mascarado pelo `meioEscondido()`, que chega para quem conhece a casa
        saber quem foi.
      */
      author: IDENTIDADE,
      committer: IDENTIDADE,
    }),
  });

  /*
    409 quando o sha está velho ou há dois PUTs em voo — a documentação do
    GitHub diz que estes pontos "must be used serially". 422 quando o sha é
    inválido ou falta. Para quem está a gravar, os dois querem dizer o mesmo.

    **Nunca fazer retry automático aqui.** Reler o ficheiro para apanhar o sha
    fresco e voltar a mandar o que estava no ecrã funciona sempre — e apaga
    sempre, em silêncio, o que a outra pessoa acabou de gravar. É o bug
    clássico deste padrão. O conflito sobe até ao ecrã e a decisão é de quem lá
    está.
  */
  if (resposta.status === 409 || resposta.status === 422) {
    throw new ConflitoDeGravacao();
  }
  if (!resposta.ok) {
    throw new ErroDoGithub(resposta.status, await resposta.text());
  }

  const corpo = (await resposta.json()) as {
    commit: { sha: string };
    content: { sha: string };
  };

  return { commit: corpo.commit.sha, sha: corpo.content.sha };
}

/** O endereço de um commit, para o painel poder mostrar o que gravou. */
export function enderecoDoCommit(sha: string): string {
  return `https://github.com/${DONO}/${REPO}/commit/${sha}`;
}
