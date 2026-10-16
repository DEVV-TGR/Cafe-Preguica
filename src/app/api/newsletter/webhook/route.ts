import { z } from "zod";
import { lerTexto } from "@/lib/pedido";
import { assinaturaValida } from "@/lib/newsletter/webhook";
import { avisarCancelamento } from "@/lib/newsletter/cancelamento";
import { jaRetirou, registarRetirada } from "@/lib/newsletter/consentimento";
import { ErroDaNewsletter, segmentoDaNewsletter } from "@/lib/newsletter/resend";
import { ErroDoRedis } from "@/lib/painel/redis";
import { meioEscondido } from "@/lib/painel/utilizadores";

/*
  O Resend avisa aqui quando um contacto muda — e é assim que se sabe que
  alguém cancelou a inscrição pelo link de um envio, que é uma página do
  Resend e não nossa. Nesse caso manda-se o email de cancelamento
  (`lib/newsletter/cancelamento.ts`).

  ## Montar

  No Resend (a conta da newsletter): Webhooks → Add → este endereço, com o
  evento `contact.updated`. O segredo que lá aparece (`whsec_…`) vai para a
  Vercel como `RESEND_NEWSLETTER_WEBHOOK_SECRET`. Ver `docs/NEWSLETTER.md`.

  Sem o segredo, responde 503 e não faz nada — cancelar pelo painel avisa na
  mesma, porque não passa por aqui. **Mas sem webhook a retirada feita pelo
  link do email não fica na prova do consentimento** (o Resend deixa de enviar
  na mesma, e o painel mostra "cancelou"): configurá-lo é uma pendência de
  lançamento, em `docs/decisoes-pendentes.md`.

  ## A retirada fica na prova

  Revisão legal de 2026-10-15. Um cancelamento pelo link do email regista-se
  em `lib/newsletter/consentimento.ts` — é a partir daí que a prova passa a ter
  prazo. Se a prova já tiver a retirada (o cancelamento veio do painel, que a
  regista antes de avisar, ou é uma repetição do mesmo evento), não se faz
  nada: o aviso já saiu ou está a sair.

  ## As respostas

  - **401** se a assinatura não bater: quem não tem o segredo não manda emails
    em nome da casa.
  - **200** a tudo o que é nosso, mesmo ao que se ignora (outros eventos, quem
    não cancelou, outros segmentos): um erro faria o Resend repetir.
  - **503** se o envio ou o armazenamento falharem: aí sim, que repita — o
    aviso marca-se uma vez só, e a repetição não manda dois.
*/

/* Um `contact.updated` tem umas centenas de bytes. */
const TETO = 16 * 1024;

const Evento = z.object({
  type: z.string(),
  data: z
    .object({
      email: z.string(),
      unsubscribed: z.boolean(),
      segment_ids: z.array(z.string()).optional(),
    })
    .partial()
    .optional(),
});

export async function POST(pedido: Request) {
  const segredo = process.env.RESEND_NEWSLETTER_WEBHOOK_SECRET?.trim();
  if (!segredo) return new Response("Webhook por configurar.", { status: 503 });

  const corpo = await lerTexto(pedido, TETO);
  if (!corpo.ok) return new Response(null, { status: corpo.estado });

  const valida = assinaturaValida({
    segredo,
    id: pedido.headers.get("svix-id"),
    instante: pedido.headers.get("svix-timestamp"),
    assinaturas: pedido.headers.get("svix-signature"),
    corpo: corpo.valor,
  });
  if (!valida) return new Response(null, { status: 401 });

  let evento: z.infer<typeof Evento>;
  try {
    evento = Evento.parse(JSON.parse(corpo.valor));
  } catch {
    return new Response(null, { status: 400 });
  }

  const { email, unsubscribed, segment_ids: segmentos } = evento.data ?? {};
  if (evento.type !== "contact.updated" || !email || unsubscribed !== true) {
    return new Response(null, { status: 200 });
  }

  try {
    if (segmentos && !segmentos.includes(segmentoDaNewsletter())) {
      return new Response(null, { status: 200 });
    }
    if (await jaRetirou(email)) return new Response(null, { status: 200 });
    /* Avisar primeiro e registar depois: se o aviso falhar, o Resend repete, e
       a repetição só passa a primeira linha se a retirada ainda não estiver lá. */
    if (await avisarCancelamento(email)) {
      console.info(`[newsletter] cancelou, e foi avisado — ${meioEscondido(email)}`);
    }
    await registarRetirada(email, "link-no-email");
    return new Response(null, { status: 200 });
  } catch (erro) {
    if (erro instanceof ErroDaNewsletter || erro instanceof ErroDoRedis) {
      return new Response(null, { status: 503 });
    }
    throw erro;
  }
}
