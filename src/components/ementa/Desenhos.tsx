import type { Capitulo } from "@/data/ementa";

/**
 * # Os desenhos do menu impresso, espalhados pela carta
 *
 * ⚠️ **Experiência.** Recortados da fotografia do menu que a casa mandou e
 * ampliados para o dobro (`scripts/recortar-desenhos.mjs`). Se a casa gostar,
 * pedem-se os ficheiros originais e volta-se a correr o script.
 *
 * Estão **por trás** da carta, e nunca ao lado de um título — pedido do Tomás:
 * dão vida à página sem disputar a leitura com os preços.
 *
 * - **Telemóvel e tablet:** grandes, esbatidos, encostados às bordas e meio
 *   fora do ecrã, por baixo do texto. É a única forma de os ter num ecrã sem
 *   margens livres sem taparem nada.
 * - **Computador largo** (≥ 90rem): nas margens de cada lado da coluna da
 *   carta, com a cor toda — aí há espaço vazio, e não ficam atrás de nada.
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

/* O tamanho de cada ficheiro, em píxeis — o que o `scripts/recortar-desenhos.mjs`
   escreveu (já ampliado para o dobro). Vai para o `width`/`height` do `<img>`,
   que evita saltos ao carregar. Se o script mudar, isto muda com ele. */
const TAMANHOS: Record<Nome, [number, number]> = {
  "cocktail-alto": [150, 334],
  "cocktail-laranja": [148, 212],
  "cocktail-vermelho": [176, 312],
  "cocktail-caneca": [250, 324],
  "comida-tabua": [368, 262],
  "comida-tostinhas": [316, 336],
  "comida-pao": [332, 338],
  "comida-tosta": [314, 262],
};

/* Até quanto se mostra cada um: 1,4 vezes o recorte original (metade do
   ficheiro). Mais do que isso e a ampliação começa a ver-se. */
const ESCALA = 1.4 / 2;

type Lugar = { nome: Nome; lado: "esquerda" | "direita"; topo: number };

/* Dois ou três por capítulo, a alternar de lado. `topo` é a altura, em
   percentagem do capítulo — sempre abaixo da fotografia de abertura, que é
   opaca e os tapava. A comida vai com a comida e os copos com as bebidas; o
   menu não tem desenhos para a garrafeira, as águas e o café, e esses repetem. */
const DO_CAPITULO: Record<Capitulo, Lugar[]> = {
  comer: [
    { nome: "comida-tostinhas", lado: "esquerda", topo: 36 },
    { nome: "comida-tabua", lado: "direita", topo: 60 },
    { nome: "comida-pao", lado: "esquerda", topo: 84 },
  ],
  cocktails: [
    { nome: "cocktail-caneca", lado: "direita", topo: 34 },
    { nome: "cocktail-vermelho", lado: "esquerda", topo: 58 },
    { nome: "cocktail-alto", lado: "direita", topo: 82 },
  ],
  mocktails: [
    { nome: "cocktail-laranja", lado: "esquerda", topo: 55 },
    { nome: "cocktail-vermelho", lado: "direita", topo: 80 },
  ],
  garrafeira: [
    { nome: "cocktail-alto", lado: "direita", topo: 38 },
    { nome: "cocktail-caneca", lado: "esquerda", topo: 72 },
  ],
  aguas: [
    { nome: "cocktail-vermelho", lado: "direita", topo: 48 },
    { nome: "cocktail-laranja", lado: "esquerda", topo: 80 },
  ],
  cafetaria: [
    { nome: "comida-tosta", lado: "esquerda", topo: 45 },
    { nome: "comida-tostinhas", lado: "direita", topo: 78 },
  ],
};

/** Os desenhos de um capítulo. Vão à cabeça do `<section>`, por trás de tudo. */
export function DesenhosDoCapitulo({ capitulo }: { capitulo: Capitulo }) {
  return (
    <>
      {DO_CAPITULO[capitulo].map(({ nome, lado, topo }, i) => {
        const [largura, altura] = TAMANHOS[nome];
        return (
          <img
            key={`${nome}-${i}`}
            className={`em-desenho em-desenho--${lado}`}
            src={`/desenhos/${nome}.webp`}
            width={largura}
            height={altura}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            style={
              {
                top: `${topo}%`,
                "--largura": `${Math.round(largura * ESCALA)}px`,
                "--rodar": i % 2 === 0 ? "-7deg" : "6deg",
              } as React.CSSProperties
            }
          />
        );
      })}
    </>
  );
}
