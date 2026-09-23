import { artigos, exigirEmDestaque } from "@/data/ementa";
import { formatarPreco } from "@/lib/preco";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/**
 * # Para partilhar: um prato de cada vez
 *
 * O carril dos cocktails mostra três ou quatro cartões ao mesmo tempo, porque o
 * que ali interessa é a **variedade**: vinte e quatro cocktails, e a sensação de
 * que há muitos. Aqui interessa o contrário — o prato em grande, sozinho, com o
 * nome e o preço ao lado. Por isso os painéis têm a **largura do ecrã**: entra
 * um, sai um, entra o seguinte.
 *
 * É o mesmo dispositivo do motor (`pan`) e uma leitura completamente diferente,
 * e é a largura dos itens que faz toda a diferença.
 *
 * ## ⚠️ Só há duas fotografias de comida
 *
 * A tábua e a tosta com compota. **Não são duas por escolha** — são as duas que
 * existem nas dezanove fotografias que a casa publicou. Acrescentar um prato é
 * meter a fotografia em `fotos/instagram/`, dar-lhe nome no
 * `scripts/importar-fotos.mjs` e acrescentar uma linha a `PRATOS` aqui.
 *
 * Esta é a secção que mais ganha com uma ida lá com o telemóvel: uma tábua a
 * ocupar o ecrã inteiro vale mais do que qualquer coisa que se escreva à volta
 * dela.
 *
 * O preço e o nome vêm da carta, nunca escritos aqui à mão — senão passava a
 * haver dois preços para o mesmo prato, o do site e o do balcão.
 */

/** O `id` do artigo em `ementa.json` e a fotografia que lhe corresponde. */
const PRATOS = [
  /* A travessa com as tostinhas, a taça de batata e o tabasco **é** este artigo:
     está tudo na descrição da carta. Não foi escolhido pela fotografia ficar
     bem — foi identificado por aquilo que se vê. */
  { id: "bocadinhos-de-pao-com-chourico", foto: "/casa/tabua-partilha", pequena: 640, grande: 1080 },
  /* Esta não tem descrição na carta (as tostas são uma lista de nome e preço),
     por isso leva uma linha das mensagens que descreve **a fotografia** — o
     chocolate quente que está ao lado é outro artigo, e o rótulo di-lo em vez
     de fingir que vem junto. */
  { id: "torrada-com-compota", foto: "/reels/DVHIQ4CDHyc", pequena: 420, grande: 720 },
] as const;

for (const { id } of PRATOS) exigirEmDestaque(id, "Pratos.tsx");

export function Pratos({
  locale,
  nome,
  facto,
  dado,
  alts,
  verMais,
  verMaisFacto,
  verMaisAcao,
}: {
  locale: Locale;
  nome: string;
  facto: string;
  dado: string;
  /** O texto alternativo de cada fotografia, pelo `id` do artigo. */
  alts: Record<string, string>;
  verMais: string;
  verMaisFacto: string;
  verMaisAcao: string;
}) {
  return (
    <section
      id="partilhar"
      data-sc-act="pan"
      data-sc-span="2.6"
      data-sc-drift="#140d08"
    >
      <div data-sc-stage>
        <div className="pg-pratos" data-sc-pan="0.04">
          <div className="pg-pratos__abertura">
            <div className="pg-rotulo">
              <h2 className="pg-rotulo__nome">{nome}</h2>
              <p className="pg-rotulo__facto">{facto}</p>
              <p className="pg-rotulo__dado">{dado}</p>
            </div>
          </div>

          {PRATOS.map(({ id, foto, pequena, grande }) => {
            const artigo = artigos.find((a) => a.id === id);
            /* Um `id` que deixou de existir na carta aparece como um painel em
               falta, não rebenta a página. */
            if (!artigo) return null;

            return (
              <article key={id} className="pg-prato">
                <figure>
                  <img
                    src={`${foto}.webp`}
                    srcSet={`${foto}-${pequena}.webp ${pequena}w, ${foto}.webp ${grande}w`}
                    sizes="(min-width: 52rem) 45vw, 88vw"
                    width={1080}
                    height={1440}
                    alt={alts[id] ?? ""}
                    loading="lazy"
                    decoding="async"
                  />
                </figure>
                <div className="pg-prato__texto">
                  <h3 className="pg-rotulo__nome">{artigo.nome[locale]}</h3>
                  <p className="pg-rotulo__facto">
                    {artigo.descricao?.[locale] ?? alts[`${id}-facto`]}
                  </p>
                  {artigo.preco !== null && (
                    <p className="pg-prato__preco">
                      {formatarPreco(artigo.preco, locale)}
                    </p>
                  )}
                </div>
              </article>
            );
          })}

          {/* O fecho do carril: a continuação natural quando os pratos acabam. */}
          <div className="pg-pratos__fecho">
            <div className="pg-rotulo">
              <h3 className="pg-rotulo__nome">{verMais}</h3>
              <p className="pg-rotulo__facto">{verMaisFacto}</p>
            </div>
            <p className="mt-5">
              <Link href="/ementa" className="pg-botao">
                {verMaisAcao}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
