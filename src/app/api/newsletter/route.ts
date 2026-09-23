import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { URL_SITE, caminhoLocalizado } from "@/lib/site";
import { criarConvite } from "@/lib/newsletter/convite";
import { podeConvidar } from "@/lib/newsletter/limites";
import { enviarConfirmacao, estaInscrito, ErroDaNewsletter } from "@/lib/newsletter/resend";
import { ErroDoRedis } from "@/lib/painel/redis";

/*
  O pop-up escreve aqui: pede o email de confirmação, e mais nada.

  Uma rota e não uma server action porque as páginas públicas são estáticas e o
  pop-up vive no layout de todas elas — uma action obrigava cada página a saber
  dela. Fica debaixo de `/api`, que o `proxy.ts` deixa passar sem o negociador de
  idioma, e com a CSP pública do `next.config.ts` (o `connect-src 'self'` chega:
  o browser só fala com o próprio site).

  ## Nada fica guardado aqui

  O email vai dentro do link assinado (`lib/newsletter/convite.ts`) e só vira
  contacto no Resend quando o dono da caixa carregar nele. Se ninguém carregar,
  o que sobra é um contador em hash no Redis, que se apaga sozinho em 24 horas.

  ## As respostas

  | estado | quando | o pop-up diz |
  |---|---|---|
  | 200 | pedido aceite (ou apanhado pelo isco, ver abaixo) | "vê o teu email" |
  | 200 `jaInscrito` | o email já está na lista, e não se envia nada | "já está inscrito" |
  | 400 | o email não é um email | "esse email não parece completo" |
  | 429 | limites de `lib/newsletter/limites.ts` | "tenta daqui a um bocado" |
  | 503 | Resend ou Redis em baixo, ou sem configuração | "não conseguimos enviar agora" |
*/

const Pedido = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  lingua: z.enum(routing.locales).catch(routing.defaultLocale),
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
  if (!pedido.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ erro: "formato" }, { status: 415 });
  }

  const lido = Pedido.safeParse(await pedido.json().catch(() => null));
  if (!lido.success) return Response.json({ erro: "email" }, { status: 400 });

  const { email, lingua, sitio } = lido.data;

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
    if (await estaInscrito(email)) {
      return Response.json({ ok: true, jaInscrito: true });
    }

    const t = await getTranslations({ locale: lingua, namespace: "newsletter.email" });
    const link = linkDeConfirmacao(pedido, lingua, await criarConvite(email, lingua));

    await enviarConfirmacao({
      para: email,
      link,
      assunto: t("assunto"),
      texto: t("texto", { link }),
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
