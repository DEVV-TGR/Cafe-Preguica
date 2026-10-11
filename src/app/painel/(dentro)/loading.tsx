import { CenaDoRamo } from "@/components/Transicao";

/**
 * O que se vê se a secção nova demorar mais do que a transição: a mesma cena,
 * parada no fim — o ramo inteiro e a preguiça a balançar na ponta.
 *
 * A Ementa e a Casa vão buscar os dados ao GitHub, e isso pode passar do meio
 * segundo da transição. Já foi um esqueleto de cartões, e o Tomás não gostou:
 * eram quadrados que não existiam na secção que ia aparecer. A cena parada no
 * fim é o último fotograma da transição, e por isso não se nota a passagem de
 * uma para a outra.
 */
export default function ACarregar() {
  return (
    <main className="pn-principal" aria-busy="true">
      <p className="pn-so-leitor" role="status">
        A carregar…
      </p>
      <div className="tr tr--espera" aria-hidden="true">
        <CenaDoRamo />
      </div>
    </main>
  );
}
