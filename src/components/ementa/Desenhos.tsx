import type { Capitulo, Categoria } from "@/data/ementa";

/**
 * # Os desenhos do menu impresso, espalhados pela carta
 *
 * ⚠️ **Experiência.** Recortados da fotografia do menu que a casa mandou
 * (`scripts/recortar-desenhos.mjs`), por isso pequenos: cada um tem 100–200 px e
 * **nunca é mostrado maior do que isso**, senão fica desfocado. Se a casa gostar,
 * pedem-se os ficheiros originais e volta-se a correr o script.
 *
 * Dois sítios:
 *
 * - **Ao lado do título de cada secção**, pequenos, em todos os ecrãs — só nas
 *   secções que têm um desenho que lhes diga respeito;
 * - **nas margens de cada capítulo**, maiores, só em ecrãs largos, onde a
 *   coluna da carta deixa espaço vazio dos dois lados.
 *
 * São decoração: `alt=""`, fora da árvore de acessibilidade e sem receber
 * cliques. Não dizem que prato ou que cocktail são — o menu também não diz.
 */

type Nome =
  | "cocktail-alto"
  | "cocktail-laranja"
  | "cocktail-vermelho"
  | "cocktail-caneca"
  | "comida-tabua"
  | "comida-tostinhas"
  | "comida-pao"
  | "comida-tosta";

/* O tamanho de cada recorte, em píxeis — o que o `scripts/recortar-desenhos.mjs`
   escreveu. Vai para o `width`/`height` do `<img>`, que evita saltos ao
   carregar, e é o teto: o CSS nunca o mostra maior. Se o script mudar, isto
   muda com ele. */
const TAMANHOS: Record<Nome, [number, number]> = {
  "cocktail-alto": [75, 167],
  "cocktail-laranja": [74, 106],
  "cocktail-vermelho": [88, 156],
  "cocktail-caneca": [125, 162],
  "comida-tabua": [184, 131],
  "comida-tostinhas": [158, 168],
  "comida-pao": [166, 169],
  "comida-tosta": [157, 131],
};

const DA_SECCAO: Partial<Record<Categoria, Nome>> = {
  "tostas-e-snacks": "comida-tosta",
  tabuas: "comida-tabua",
  tacas: "comida-pao",
  "cocktails-classicos": "cocktail-alto",
  /* Os mules estão nos Special's, e o desenho é uma caneca de cobre. */
  "cocktails-special": "cocktail-caneca",
  "sangrias-e-espumantes": "cocktail-laranja",
  mocktails: "cocktail-vermelho",
};

/* Um ou dois por capítulo, a alternar de lado. `topo` é onde fica, em
   percentagem da altura do capítulo. O menu não tem desenhos para a garrafeira,
   as águas e o café, e esses capítulos repetem os dos cocktails e da comida. */
const DO_CAPITULO: Record<Capitulo, { nome: Nome; lado: "esquerda" | "direita"; topo: number }[]> = {
  comer: [
    { nome: "comida-tostinhas", lado: "esquerda", topo: 30 },
    { nome: "comida-pao", lado: "direita", topo: 62 },
  ],
  cocktails: [
    { nome: "cocktail-caneca", lado: "direita", topo: 28 },
    { nome: "cocktail-vermelho", lado: "esquerda", topo: 60 },
  ],
  mocktails: [{ nome: "cocktail-alto", lado: "direita", topo: 40 }],
  garrafeira: [{ nome: "cocktail-laranja", lado: "esquerda", topo: 35 }],
  aguas: [{ nome: "cocktail-vermelho", lado: "direita", topo: 40 }],
  cafetaria: [{ nome: "comida-tosta", lado: "esquerda", topo: 35 }],
};

function Imagem({ nome, className, style }: { nome: Nome; className: string; style?: React.CSSProperties }) {
  const [largura, altura] = TAMANHOS[nome];
  return (
    <img
      className={className}
      src={`/desenhos/${nome}.webp`}
      width={largura}
      height={altura}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      style={style}
    />
  );
}

/** O desenho pequeno ao lado do título de uma secção, se ela tiver um. */
export function DesenhoDaSeccao({ categoria }: { categoria: Categoria }) {
  const nome = DA_SECCAO[categoria];
  return nome ? <Imagem nome={nome} className="em-desenho em-desenho--seccao" /> : null;
}

/** Os desenhos das margens de um capítulo — o CSS só os mostra em ecrãs largos. */
export function DesenhosDoCapitulo({ capitulo }: { capitulo: Capitulo }) {
  return (
    <>
      {DO_CAPITULO[capitulo].map(({ nome, lado, topo }, i) => (
        <Imagem
          key={nome}
          nome={nome}
          className={`em-desenho em-desenho--margem em-desenho--${lado}`}
          style={{ top: `${topo}%`, "--rodar": i % 2 === 0 ? "-6deg" : "5deg" } as React.CSSProperties}
        />
      ))}
    </>
  );
}
