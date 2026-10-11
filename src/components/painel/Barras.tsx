import { escala } from "@/lib/painel/quadro";

/**
 * Um gráfico de barras riscadas, com a maior cheia e o número por cima — o do
 * quadro, para as Mesas o poderem usar em mais sítios (por hora, noite a noite,
 * por dia da semana).
 *
 * As barras chegam da esquerda para a direita, já com a etiqueta de baixo e o
 * texto que o rato mostra. `denso` mostra uma etiqueta em cada duas, para muitas
 * barras caberem no telemóvel.
 */
export type Barra = { chave: string; etiqueta: string; valor: number; titulo: string };

const UMA_CASA = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 });

export function Barras({ barras, denso = false }: { barras: Barra[]; denso?: boolean }) {
  const maior = Math.max(0, ...barras.map((b) => b.valor));
  const { topo, marcas } = escala(maior);
  const melhor = maior > 0 ? barras.findLastIndex((b) => b.valor === maior) : -1;

  return (
    <div className="pn-grafico__area" aria-hidden="true" data-denso={denso || undefined}>
      <ul className="pn-grafico__eixo">
        {[...marcas].reverse().map((m) => (
          <li key={m}>{UMA_CASA.format(m)}</li>
        ))}
      </ul>

      <ol className="pn-grafico__barras">
        {barras.map((b, i) => (
          <li key={b.chave} className="pn-grafico__noite" title={b.titulo}>
            <span className="pn-grafico__calha">
              <span
                className="pn-grafico__barra"
                data-melhor={i === melhor || undefined}
                data-vazia={b.valor === 0 || undefined}
                style={{ height: `${(b.valor / topo) * 100}%` }}
              >
                {i === melhor ? <span className="pn-grafico__selo">{UMA_CASA.format(b.valor)}</span> : null}
              </span>
            </span>
            <span className="pn-grafico__dia">{b.etiqueta}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
