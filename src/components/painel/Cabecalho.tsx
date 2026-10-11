import Image from "next/image";
import { sair } from "@/app/painel/accoes";
import { iniciais } from "@/lib/painel/quadro";
import { LigacaoAoQuadro, Separadores } from "./Separadores";

/**
 * A barra de cima de todos os ecrãs de dentro do painel.
 *
 * Vive no layout de `app/painel/(dentro)/`, e não em cada página: um layout
 * não se desenha outra vez quando se muda de secção, e é isso que faz a
 * mudança ser suave — o topo fica, e só o conteúdo de baixo troca. Já viveu em
 * cada página, e cada separador carregado parecia uma página nova.
 *
 * O nome do ecrã deixou de estar aqui: cada página tem o seu título grande
 * (`TituloDaPagina`), e os separadores dizem onde se está.
 *
 * Não é a `BarraSite`: essa tem as secções da página inicial, o telefone e a
 * língua. O sair leva ao site (ver `sair` em `app/painel/accoes.ts`), e por
 * isso não há aqui um "Ver o site" à parte.
 *
 * Não é `sticky` — a barra de publicar da ementa é que fica colada em baixo, ao
 * pé do polegar, e duas barras coladas comiam o ecrã.
 */
export function Cabecalho({ quem }: { quem?: string }) {
  return (
    <header className="pn-topo">
      <div className="pn-topo__dentro">
        <LigacaoAoQuadro>
          <Image src="/marca/marca.webp" alt="" className="pn-topo__marca" width={40} height={40} />
          <span className="pn-topo__nome">Painel</span>
        </LigacaoAoQuadro>

        <Separadores />

        {quem ? (
          <form action={sair} className="pn-topo__sair">
            <span className="pn-avatar" aria-hidden="true">
              {iniciais(quem)}
            </span>
            <span className="pn-topo__quem">{quem}</span>
            <button type="submit" className="pn-ligacao">
              Sair
            </button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
