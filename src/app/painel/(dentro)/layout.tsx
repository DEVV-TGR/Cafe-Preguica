import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { sessao } from "@/lib/painel/porta";
import { Cabecalho } from "@/components/painel/Cabecalho";

/**
 * O invólucro das secções de dentro do painel: o topo, e por baixo a secção.
 *
 * Um grupo de rotas (`(dentro)`), que não entra no endereço, e que existe para
 * o topo **não** se desenhar outra vez em cada mudança de secção: o Next
 * guarda o layout e só troca a página. Os ecrãs de entrada ficam fora do
 * grupo, sem topo.
 *
 * ⚠️ **Este layout não é a proteção.** Quem protege continua a ser o
 * `exigirSessao()` de cada `page.tsx` e de cada acção — um layout não volta a
 * correr na navegação do lado do cliente; ver o comentário do
 * `app/painel/layout.tsx`.
 *
 * ## Mas manda para a entrada quem não tem sessão, e é por causa do `loading`
 *
 * Com o `loading.tsx` deste grupo, o Next começa a mandar a página logo — com
 * o estado 200 — e o `redirect` do `exigirSessao()` da página chegava já a meio
 * da resposta, dentro do corpo. Não ia nada do painel nessa resposta, mas um
 * cookie inventado recebia um 200 em vez de um 307, e o CI ("O painel está
 * fechado") tinha razão em recusar. O layout corre antes de a resposta começar,
 * e um `redirect` aqui volta a ser um 307 a sério.
 */
export default async function LayoutDeDentro({ children }: { children: ReactNode }) {
  const quem = await sessao();
  if (!quem) redirect("/painel/entrar");

  return (
    <>
      <Cabecalho quem={quem.email} />
      {children}
    </>
  );
}
