import { artigos, exigirEmDestaque } from "@/data/ementa";
import { formatarPreco } from "@/lib/preco";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Ampliar, type GrupoDoVisor } from "@/components/Visor";
import { fotoDoVisor } from "@/lib/visor";

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
 * ## Anda ao contrário dos cocktails
 *
 * Lá o carril corre para a esquerda; aqui corre para a **direita**, com o
 * título a abrir do lado direito e os pratos a entrar pela esquerda. É o
 * contraste entre as duas secções, pedido pelo Tomás.
 *
 * ⚠️ O motor só sabe andar para a esquerda, e o motor não se toca. Por isso o
 * `.pg-pratos-espelho` vira o carril ao espelho e cada painel volta a virar-se
 * lá dentro (ver `catalogo.css`): o motor continua a empurrar para a esquerda
 * e o que se vê anda para a direita. O HTML fica na ordem de leitura.
 *
 * ## Os pratos
 *
 * Os bocadinhos, a torrada com compota e as saloias. Acrescentar um prato é
 * dar nome à fotografia no `scripts/importar-fotos.mjs` (as da sessão do
 * Rafael em `NOMES_SESSAO`) e acrescentar uma linha a `PRATOS` aqui.
 *
 * Esta é a secção que mais ganha com uma ida lá com o telemóvel: uma tábua a
 * ocupar o ecrã inteiro vale mais do que qualquer coisa que se escreva à volta
 * dela.
 *
 * O preço e o nome vêm da carta, nunca escritos aqui à mão — senão passava a
 * haver dois preços para o mesmo prato, o do site e o do balcão.
 *
 * Um toque num prato abre-o inteiro no visor (`components/Visor.tsx`), com os
 * outros pratos ao lado para deslizar.
 */

/** O `id` do artigo em `ementa.json` e a fotografia que lhe corresponde. */
const PRATOS = [
  /* A travessa com as tostinhas, a taça de batata e o tabasco **é** este artigo:
     está tudo na descrição da carta. Não foi escolhido pela fotografia ficar
     bem — foi identificado por aquilo que se vê. */
  {
    id: "bocadinhos-de-pao-com-chourico",
    foto: "/casa/tabua-partilha",
    pequena: 640,
    grande: 1080,
  },
  /* Esta não tem descrição na carta (as tostas são uma lista de nome e preço),
     por isso leva uma linha das mensagens que descreve **a fotografia** — o
     chocolate quente que está ao lado é outro artigo, e o rótulo di-lo em vez
     de fingir que vem junto. */
  {
    id: "torrada-com-compota",
    foto: "/reels/DVHIQ4CDHyc",
    pequena: 420,
    grande: 720,
  },
  /* As duas tostas no pão saloio, a mista e a de atum. O painel é da mista (a
     que a casa chama "saloia mista"); a de atum vai dita na linha de baixo,
     como o chocolate quente ao lado da torrada — sem preço escrito à mão. */
  {
    id: "queijo-fiambre",
    foto: "/casa/tostas-saloias",
    pequena: 640,
    grande: 1080,
  },
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
  ampliar,
}: {
  locale: Locale;
  nome: string;
  facto: string;
  /** "Desde 1,85 €". Sem preço nenhum na carta, não há linha. */
  dado?: string;
  /** O texto alternativo de cada fotografia, pelo `id` do artigo. */
  alts: Record<string, string>;
  verMais: string;
  verMaisFacto: string;
  verMaisAcao: string;
  /** "Ampliar a fotografia" — o começo do nome do botão de cada prato. */
  ampliar: string;
}) {
  /* Só os pratos que existem na carta: o grupo do visor e os painéis saem da
     mesma lista, para a posição de cada um no visor bater certo. */
  const presentes = PRATOS.flatMap((prato) => {
    const artigo = artigos.find((a) => a.id === prato.id);
    return artigo ? [{ ...prato, artigo }] : [];
  });
  const grupo: GrupoDoVisor = {
    nome,
    fotos: presentes.map(({ id, foto, pequena, grande, artigo }) =>
      fotoDoVisor(
        foto,
        alts[id] ?? "",
        [
          artigo.preco === null
            ? artigo.nome[locale]
            : `${artigo.nome[locale]} · ${formatarPreco(artigo.preco, locale)}`,
        ],
        pequena,
        grande,
      ),
    ),
  };

  return (
    <section
      id="partilhar"
      data-sc-act="pan"
      data-sc-span="2.6"
      data-sc-drift="#140d08"
    >
      <div data-sc-stage>
        <div className="pg-pratos-espelho">
          <div className="pg-pratos" data-sc-pan="0.04">
            <div className="pg-pratos__abertura">
              <div className="pg-rotulo">
                <h2 className="pg-rotulo__nome">{nome}</h2>
                <p className="pg-rotulo__facto">{facto}</p>
                {dado && <p className="pg-rotulo__dado">{dado}</p>}
              </div>
            </div>

            {/* Um `id` que deixou de existir na carta aparece como um painel em
                falta, não rebenta a página — ficou de fora em `presentes`. */}
            {presentes.map(({ id, foto, pequena, grande, artigo }, i) => {
              return (
                <article key={id} className="pg-prato">
                  <figure>
                    <Ampliar grupo={grupo} indice={i} rotulo={`${ampliar}: ${artigo.nome[locale]}`}>
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
                    </Ampliar>
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
      </div>
    </section>
  );
}
