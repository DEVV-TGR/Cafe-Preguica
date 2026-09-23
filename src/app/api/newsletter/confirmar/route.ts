import { z } from "zod";
import { abrirConvite } from "@/lib/newsletter/convite";
import { criarContacto, ErroDaNewsletter } from "@/lib/newsletter/resend";
import { ErroDoRedis } from "@/lib/painel/redis";
import { meioEscondido } from "@/lib/painel/utilizadores";

/*
  O segundo passo: o link do email chegou à página de confirmação, e a pessoa
  carregou em "Confirmar". É aqui que o contacto nasce no Resend.

  ## Porque é que o link do email não confirma sozinho

  Porque há quem o abra sem ser a pessoa: os filtros de email de empresas (e o
  Outlook, e alguns antivírus) seguem todos os links de uma mensagem para ver se
  são perigosos. Se abrir o link bastasse, esses robôs inscreviam toda a gente a
  quem alguém escrevesse o email no pop-up — e o duplo opt-in deixava de provar
  consentimento nenhum. O link abre uma página; a inscrição é um `POST` que só um
  clique numa pessoa faz.

  Não precisa de limite próprio: sem um convite assinado por nós não se chega ao
  Resend, e repetir um convite válido volta a pôr a mesma pessoa no mesmo sítio.
*/

const Pedido = z.object({ convite: z.string().max(2000) });

export async function POST(pedido: Request) {
  const lido = Pedido.safeParse(await pedido.json().catch(() => null));
  if (!lido.success) return Response.json({ erro: "invalido" }, { status: 400 });

  try {
    const convite = await abrirConvite(lido.data.convite);
    if (convite === "invalido") return Response.json({ erro: "invalido" }, { status: 400 });
    if (convite === "expirado") return Response.json({ erro: "expirado" }, { status: 410 });

    await criarContacto(convite.email);
    console.info(`[newsletter] inscrição confirmada — ${meioEscondido(convite.email)}`);
  } catch (erro) {
    if (erro instanceof ErroDoRedis || erro instanceof ErroDaNewsletter) {
      if (erro instanceof ErroDoRedis) console.error(`[newsletter] ${erro.message}`);
      return Response.json({ erro: "servico" }, { status: 503 });
    }
    throw erro;
  }

  return Response.json({ ok: true });
}
