/**
 * O que se vê enquanto a secção nova chega: o esqueleto de uma cabeça e de
 * três cartões, a pulsar devagar.
 *
 * A Ementa e a Casa vão buscar os dados ao GitHub, e isso demora o seu
 * bocado. Sem isto, o ecrã ficava parado na secção antiga até a nova estar
 * pronta, e parecia que o toque não tinha pegado.
 */
export default function ACarregar() {
  return (
    <main className="pn-principal" aria-busy="true">
      <p className="pn-so-leitor" role="status">
        A carregar…
      </p>
      <div className="pn-esqueleto" aria-hidden="true">
        <span className="pn-esqueleto__olho" />
        <span className="pn-esqueleto__titulo" />
        <div className="pn-esqueleto__grelha">
          <span className="pn-esqueleto__bloco" />
          <span className="pn-esqueleto__bloco" />
          <span className="pn-esqueleto__bloco" />
        </div>
      </div>
    </main>
  );
}
