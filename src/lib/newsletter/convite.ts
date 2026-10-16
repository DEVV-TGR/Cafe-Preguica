import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { chave } from "@/lib/painel/chaves";
import { routing, type Locale } from "@/i18n/routing";

/*
  O link de "confirma a tua inscrição" — e o de "abre a carta secreta".

  Leva o email e a língua **dentro**, assinados, e é por isso que não há lista de
  inscrições pendentes do nosso lado. Até a pessoa carregar no link, o contacto
  não existe: não há linha nossa com o endereço à espera. **Mas o endereço não
  fica em lado nenhum, não**: o email de confirmação sai pelo Resend, que guarda
  o registo desse envio (destinatário, assunto, estado da entrega) pelo prazo
  da conta; e o limite de pedidos guarda um resumo do endereço durante 24 horas
  (`lib/newsletter/limites.ts`). A frase "não fica guardado" esteve no email e
  neste comentário até à revisão legal de 2026-10-15, e não era verdade.

  ## O que vai dentro (versão `n2`)

  | campo | o quê |
  |---|---|
  | `e`, `l` | email e língua |
  | `o` | onde se pediu: o convite (`convite`) ou a carta secreta (`carta`) |
  | `m` | se pediu as novidades por email — no convite é sempre sim; na carta é a caixa que se marca ou não |
  | `p` | quando pediu |
  | `t`, `v` | o texto de consentimento que estava ao lado do botão, e a versão dele (só com `m`) |
  | `exp` | até quando o link vale |

  O texto viaja assinado porque é o que fica na prova do consentimento
  (`lib/newsletter/consentimento.ts`): tem de ser o que a pessoa viu quando
  pediu, e não o que estiver no site quando ela confirmar — uma publicação a
  meio das 48 horas mudava-o.

  Os links `n1`, de antes disto, já não abrem: não traziam o texto, e uma prova
  sem texto não prova o que a CNPD pede. Duravam 48 horas, e a página manda
  quem tiver um pedir outro.

  É o mesmo selo da sessão do painel (`v.corpo.assinatura`, HMAC-SHA256), com a
  chave própria que o `lib/painel/chaves.ts` deriva para o uso `newsletter`: um
  convite não pode servir de sessão, nem o contrário.

  ## 48 horas

  Chega para quem se inscreve à sexta à noite e só abre o email no domingo. Um
  link que nunca caducasse era uma prova de consentimento que ninguém deu há
  anos, a ser apresentada hoje.
*/

const VERSAO = "n2";

/*
  A versão do texto de consentimento. Muda-se **sempre que mudar** a frase
  `consentimento` do convite ou da carta secreta, ou o que a política de
  privacidade diz sobre a newsletter — é o que permite saber, anos depois, que
  versão uma pessoa leu. O texto vai também, tal e qual, dentro da prova.
*/
export const VERSAO_DO_TEXTO = "2026-10-15";
const VALIDADE_MS = 48 * 60 * 60 * 1000;

async function assinar(corpo: string): Promise<string> {
  return createHmac("sha256", await chave("newsletter"))
    .update(`${VERSAO}.${corpo}`)
    .digest("base64url");
}

export type Origem = "convite" | "carta";

export type Convite = {
  email: string;
  lingua: Locale;
  origem: Origem;
  /** Pediu as novidades por email. */
  novidades: boolean;
  pedidoEm: number;
  /** O texto de consentimento e a versão dele; `null` sem `novidades`. */
  texto: string | null;
  versao: string | null;
};

export async function criarConvite(
  c: Omit<Convite, "pedidoEm" | "versao">,
  agora = Date.now(),
): Promise<string> {
  const corpo = Buffer.from(
    JSON.stringify({
      e: c.email,
      l: c.lingua,
      o: c.origem,
      m: c.novidades,
      p: agora,
      ...(c.novidades ? { t: c.texto, v: VERSAO_DO_TEXTO } : {}),
      exp: agora + VALIDADE_MS,
    }),
  ).toString("base64url");

  return `${VERSAO}.${corpo}.${await assinar(corpo)}`;
}

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
    if (lido.o !== "convite" && lido.o !== "carta") return "invalido";
    if (typeof lido.m !== "boolean" || typeof lido.p !== "number") return "invalido";
    /* Novidades sem o texto que as acompanhou não se aceitam: era um
       consentimento sem prova. */
    if (lido.m && (typeof lido.t !== "string" || !lido.t || typeof lido.v !== "string")) {
      return "invalido";
    }
    if (lido.exp < Date.now()) return "expirado";

    const lingua = routing.locales.find((l) => l === lido.l) ?? routing.defaultLocale;
    return {
      email: lido.e,
      lingua,
      origem: lido.o,
      novidades: lido.m,
      pedidoEm: lido.p,
      texto: lido.m ? (lido.t as string) : null,
      versao: lido.m ? (lido.v as string) : null,
    };
  } catch {
    return "invalido";
  }
}
