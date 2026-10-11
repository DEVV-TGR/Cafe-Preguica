import "server-only";
import { createHash } from "node:crypto";
import { apagar, guardarSeNovo } from "@/lib/painel/redis";

/*
  O aviso de cancelamento sai uma vez por cancelamento — ver o comentário de
  `lib/newsletter/cancelamento.ts`.

  À parte do email para os testes de `testes/` o poderem carregar: o email
  puxa o rodapé da casa, que vem de um JSON que o `node --test` não importa.
*/

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
  if (!(await guardarSeNovo(chave, String(Date.now())))) return false;

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
