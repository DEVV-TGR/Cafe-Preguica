/*
  Os sabores num módulo à parte, **sem o `ementa.json`**.

  O jogo dos sabores (`components/ementa/Sabores.tsx`) corre no browser, e
  importava esta lista de `ementa.ts` — o que metia a carta inteira no
  JavaScript da `/ementa`, incluindo os artigos da carta secreta. Daqui só
  vai a lista.
*/

/**
 * Os catorze sabores do Cocktail Preguiça e do Unicórnio.
 *
 * ⚠️ **Não são catorze artigos da ementa, e é de propósito.** A casa vende duas
 * bebidas — uma com álcool a 5,00 €, outra sem a 1,70 € — e o sabor escolhe-se
 * depois, ao balcão. Pô-los como artigos dava vinte e oito entradas na carta
 * para duas bebidas, e vinte e oito sítios para o preço ficar desactualizado.
 *
 * A ordem é a do menu impresso, que lê em duas colunas: a coluna da esquerda
 * primeiro, depois a da direita. O `surpresa` vem à cabeça porque é assim que
 * está no papel, e porque é o que a casa quer que se peça.
 */
export const SABORES = [
  "surpresa",
  "limao",
  "matcha",
  "frutos-vermelhos",
  "caramelo",
  "menta",
  "ananas",
  "pessego",
  "morango",
  "fumado",
  "laranja",
  "coco",
  "framboesa",
  "maracuja",
] as const;

export type Sabor = (typeof SABORES)[number];
