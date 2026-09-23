import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { abrir, NOME_DO_COOKIE } from "./sessao";

/*
  A porta do painel — e é esta a fechadura, não o `proxy.ts`.

  O `proxy.ts` faz o que a documentação do Next chama uma verificação optimista:
  olha se o cookie existe e manda embora quem não o tem, para poupar um render.
  Não abre o selo e não sabe quem está do outro lado. A verificação a sério é
  esta, e faz-se o mais perto possível dos dados — em cada `page.tsx` e à cabeça
  de cada acção que grava.

  ## Porque é que isto não está no layout

  Porque um layout não é fronteira de segurança, e os docs do Next dizem-no com
  todas as letras: não volta a renderizar em navegação do lado do cliente e não
  impede um segmento filho de correr. Um `exigirSessao()` no layout dava a
  sensação de proteger tudo o que está por baixo e não protegia nada.

  O layout do painel chama a `sessao()` — para mostrar quem está ligado — e mais
  nada.

  ## O `cache` do React

  Memoiza dentro do mesmo render: a página, o cabeçalho e o editor pedem a
  sessão e o cookie só é aberto uma vez. Não é cache entre pedidos.
*/

export const sessao = cache(async () => {
  const valor = (await cookies()).get(NOME_DO_COOKIE)?.value;
  return abrir(valor);
});

/** Para páginas. Quem não tem sessão vai para o ecrã de entrada. */
export const exigirSessao = cache(async () => {
  const s = await sessao();
  if (!s) redirect("/painel/entrar");
  return s;
});

/*
  Para server actions.

  Não redirecciona: atira. Uma action é um ponto de entrada como outro qualquer
  — pode ser chamada por um POST feito à mão, sem browser e sem página — e a
  resposta certa a "não tens sessão" é recusar, não mandar navegar para lado
  nenhum.
*/
export async function exigirSessaoNaAccao() {
  const s = await sessao();
  if (!s) throw new Error("Sem sessão.");
  return s;
}
