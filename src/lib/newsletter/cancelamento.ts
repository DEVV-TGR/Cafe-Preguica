import "server-only";
import { URL_SITE } from "@/lib/site";
import { umaVezPorCancelamento } from "./aviso-unico";
import { rodapeDaCasa } from "./casa";
import {
  CAMINHO_DO_ESTUDIO,
  CAMINHO_DO_LOGO,
  emailEmHtml,
  emailEmTexto,
  type Extras,
  type Moldura,
} from "./corpo";
import { enviarUmEmail } from "./resend";

/*
  O email que diz a uma pessoa que a inscrição dela foi cancelada.

  Pedido do Tomás (2026-10-11): sempre que há um cancelamento — pelo botão do
  painel, ou pela própria pessoa no link de cada envio (que chega pelo webhook,
  `app/api/newsletter/webhook`) —, a pessoa recebe um email a dizê-lo, com a
  mesma cara da newsletter e da confirmação.

  ## Uma vez só por cancelamento

  Cancelar no painel avisa, e o Resend, ao ver o contacto mudar, chama o
  webhook — que avisava outra vez. Por isso o aviso marca-se no Redis antes de
  sair (`SET NX`): o segundo a chegar vê a marca e não manda nada. Quem se
  volta a inscrever apaga a marca (`esquecerAviso`, na confirmação), e um
  cancelamento seguinte volta a ser avisado.

  Se o envio falhar, a marca sai: o webhook tenta outra vez, e um aviso que não
  saiu não pode impedir o próximo. A marca vive em `aviso-unico.ts`.
*/

const ASSUNTO = "Cancelámos a sua inscrição na newsletter do Café Preguiça";

/* Em português, e na forma da newsletter e da confirmação (o "você" do
   site): não se sabe em que língua a pessoa se inscreveu, e a newsletter é
   só em português. */
const TEXTO = [
  "Olá,",
  "A sua inscrição na newsletter do Café Preguiça foi cancelada. A partir de agora deixa de receber as novidades da casa, e a carta secreta deixa de abrir com este endereço.",
  "Se foi engano, pode voltar a inscrever-se quando quiser, no site.",
].join("\n\n");

export function emailDoCancelamento(): { assunto: string; html: string; texto: string } {
  const moldura: Moldura = {
    logo: `${URL_SITE}${CAMINHO_DO_LOGO}`,
    estudio: `${URL_SITE}${CAMINHO_DO_ESTUDIO}`,
    site: URL_SITE,
    remetente: rodapeDaCasa(),
    /* Já não está inscrito: "recebe isto porque se inscreveu" seria falso. */
    cancelar: null,
  };
  const extras: Extras = {
    titulo: "A sua inscrição foi cancelada",
    botao: { texto: "Ir ao site da casa", endereco: URL_SITE },
    nota: "Não precisa de fazer mais nada. Este é o último email da newsletter que lhe enviamos.",
    preambulo: "Deixa de receber as novidades do Café Preguiça.",
  };
  return {
    assunto: ASSUNTO,
    html: emailEmHtml(ASSUNTO, TEXTO, moldura, extras),
    texto: emailEmTexto(TEXTO, moldura, extras),
  };
}

/** Manda o aviso, se ainda não tiver sido mandado por este cancelamento. Diz se mandou. */
export async function avisarCancelamento(email: string): Promise<boolean> {
  return umaVezPorCancelamento(email, () => enviarUmEmail({ para: email, ...emailDoCancelamento() }));
}
