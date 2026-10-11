import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A cabeça de cada secção do painel: o olho dourado, o título grande na
 * Fraunces e uma frase — a mesma voz do "Bem-vindo de volta" do quadro.
 *
 * A seta de voltar só aparece onde os separadores não chegam: num ecrã que
 * está **dentro** de uma secção (uma newsletter enviada volta à Newsletter).
 */
export function TituloDaPagina({
  olho,
  titulo,
  frase,
  voltarPara,
  accoes,
}: {
  olho: string;
  titulo: string;
  frase?: ReactNode;
  voltarPara?: string;
  accoes?: ReactNode;
}) {
  return (
    <header className="pn-cabeca">
      {voltarPara ? (
        <Link href={voltarPara} className="pn-icone pn-cabeca__voltar" aria-label="Voltar">
          <span aria-hidden="true">←</span>
        </Link>
      ) : null}
      <div className="pn-cabeca__texto">
        <p className="pn-olho">{olho}</p>
        <h1 className="pn-cabeca__titulo">{titulo}</h1>
        {frase ? <p className="pn-cabeca__frase">{frase}</p> : null}
      </div>
      {accoes ? <div className="pn-cabeca__accoes">{accoes}</div> : null}
    </header>
  );
}
