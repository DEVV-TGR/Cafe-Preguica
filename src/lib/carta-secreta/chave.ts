import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { chave } from "@/lib/painel/chaves";

/*
  A chave da carta secreta que fica no telemóvel.

  É o email, assinado, com prazo — o mesmo selo do `lib/newsletter/convite.ts`,
  com a chave própria que o `lib/painel/chaves.ts` deriva para o uso `carta`.
  Assinado para ninguém a fabricar com o email de outra pessoa.

  **Não é um passe.** Cada vez que a secção abre, o servidor tira o email de
  dentro e volta a perguntar ao Resend se continua inscrito: quem cancelou a
  newsletter perde a carta na visita seguinte, com chave ou sem ela. O prazo de
  180 dias é só para uma chave esquecida num telemóvel velho não durar para
  sempre.
*/

const VERSAO = "c1";
const VALIDADE_MS = 180 * 24 * 60 * 60 * 1000;

async function assinar(corpo: string): Promise<string> {
  return createHmac("sha256", await chave("carta")).update(`${VERSAO}.${corpo}`).digest("base64url");
}

export async function criarChaveDaCarta(email: string): Promise<string> {
  const corpo = Buffer.from(JSON.stringify({ e: email, exp: Date.now() + VALIDADE_MS })).toString(
    "base64url",
  );
  return `${VERSAO}.${corpo}.${await assinar(corpo)}`;
}

/** O email de dentro da chave, se ela for nossa e estiver no prazo. */
export async function abrirChaveDaCarta(valor: string): Promise<string | null> {
  const partes = valor.split(".");
  if (partes.length !== 3 || partes[0] !== VERSAO) return null;
  const [, corpo, selo] = partes;

  /* A assinatura antes do JSON — pela razão escrita no `lib/painel/sessao.ts`. */
  const esperado = Buffer.from(await assinar(corpo));
  const recebido = Buffer.from(selo);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;

  try {
    const lido = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof lido.e !== "string" || typeof lido.exp !== "number" || lido.exp < Date.now()) {
      return null;
    }
    return lido.e;
  } catch {
    return null;
  }
}
