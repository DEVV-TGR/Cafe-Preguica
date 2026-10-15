import { z } from "zod";
import { abrirConvite } from "@/lib/newsletter/convite";
import { criarContacto, ErroDaNewsletter } from "@/lib/newsletter/resend";
import { esquecerAviso } from "@/lib/newsletter/aviso-unico";
import { registarConsentimento } from "@/lib/newsletter/consentimento";
import { criarChaveDaCarta } from "@/lib/carta-secreta/chave";
import { ErroDoRedis } from "@/lib/painel/redis";
import { meioEscondido } from "@/lib/painel/utilizadores";
import { lerJson } from "@/lib/pedido";

/*
  O segundo passo: o link do email chegou à página de confirmação, e a pessoa
  carregou no botão. É aqui que o contacto nasce no Resend, e que a carta
  secreta se abre.

  ## Porque é que o link do email não confirma sozinho

  Porque há quem o abra sem ser a pessoa: os filtros de email de empresas (e o
  Outlook, e alguns antivírus) seguem todos os links de uma mensagem para ver se
  são perigosos. Se abrir o link bastasse, esses robôs inscreviam toda a gente a
  quem alguém escrevesse o email no pop-up — e o duplo opt-in deixava de provar
  consentimento nenhum. O link abre uma página; a inscrição é um `POST` que só um
  clique numa pessoa faz.

  Não precisa de limite próprio: sem um convite assinado por nós não se chega ao
  Resend, e repetir um convite válido volta a pôr a mesma pessoa no mesmo sítio.

  ## A prova do consentimento

  Com as novidades, a confirmação fica registada com o texto que a pessoa viu,
  a versão, onde pediu e quando — ver `lib/newsletter/consentimento.ts`. Uma
  reinscrição é um registo novo, com a hora dela: o `created_at` do contacto no
  Resend continua a ser o de há anos, e não prova esta.

  A ordem é contacto primeiro, prova depois. Se a prova falhar, o pedido falha
  e a pessoa tenta outra vez (o link continua válido) — e o contacto, que ficou
  criado, volta a ser confirmado com a prova à segunda. O contrário deixava uma
  prova de uma inscrição que não existia.

  ## Devolve também a chave da carta secreta

  Quem acabou de confirmar está inscrito, e a carta secreta é o extra: a
  página de confirmação guarda a chave e a `/ementa` abre-a sozinha. A chave
  não depende de continuar inscrito (`lib/carta-secreta/chave.ts`). `lembrar` é
  a caixa "lembrar neste aparelho" da página de confirmação; sem ela, a chave é
  de sessão.

  O convite ainda sabe dizer "sem novidades" (`m: false`), mas nenhum ecrã o
  pede hoje: a carta e o convite inscrevem os dois. Fica para o dia em que a
  casa quiser a carta sem newsletter — ver `docs/decisoes-pendentes.md`.
*/

const Pedido = z.object({
  convite: z.string().max(3000),
  lembrar: z.boolean().catch(false),
});

export async function POST(pedido: Request) {
  const corpo = await lerJson(pedido);
  if (!corpo.ok && corpo.estado !== 400) {
    return Response.json({ erro: "invalido" }, { status: corpo.estado });
  }

  const lido = Pedido.safeParse(corpo.ok ? corpo.valor : null);
  if (!lido.success) return Response.json({ erro: "invalido" }, { status: 400 });

  try {
    const convite = await abrirConvite(lido.data.convite);
    if (convite === "invalido") return Response.json({ erro: "invalido" }, { status: 400 });
    if (convite === "expirado") return Response.json({ erro: "expirado" }, { status: 410 });

    if (convite.novidades) {
      await criarContacto(convite.email);
      await registarConsentimento(convite.email, {
        pedidoEm: convite.pedidoEm,
        origem: convite.origem,
        lingua: convite.lingua,
        texto: convite.texto!,
        versao: convite.versao!,
      });
      /* Voltou a inscrever-se: o próximo cancelamento volta a ser avisado. */
      await esquecerAviso(convite.email);
      console.info(`[newsletter] inscrição confirmada — ${meioEscondido(convite.email)}`);
    }

    return Response.json({
      ok: true,
      novidades: convite.novidades,
      chaveDaCarta: await criarChaveDaCarta(lido.data.lembrar),
    });
  } catch (erro) {
    if (erro instanceof ErroDoRedis || erro instanceof ErroDaNewsletter) {
      if (erro instanceof ErroDoRedis) console.error(`[newsletter] ${erro.message}`);
      return Response.json({ erro: "servico" }, { status: 503 });
    }
    throw erro;
  }
}
