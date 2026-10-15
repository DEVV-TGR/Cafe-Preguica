import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { URL_SITE, caminhoLocalizado } from "@/lib/site";
import { criarConvite } from "@/lib/newsletter/convite";
import { podeConvidar } from "@/lib/newsletter/limites";
import { enviarConfirmacao, estaInscrito, ErroDaNewsletter } from "@/lib/newsletter/resend";
import {
  CAMINHO_DO_ESTUDIO,
  CAMINHO_DO_LOGO,
  emailEmHtml,
  emailEmTexto,
  type Extras,
  type Moldura,
} from "@/lib/newsletter/corpo";
import { rodapeDaCasa } from "@/lib/newsletter/casa";
import { ErroDoRedis } from "@/lib/painel/redis";
import { lerJson } from "@/lib/pedido";
import { EsquemaEmail } from "@/lib/email";

/*
  O pop-up e a carta secreta escrevem aqui: pedem o email de confirmação, e
  mais nada.

  ## Duas origens

  | `origem` | o email diz | ao confirmar |
  |---|---|---|
  | `convite` (o pop-up) | "confirme a inscrição" | inscreve, com prova do consentimento |
  | `carta` | "confirme as novidades e abra a carta" | inscreve, com prova, e abre a carta |

  A origem fica na prova do consentimento, com o texto que estava ao lado do
  botão em cada sítio.

  ## O que fica de um pedido que ninguém confirma

  O email vai dentro do link assinado (`lib/newsletter/convite.ts`) e só vira
  contacto no Resend quando o dono da caixa carregar nele. Se ninguém carregar,
  ficam duas coisas: um contador com o resumo do endereço no Redis, que se
  apaga sozinho em 24 horas, e o registo do envio no Resend, pelo prazo de
  retenção da conta (ver `docs/decisoes-pendentes.md`).

  ## As respostas

  | estado | quando | o pop-up diz |
  |---|---|---|
  | 200 | pedido aceite (ou apanhado pelo isco, ver abaixo) | "vê o teu email" |
  | 200 `jaInscrito` | só no convite: o email já está na lista, e não se envia nada | "já está inscrito" |
  | 400 | o email não é um email | "esse email não parece completo" |
  | 429 | limites de `lib/newsletter/limites.ts` | "tenta daqui a um bocado" |
  | 503 | Resend ou Redis em baixo, ou sem configuração | "não conseguimos enviar agora" |
*/

const Pedido = z.object({
  email: EsquemaEmail,
  lingua: z.enum(routing.locales).catch(routing.defaultLocale),
  origem: z.enum(["convite", "carta"]).catch("convite"),
  /* O isco: um campo escondido que uma pessoa nunca vê nem preenche, e que um
     robô de formulários preenche quase sempre. */
  sitio: z.string().optional(),
});

/*
  O endereço do link que vai no email.

  | onde | base do link |
  |---|---|
  | produção | `URL_SITE` |
  | pré-visualização da Vercel (um PR) | o endereço desse deploy (`VERCEL_URL`) |
  | `npm run dev` | a origem do pedido |

  Nunca o `Host` do pedido fora do `dev`: um `Host` forjado não pode pôr o
  domínio de outra pessoa dentro de um email que sai em nome da casa. As duas
  variáveis da Vercel são postas pela plataforma, não por quem faz o pedido.

  A pré-visualização tem linha própria porque lá o `NODE_ENV` também é
  `production`: sem ela, o link de um teste num PR ia dar à página de
  confirmação do site verdadeiro — que antes do merge ainda não existe.

  O convite vai no **fragmento** (`#`), e não na query: o fragmento nunca sai do
  browser, e por isso o convite não fica nos registos da Vercel nem no
  `Referer` de ninguém. A página de confirmação continua estática.
*/
function baseDoLink(pedido: Request): string {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NODE_ENV === "production") return URL_SITE;
  return new URL(pedido.url).origin;
}

function linkDeConfirmacao(pedido: Request, lingua: (typeof routing.locales)[number], convite: string) {
  return `${baseDoLink(pedido)}${caminhoLocalizado("/newsletter/confirmar", lingua)}#${convite}`;
}

export async function POST(pedido: Request) {
  const corpo = await lerJson(pedido);
  if (!corpo.ok) {
    if (corpo.estado === 415) return Response.json({ erro: "formato" }, { status: 415 });
    if (corpo.estado === 413) return Response.json({ erro: "tamanho" }, { status: 413 });
  }

  const lido = Pedido.safeParse(corpo.ok ? corpo.valor : null);
  if (!lido.success) return Response.json({ erro: "email" }, { status: 400 });

  const { email, lingua, sitio, origem } = lido.data;

  /* Responde como se tivesse corrido bem: um robô que recebe um erro aprende a
     não preencher o isco. */
  if (sitio) return Response.json({ ok: true });

  try {
    if (!(await podeConvidar(email))) {
      return Response.json({ erro: "limite" }, { status: 429 });
    }

    /*
      Quem já está inscrito não recebe outro email de confirmação: não há nada
      para confirmar, e um segundo email a quem já recebe a newsletter parece
      spam.

      Isto diz a quem escreve o email se ele está na lista — é o preço de não
      mandar emails inúteis, e é o mesmo da carta secreta. Quem quisesse usar o
      convite para testar uma lista de endereços esbarra nos limites de cima
      (5 por hora por ligação), que contam antes desta pergunta.
    */
    /*
      Na carta não se pergunta: a secção só oferece a inscrição depois de a
      `/api/carta-secreta` ter dito que o email não está na lista.
    */
    if (origem === "convite" && (await estaInscrito(email))) {
      return Response.json({ ok: true, jaInscrito: true });
    }

    /* O email tem duas versões — ver a tabela lá em cima. A assinatura é
       sempre a mesma, e vive com a primeira. */
    const t = await getTranslations({
      locale: lingua,
      namespace: origem === "convite" ? "newsletter.email" : "newsletter.emailCarta",
    });
    const assinatura = await getTranslations({ locale: lingua, namespace: "newsletter.email.assinatura" });

    /*
      O texto que estava ao lado do botão, para a prova do consentimento. Lido
      aqui, das mesmas mensagens que o browser mostrou, e levado assinado no
      link: ver `lib/newsletter/convite.ts`.
    */
    const textoDoConsentimento = (await getTranslations({ locale: lingua }))(
      origem === "convite" ? "newsletter.convite.consentimento" : "ementa.secreta.consentimento",
    );

    const link = linkDeConfirmacao(
      pedido,
      lingua,
      await criarConvite({ email, lingua, origem, novidades: true, texto: textoDoConsentimento }),
    );

    /* A mesma moldura da newsletter, sem a linha de cancelar: quem recebe isto
       ainda não está inscrito. As imagens vêm do site em produção, como lá. */
    const moldura: Moldura = {
      logo: `${URL_SITE}${CAMINHO_DO_LOGO}`,
      estudio: `${URL_SITE}${CAMINHO_DO_ESTUDIO}`,
      site: URL_SITE,
      remetente: rodapeDaCasa(),
      cancelar: null,
      lingua: lingua === "en" ? "en" : "pt-PT",
      assinatura: {
        antes: assinatura("antes"),
        enfase: assinatura("enfase"),
        depois: assinatura("depois"),
      },
    };
    const extras: Extras = {
      titulo: t("titulo"),
      botao: { texto: t("botao"), endereco: link },
      nota: t("nota"),
    };

    await enviarConfirmacao({
      para: email,
      link,
      assunto: t("assunto"),
      html: emailEmHtml(t("assunto"), t("texto"), moldura, extras),
      texto: emailEmTexto(t("texto"), moldura, extras),
    });
  } catch (erro) {
    if (erro instanceof ErroDoRedis || erro instanceof ErroDaNewsletter) {
      if (erro instanceof ErroDoRedis) console.error(`[newsletter] ${erro.message}`);
      return Response.json({ erro: "servico" }, { status: 503 });
    }
    throw erro;
  }

  return Response.json({ ok: true });
}
