"use server";

import { createHash } from "node:crypto";
import { exigirSessaoNaAccao } from "@/lib/painel/porta";
import { somar, ErroDoRedis } from "@/lib/painel/redis";
import { meioEscondido } from "@/lib/painel/utilizadores";
import { URL_SITE } from "@/lib/site";
import { rodapeDaCasa, responderPara } from "@/lib/newsletter/casa";
import {
  CAMINHO_DO_LOGO,
  emailEmHtml,
  emailEmTexto,
  MARCA_DO_CANCELAMENTO,
  paragrafos,
  type Moldura,
} from "@/lib/newsletter/corpo";
import { enviarATodos, enviarTeste, ErroDaNewsletter } from "@/lib/newsletter/resend";

/*
  Enviar um teste, e enviar a toda a gente.

  O ecrã só deixa carregar no segundo depois de o primeiro ter corrido com o
  mesmo assunto e o mesmo texto. Essa regra vive no browser e é conforto, não
  segurança: quem cá chega já entrou no painel, e o que importa proteger aqui é
  o Rafael de si próprio — mandar a 300 pessoas um email com uma gralha no
  assunto é coisa que não se desfaz.
*/

export type EstadoDaNewsletter =
  | { tipo: "parado" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "teste-enviado"; para: string; assunto: string; texto: string }
  | { tipo: "enviado"; assunto: string };

const MAX_ASSUNTO = 150;
const MAX_TEXTO = 20_000;

/* O logótipo por endereço absoluto, do site em produção: é de lá que o
   programa de email de quem recebe o vai buscar. */
function moldura(cancelar: string): Moldura {
  return { logo: `${URL_SITE}${CAMINHO_DO_LOGO}`, remetente: rodapeDaCasa(), cancelar };
}

function lerMensagem(dados: FormData): { assunto: string; texto: string } | string {
  const assunto = String(dados.get("assunto") ?? "").trim();
  const texto = String(dados.get("texto") ?? "").trim();

  if (!assunto) return "Falta o assunto.";
  if (assunto.length > MAX_ASSUNTO) return `O assunto tem de ter até ${MAX_ASSUNTO} caracteres.`;
  if (paragrafos(texto).length === 0) return "Falta o texto.";
  if (texto.length > MAX_TEXTO) return "O texto é demasiado comprido para um email.";

  return { assunto, texto };
}

function erroParaOEcra(erro: unknown): EstadoDaNewsletter {
  if (erro instanceof ErroDaNewsletter) return { tipo: "erro", mensagem: erro.paraOEcra };
  if (erro instanceof ErroDoRedis) return { tipo: "erro", mensagem: erro.paraOEcra };
  throw erro;
}

export async function enviarTesteDaNewsletter(
  _estado: EstadoDaNewsletter,
  dados: FormData,
): Promise<EstadoDaNewsletter> {
  const { email } = await exigirSessaoNaAccao();

  const mensagem = lerMensagem(dados);
  if (typeof mensagem === "string") return { tipo: "erro", mensagem };
  const { assunto, texto } = mensagem;

  /* No teste não há pessoa a quem cancelar a inscrição: o link aponta ao site. */
  try {
    await enviarTeste(email, {
      assunto,
      html: emailEmHtml(assunto, texto, moldura(URL_SITE)),
      texto: emailEmTexto(texto, moldura(URL_SITE)),
      responderPara: responderPara(),
    });
  } catch (erro) {
    return erroParaOEcra(erro);
  }

  return { tipo: "teste-enviado", para: email, assunto, texto };
}

/*
  A trava do duplo envio.

  O botão fica desligado enquanto a acção corre, mas isso é o browser. Dois
  separadores, um toque duplo num telemóvel lento, ou um "reenviar formulário" do
  browser mandavam a mesma newsletter duas vezes às mesmas pessoas. O `INCR` é
  atómico, e a chave é o assunto e o texto: a mesma mensagem não sai duas vezes
  em 15 minutos, e uma mensagem diferente sai à vontade.
*/
const TRAVA_S = 15 * 60;

export async function enviarNewsletter(
  _estado: EstadoDaNewsletter,
  dados: FormData,
): Promise<EstadoDaNewsletter> {
  const { email } = await exigirSessaoNaAccao();

  const mensagem = lerMensagem(dados);
  if (typeof mensagem === "string") return { tipo: "erro", mensagem };
  const { assunto, texto } = mensagem;

  const impressao = createHash("sha256").update(`${assunto}\n${texto}`).digest("hex");

  try {
    if ((await somar(`newsletter:envio:${impressao.slice(0, 32)}`, TRAVA_S)) > 1) {
      return {
        tipo: "erro",
        mensagem:
          "Esta newsletter já foi enviada há menos de 15 minutos. Não voltou a sair, para ninguém a receber duas vezes.",
      };
    }

    await enviarATodos({
      assunto,
      html: emailEmHtml(assunto, texto, moldura(MARCA_DO_CANCELAMENTO)),
      texto: emailEmTexto(texto, moldura(MARCA_DO_CANCELAMENTO)),
      responderPara: responderPara(),
    });
  } catch (erro) {
    return erroParaOEcra(erro);
  }

  console.info(`[newsletter] enviada "${assunto}" — por ${meioEscondido(email)}`);
  return { tipo: "enviado", assunto };
}
