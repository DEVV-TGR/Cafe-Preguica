import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { chave } from "@/lib/painel/chaves";

/*
  A chave da carta secreta que fica no browser.

  ## Não leva email, e cancelar a newsletter não a apaga

  Revisão legal de 2026-10-15. A chave de antes (`c1`) levava o email, em
  base64url — que se lê, não é cifra nenhuma — e cada abertura perguntava ao
  Resend se a pessoa continuava inscrita: quem cancelava a newsletter perdia a
  carta. Retirar o consentimento não pode custar nada (RGPD, art. 7.º, n.º 3).

  A carta continua a abrir-se a quem recebe as novidades (ver
  `app/api/carta-secreta/route.ts`), mas a chave diz apenas "este browser já
  abriu a carta, e vale até X" — assinada, para ninguém a fabricar, e sem nada
  de pessoal lá dentro. Quem cancela a newsletter guarda-a até ela caducar.

  ## Dois prazos, e quem escolhe é a pessoa

  | | prazo | onde fica |
  |---|---|---|
  | por defeito | `VALIDADE_DA_SESSAO_MS` (24 horas) | `sessionStorage` — o browser apaga-a ao fechar o separador |
  | "lembrar neste aparelho" | `VALIDADE_LEMBRADA_MS` (90 dias) | `localStorage` |

  O prazo não se renova ao abrir: 90 dias depois de escolher, a escolha
  acaba, e a pessoa volta a escrever o email (ou a escolher). Os 90 dias são uma
  proposta — uma estação de visitas à casa —, não uma regra; ver
  `docs/decisoes-pendentes.md`.

  ## As chaves `c1`

  Ainda há browsers com uma chave `c1` (com email) no `localStorage`. A rota
  aceita-a uma última vez, se for nossa e estiver no prazo, e devolve uma `c2`
  de sessão no lugar; o browser apaga a `c1`. Não se pergunta ao Resend, pela
  mesma razão de cima.
*/

const VERSAO = "c2";
const VERSAO_ANTIGA = "c1";
export const VALIDADE_DA_SESSAO_MS = 24 * 60 * 60 * 1000;
export const VALIDADE_LEMBRADA_MS = 90 * 24 * 60 * 60 * 1000;

async function assinar(versao: string, corpo: string): Promise<string> {
  return createHmac("sha256", await chave("carta")).update(`${versao}.${corpo}`).digest("base64url");
}

export async function criarChaveDaCarta(lembrar: boolean, agora = Date.now()): Promise<string> {
  const exp = agora + (lembrar ? VALIDADE_LEMBRADA_MS : VALIDADE_DA_SESSAO_MS);
  /* `r` diz ao browser em que armazenamento a pôr; o servidor não o usa. */
  const corpo = Buffer.from(JSON.stringify({ exp, r: lembrar })).toString("base64url");
  return `${VERSAO}.${corpo}.${await assinar(VERSAO, corpo)}`;
}

export type ChaveAberta = { versao: "c1" | "c2"; exp: number; lembrada: boolean };

/** A chave aberta, se for nossa e estiver no prazo; `null` se não. */
export async function abrirChaveDaCarta(valor: string): Promise<ChaveAberta | null> {
  const partes = valor.split(".");
  if (partes.length !== 3 || (partes[0] !== VERSAO && partes[0] !== VERSAO_ANTIGA)) return null;
  const [versao, corpo, selo] = partes;

  /* A assinatura antes do JSON — pela razão escrita no `lib/painel/sessao.ts`. */
  const esperado = Buffer.from(await assinar(versao, corpo));
  const recebido = Buffer.from(selo);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;

  try {
    const lido = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof lido.exp !== "number" || lido.exp < Date.now()) return null;
    return { versao: versao as "c1" | "c2", exp: lido.exp, lembrada: lido.r === true };
  } catch {
    return null;
  }
}
