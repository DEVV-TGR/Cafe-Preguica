import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { chave } from "./chaves";
import { ler, guardar, apagar, ErroDoRedis } from "./redis";

/*
  Os dois cookies que dizem quem está do outro lado.

  | cookie | diz | dura |
  |---|---|---|
  | `preguica_sessao` | "esta pessoa entrou" | 8 horas |
  | `preguica_aparelho` | "este aparelho já passou pelo código" | 30 dias |

  Ambos são, na prática, JWTs HS256 sem a papelada: `v.corpo.assinatura`, com o
  corpo em JSON e base64url. Não se usa o `jose`: a razão histórica para a
  documentação do Next o sugerir era o middleware correr em Edge, onde não há
  `node:crypto` — e no Next 16 o Proxy corre em Node.

  ## Os quatro cuidados

  1. **A assinatura verifica-se antes de o JSON ser lido.** Um `JSON.parse` sobre
     bytes que ainda não se sabe se são nossos é superfície de ataque de graça.
  2. **A validade vai dentro do corpo assinado, e é verificada.** O `Max-Age` do
     cookie é do cliente e não vale nada.
  3. **`timingSafeEqual` com guarda de comprimento** — atira se os buffers
     tiverem tamanhos diferentes.
  4. **O rótulo entra dentro do HMAC**, e cada rótulo usa uma chave diferente
     (ver `lib/painel/chaves.ts`). Um selo de sessão não pode servir de selo de
     aparelho.

  ## Porque é que o aparelho tem registo no Redis e a sessão não

  Para poder ser **revogado**. A sessão dura oito horas e passa; um aparelho
  lembrado dura um mês, e um mês é tempo de mais para não haver forma de dizer
  "esquece aquele telemóvel". O cookie leva um segredo, o Redis guarda o hash
  dele, e apagar a chave corta o acesso na hora.

  ## Porque é que o token do aparelho não roda

  A prática recomendada é gerar um token novo a cada utilização, para detectar
  cópias — um token antigo a reaparecer é sinal de roubo. Aqui não se faz, e é
  decisão consciente: duas abas abertas correm a rotação ao mesmo tempo e uma
  fica com um token morto, e a resposta habitual a essa detecção (apagar todos os
  aparelhos) transforma uma corrida banal numa expulsão geral.

  Com uma ou duas pessoas, a probabilidade de duas abas é muito maior do que a
  de um cookie roubado, e a revogação manual — que existe — resolve o caso raro
  sem estragar o comum.
*/

export const NOME_DO_COOKIE = "preguica_sessao";
export const NOME_DO_APARELHO = "preguica_aparelho";

/* Oito horas — um turno. Quem fecha a casa não fica com sessão aberta. */
export const VALIDADE_MS = 8 * 60 * 60 * 1000;

/*
  Trinta dias, e é conforto assumido: a alternativa era pedir o código de cada
  vez, e quem tem de ir ao email para corrigir um preço acaba por não corrigir o
  preço — que é o problema que o painel existe para resolver.

  Se algum dia o painel for usado num tablet partilhado ao balcão, isto tem de
  baixar ou desaparecer: nesse cenário o aparelho lembrado é uma chave que fica
  em cima do balcão.
*/
export const VALIDADE_APARELHO_MS = 30 * 24 * 60 * 60 * 1000;
const VALIDADE_APARELHO_S = VALIDADE_APARELHO_MS / 1000;

type Rotulo = "sessao" | "aparelho";

const VERSAO = "s2";

async function assinar(rotulo: Rotulo, corpo: string): Promise<string> {
  return createHmac("sha256", await chave(rotulo))
    .update(`${VERSAO}.${rotulo}.${corpo}`)
    .digest("base64url");
}

async function selarComo(
  rotulo: Rotulo,
  dados: Record<string, unknown>,
  validade: number,
): Promise<string> {
  const corpo = Buffer.from(
    JSON.stringify({ ...dados, exp: Date.now() + validade }),
  ).toString("base64url");

  return `${VERSAO}.${corpo}.${await assinar(rotulo, corpo)}`;
}

async function abrirComo(
  rotulo: Rotulo,
  valor: string | undefined,
): Promise<Record<string, unknown> | null> {
  if (!valor) return null;

  const partes = valor.split(".");
  if (partes.length !== 3 || partes[0] !== VERSAO) return null;
  const [, corpo, selo] = partes;

  /*
    A chave que verifica o selo vem do armazenamento, e o armazenamento pode
    estar em baixo.

    Nesse caso não se consegue dizer se este cookie é nosso — e **não conseguir
    verificar é motivo para não confiar, nunca para confiar**. Falha fechado:
    devolve `null`, quem estava lá dentro dá por si no ecrã de entrada, e é lá
    que a acção explica o que se passa em português.

    O que isto substitui é pior de duas maneiras: o `ErroDoRedis` subia até ao
    topo e a página do painel rebentava com o ecrã de avaria da Vercel — que não
    explica nada e, ainda por cima, aparecia igual a quem tinha sessão e a quem
    não tinha.
  */
  let esperado: Buffer;
  try {
    esperado = Buffer.from(await assinar(rotulo, corpo));
  } catch (erro) {
    if (erro instanceof ErroDoRedis) {
      console.error(`[painel] ${erro.message}`);
      return null;
    }
    throw erro;
  }

  const recebido = Buffer.from(selo);
  if (esperado.length !== recebido.length) return null;
  if (!timingSafeEqual(esperado, recebido)) return null;

  /* Só a partir daqui é que estes bytes são de confiança. */
  try {
    const lido: unknown = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8"));
    if (typeof lido !== "object" || lido === null) return null;

    const { exp } = lido as Record<string, unknown>;
    if (typeof exp !== "number" || exp < Date.now()) return null;

    return lido as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function selar(email: string): Promise<string> {
  return selarComo("sessao", { e: email }, VALIDADE_MS);
}

/** Quem está do outro lado, se o selo for nosso e ainda estiver dentro da validade. */
export async function abrir(valor: string | undefined): Promise<{ email: string } | null> {
  const lido = await abrirComo("sessao", valor);
  return typeof lido?.e === "string" ? { email: lido.e } : null;
}

function chaveDoAparelho(segredo: string): string {
  return `aparelho:${createHash("sha256").update(segredo).digest("hex").slice(0, 32)}`;
}

/*
  Um aparelho novo: o cookie leva um segredo aleatório, o Redis guarda o hash.

  O segredo original nunca é guardado — se o armazenamento for lido, os cookies
  que já andam por aí não podem ser reconstruídos a partir dele.
*/
export async function lembrarAparelho(email: string): Promise<string> {
  const segredo = randomBytes(32).toString("base64url");
  await guardar(chaveDoAparelho(segredo), email, VALIDADE_APARELHO_S);

  return selarComo("aparelho", { e: email, s: segredo }, VALIDADE_APARELHO_MS);
}

/*
  Este aparelho já passou pelo código, e foi **este** email a passar por ele.

  Duas verificações, e as duas são precisas: a assinatura do cookie (que prova
  que o emitimos nós) e o registo no Redis (que prova que não foi revogado desde
  então). Sem a segunda, o botão de esquecer aparelhos não fazia nada.

  A comparação do email não é decorativa: sem ela, um aparelho lembrado para uma
  pessoa deixava outra pessoa da lista entrar sem código.
*/
export async function aparelhoConhecido(
  valor: string | undefined,
  email: string,
): Promise<boolean> {
  const lido = await abrirComo("aparelho", valor);
  if (lido?.e !== email || typeof lido.s !== "string") return false;

  return (await ler(chaveDoAparelho(lido.s))) === email;
}

/** Esquece este aparelho — o cookie continua a existir, mas deixa de valer. */
export async function esquecerAparelho(valor: string | undefined): Promise<void> {
  const lido = await abrirComo("aparelho", valor);
  if (typeof lido?.s === "string") await apagar(chaveDoAparelho(lido.s));
}

/*
  As opções dos cookies.

  `path: "/painel"` e não `/`: assim nenhum deles viaja nos pedidos às
  páginas públicas, que são servidas do CDN e não têm nada que ver com sessões.

  `secure` fica desligado em desenvolvimento, senão o browser recusa o cookie em
  `http://localhost` e não há forma de entrar na própria máquina.
*/
export function opcoesDoCookie(validadeMs = VALIDADE_MS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/painel",
    maxAge: Math.floor(validadeMs / 1000),
  };
}
