import "server-only";
import { createHash } from "node:crypto";
import { apagar, guardarSeNovo } from "@/lib/painel/redis";

/*
  O aviso de cancelamento sai uma vez por cancelamento — ver o comentário de
  `lib/newsletter/cancelamento.ts`.

  À parte do email para os testes de `testes/` o poderem carregar: o email
  puxa o rodapé da casa, que vem de um JSON que o `node --test` não importa.

  ## A marca tem prazo

  Já não tinha (revisão legal de 2026-10-15): um resumo do email de quem
  cancelou ficava no Redis até essa pessoa se voltar a inscrever, ou seja, em
  regra, para sempre. A marca só serve para o painel e o webhook não mandarem
  dois avisos pelo mesmo cancelamento, e para as repetições do webhook do
  Resend não mandarem outro — coisa de minutos, no máximo dias. Sete dias
  chegam. Depois disso, quem impede um segundo aviso é a prova do consentimento,
  que já tem a retirada registada (ver `jaRetirou` no webhook).
*/

export const PRAZO_DA_MARCA_S = 7 * 24 * 60 * 60;

function chaveDoAviso(email: string): string {
  const resumo = createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
  return `newsletter:cancelamento-avisado:${resumo}`;
}

/** Corre `mandar` se este cancelamento ainda não foi avisado. Diz se correu. */
export async function umaVezPorCancelamento(
  email: string,
  mandar: () => Promise<void>,
): Promise<boolean> {
  const chave = chaveDoAviso(email);
  if (!(await guardarSeNovo(chave, String(Date.now()), PRAZO_DA_MARCA_S))) return false;

  try {
    await mandar();
  } catch (erro) {
    /* Um aviso que não saiu não pode impedir o próximo: o webhook repete. */
    await apagar(chave);
    throw erro;
  }
  return true;
}

/** Quem se volta a inscrever: o próximo cancelamento volta a ser avisado. */
export async function esquecerAviso(email: string): Promise<void> {
  await apagar(chaveDoAviso(email));
}
