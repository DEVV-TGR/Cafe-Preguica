import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { chave } from "@/lib/painel/chaves";
import { routing, type Locale } from "@/i18n/routing";

/*
  O link de "confirma a tua inscrição".

  Leva o email e a língua **dentro**, assinados, e é por isso que não há lista de
  inscrições pendentes em lado nenhum. Até a pessoa carregar no link, o endereço
  não existe para nós: não fica no Redis, não fica no Resend, não fica no
  registo. Quem escreveu o email de outra pessoa no pop-up gastou um envio e mais
  nada — o contacto só nasce quando o dono da caixa confirma.

  É o mesmo selo da sessão do painel (`v.corpo.assinatura`, HMAC-SHA256), com a
  chave própria que o `lib/painel/chaves.ts` deriva para o uso `newsletter`: um
  convite não pode servir de sessão, nem o contrário.

  ## 48 horas

  Chega para quem se inscreve à sexta à noite e só abre o email no domingo. Um
  link que nunca caducasse era uma prova de consentimento que ninguém deu há
  anos, a ser apresentada hoje.
*/

const VERSAO = "n1";
const VALIDADE_MS = 48 * 60 * 60 * 1000;

async function assinar(corpo: string): Promise<string> {
  return createHmac("sha256", await chave("newsletter"))
    .update(`${VERSAO}.${corpo}`)
    .digest("base64url");
}

export async function criarConvite(email: string, lingua: Locale): Promise<string> {
  const corpo = Buffer.from(
    JSON.stringify({ e: email, l: lingua, exp: Date.now() + VALIDADE_MS }),
  ).toString("base64url");

  return `${VERSAO}.${corpo}.${await assinar(corpo)}`;
}

export type Convite = { email: string; lingua: Locale };

/** O convite aberto, ou `"invalido"` / `"expirado"` — são frases diferentes no ecrã. */
export async function abrirConvite(valor: string): Promise<Convite | "invalido" | "expirado"> {
  const partes = valor.split(".");
  if (partes.length !== 3 || partes[0] !== VERSAO) return "invalido";
  const [, corpo, selo] = partes;

  /* A assinatura antes do JSON — pela razão escrita no `lib/painel/sessao.ts`. */
  const esperado = Buffer.from(await assinar(corpo));
  const recebido = Buffer.from(selo);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) {
    return "invalido";
  }

  try {
    const lido = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
    if (typeof lido.e !== "string" || typeof lido.exp !== "number") return "invalido";
    if (lido.exp < Date.now()) return "expirado";

    const lingua = routing.locales.find((l) => l === lido.l) ?? routing.defaultLocale;
    return { email: lido.e, lingua };
  } catch {
    return "invalido";
  }
}
