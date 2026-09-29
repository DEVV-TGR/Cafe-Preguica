import Image from "next/image";
import Link from "next/link";
import { sair } from "@/app/painel/accoes";

/**
 * A barra de cima de todos os ecrãs do painel.
 *
 * Não é a `BarraSite`: essa tem as secções da página inicial, o telefone e a
 * língua, e nada disso faz sentido aqui. Esta tem o caminho de volta, o nome do
 * ecrã, o caminho para o site e o sair. Não é `sticky` — a barra de publicar da ementa é que fica
 * colada em baixo, ao pé do polegar, e duas barras coladas comiam o ecrã.
 */
export function Cabecalho({
  titulo,
  voltarPara,
  quem,
}: {
  titulo: string;
  /** Ausente no ecrã inicial do painel, que não tem para onde voltar. */
  voltarPara?: string;
  quem?: string;
}) {
  return (
    <header className="pn-topo">
      <div className="pn-topo__dentro">
        {voltarPara ? (
          <Link href={voltarPara} className="pn-icone" aria-label="Voltar">
            <span aria-hidden="true">←</span>
          </Link>
        ) : (
          <Image src="/marca/marca.webp" alt="" className="pn-topo__marca" width={40} height={40} />
        )}

        <h1 className="pn-topo__titulo">{titulo}</h1>

        {/* Para o site, na mesma janela. O painel e o site têm layouts de raiz
            diferentes, e o Next carrega a página de novo ao passar de um para o
            outro — é o que se quer, com a barra e as fontes do site. */}
        <Link href="/" className="pn-ligacao pn-topo__site">
          Ver o site
        </Link>

        {quem ? (
          <form action={sair} className="pn-topo__sair">
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
