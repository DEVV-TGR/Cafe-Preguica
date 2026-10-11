import type { ReactNode } from "react";
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
 * ⚠️ **Este layout não protege nada.** Lê a sessão só para escrever quem está
 * ligado; quem protege continua a ser o `exigirSessao()` de cada `page.tsx` e
 * de cada acção — ver o comentário do `app/painel/layout.tsx`.
 */
export default async function LayoutDeDentro({ children }: { children: ReactNode }) {
  const quem = await sessao();

  return (
    <>
      <Cabecalho quem={quem?.email} />
      {children}
    </>
  );
}
