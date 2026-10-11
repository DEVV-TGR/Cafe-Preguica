"use server";

import { createHash } from "node:crypto";
import { exigirSessaoNaAccao } from "@/lib/painel/porta";
import { somar, guardar, ler, apagar, ErroDoRedis } from "@/lib/painel/redis";
import { noSiteOficial } from "@/lib/ambiente";
import { meioEscondido } from "@/lib/painel/utilizadores";
import { URL_SITE } from "@/lib/site";
import { rodapeDaCasa, responderPara } from "@/lib/newsletter/casa";
import {
  CAMINHO_DO_ESTUDIO,
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
  mesmo assunto e o mesmo texto — e **o servidor também**. Já foi só o ecrã, com
  o argumento de que quem cá chega entrou no painel; mas um pedido feito à mão,
  um separador antigo ou um ecrã com um defeito chegavam à acção de envio sem
  teste nenhum, e mandar a 300 pessoas um email com uma gralha no assunto é
  coisa que não se desfaz. O teste deixa no Redis a impressão do assunto e do
  texto (`TESTADO_S`), e o envio a todos só sai se a encontrar.

  E só sai **do site oficial**. Uma pré-visualização de um PR tem as mesmas
  variáveis e o mesmo segmento do Resend, e o "Enviar a todos" de lá chegava aos
  inscritos de verdade. Ver `lib/ambiente.ts`. O teste para o próprio continua a
  funcionar em todo o lado — é para isso que serve experimentar.
*/

export type EstadoDaNewsletter =
  | { tipo: "parado" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "teste-enviado"; para: string; assunto: string; texto: string }
  | { tipo: "enviado"; assunto: string };

const MAX_ASSUNTO = 150;
const MAX_TEXTO = 20_000;

/* Quanto tempo vale um teste: um dia chega para o abrir no telemóvel com
   calma, e não deixa um teste da semana passada abrir a porta hoje. */
const TESTADO_S = 24 * 60 * 60;

/* O assunto e o texto, resumidos. É o que liga um envio ao seu teste e o que
   identifica a mesma newsletter na trava do duplo envio. */
function impressaoDe(assunto: string, texto: string): string {
  return createHash("sha256").update(`${assunto}\n${texto}`).digest("hex").slice(0, 32);
}

/* O logótipo por endereço absoluto, do site em produção: é de lá que o
   programa de email de quem recebe o vai buscar. */
function moldura(cancelar: string): Moldura {
  return {
    logo: `${URL_SITE}${CAMINHO_DO_LOGO}`,
    estudio: `${URL_SITE}${CAMINHO_DO_ESTUDIO}`,
    site: URL_SITE,
    remetente: rodapeDaCasa(), cancelar };
}

/*
  As mudanças de linha chegam como `\r\n`: é assim que um `<textarea>` as envia
  num formulário (regra do HTML), mas no browser o mesmo texto tem `\n`. Sem as
  igualar aqui, o texto que o teste devolve nunca era igual ao que está no
  ecrã, e o "Enviar a todos" não acendia para nenhuma newsletter com mais de um
  parágrafo — ou seja, para nenhuma.
*/
function lerMensagem(dados: FormData): { assunto: string; texto: string } | string {
  const assunto = String(dados.get("assunto") ?? "").trim();
  const texto = String(dados.get("texto") ?? "").replace(/\r\n?/g, "\n").trim();

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
    /* Só depois de o teste ter saído: um teste que falhou não abre o envio. */
    await guardar(`newsletter:testado:${impressaoDe(assunto, texto)}`, "1", TESTADO_S);
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

  if (!noSiteOficial()) {
    return {
      tipo: "erro",
      mensagem:
        "Esta é uma versão de ensaio do site: daqui só sai o teste. O envio a todos só funciona no site oficial.",
    };
  }

  const impressao = impressaoDe(assunto, texto);
  const testado = `newsletter:testado:${impressao}`;
  const trava = `newsletter:envio:${impressao}`;

  try {
    if (!(await ler(testado))) {
      return {
        tipo: "erro",
        mensagem:
          "Antes de enviar a todos, envia um teste com este assunto e este texto, e confere-o.",
      };
    }

    if ((await somar(trava, TRAVA_S)) > 1) {
      return {
        tipo: "erro",
        mensagem:
          "Esta newsletter já foi enviada há menos de 15 minutos. Não voltou a sair, para ninguém a receber duas vezes.",
      };
    }

    try {
      await enviarATodos({
        assunto,
        html: emailEmHtml(assunto, texto, moldura(MARCA_DO_CANCELAMENTO)),
        texto: emailEmTexto(texto, moldura(MARCA_DO_CANCELAMENTO)),
        responderPara: responderPara(),
      });
    } catch (erro) {
      /* Não saiu, por isso a trava sai também. Ficando, a tentativa seguinte —
         depois de o serviço voltar — dizia "já foi enviada", que era mentira. */
      await apagar(trava).catch(() => {});
      throw erro;
    }

    /* Saiu: o teste fica gasto. Voltar a mandar o mesmo texto pede outro. */
    await apagar(testado).catch(() => {});
  } catch (erro) {
    return erroParaOEcra(erro);
  }

  console.info(`[newsletter] enviada "${assunto}" — por ${meioEscondido(email)}`);
  return { tipo: "enviado", assunto };
}
