import Image from "next/image";
import Link from "next/link";
import { sair } from "@/app/painel/accoes";
import { iniciais } from "@/lib/painel/quadro";
import { Separadores } from "./Separadores";

/**
 * A barra de cima de todos os ecrãs do painel.
 *
 * Não é a `BarraSite`: essa tem as secções da página inicial, o telefone e a
 * língua, e nada disso faz sentido aqui. Esta tem o logótipo (que volta ao
 * quadro), o nome do ecrã, os separadores das secções e quem está ligado, com o
 * sair — que leva ao site (ver `sair` em `app/painel/accoes.ts`), e por isso
 * não há aqui um "Ver o site" à parte.
 *
 * A seta de voltar só aparece onde os separadores não chegam: num ecrã que está
 * **dentro** de uma secção (uma newsletter enviada volta à Newsletter). Para
 * voltar ao quadro, os separadores e o logótipo já servem.
 *
 * Não é `sticky` — a barra de publicar da ementa é que fica colada em baixo, ao
 * pé do polegar, e duas barras coladas comiam o ecrã.
 */
export function Cabecalho({
  titulo,
  voltarPara,
  quem,
}: {
  titulo: string;
  voltarPara?: string;
  quem?: string;
}) {
  const fundo = voltarPara && voltarPara !== "/painel";

  return (
    <header className="pn-topo">
      <div className="pn-topo__dentro">
        {fundo ? (
          <Link href={voltarPara} className="pn-icone" aria-label="Voltar">
            <span aria-hidden="true">←</span>
          </Link>
        ) : (
          <Link href="/painel" className="pn-topo__casa" aria-label="Painel">
            <Image src="/marca/marca.webp" alt="" className="pn-topo__marca" width={40} height={40} />
          </Link>
        )}

        <h1 className="pn-topo__titulo">{titulo}</h1>

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
