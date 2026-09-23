import { Fraunces, Geist } from "next/font/google";

/**
 * As duas famílias, e porquê estas.
 *
 * O `taste.md` da skill avisa que "serif não é sinónimo de premium" e que só se
 * usa uma quando a marca a nomeia. **Esta marca nomeia-a**: os cabeçalhos do
 * menu impresso — "TOSTAS & SNACK'S", "COCKTAILS", "VINHO & SANGRIA" — são uma
 * serifada de display, e o logótipo é um manuscrito. Não é gosto meu, está no
 * papel que a casa manda imprimir.
 *
 * A **Fraunces** entrou por causa dos eixos `SOFT` e `WONK`: amaciam as
 * terminações e entortam as diagonais de propósito. É o que separa esta serifada
 * de uma Didone de luxo — e o `BRIEF.md`, resposta 1, diz "de bairro, o premium
 * vem do à-vontade, não do luxo". Uma serifada de contraste alto dava
 * exactamente a coutada que a resposta recusa.
 *
 * A **Geist** carrega o texto corrido. O `taste.md` desaconselha a Inter por ser
 * a cara mais usada em páginas geradas e ler como uma não-decisão.
 *
 * ⚠️ **Nenhuma das duas é a letra do logótipo**, que é manuscrita e vive como
 * imagem em `public/marca/`. Se um dia aparecer a fonte original da marca,
 * troca-se a display aqui e muda em todo o lado.
 *
 * `next/font` descarrega-as no `build` e serve-as do próprio domínio. É isso que
 * permite ao `font-src 'self'` da CSP ser tão fechado, e é também o que evita um
 * pedido ao Google com o IP de cada visitante — que é o que um `<link>` para o
 * Google Fonts faz, e que obrigaria a falar de cookies de terceiros na página de
 * privacidade. O passo do CI que recusa recursos de terceiros vigia isto.
 */
export const display = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--fonte-display",
  display: "swap",
});

export const corpo = Geist({
  subsets: ["latin"],
  variable: "--fonte-corpo",
  display: "swap",
});

/**
 * As duas variáveis juntas, para o `className` do `<html>`. Vivem neste ficheiro
 * e não no layout porque há dois layouts de raiz — o do site (`[locale]`) e o do
 * painel — e declarar as fontes duas vezes eram duas cópias de cada ficheiro no
 * build.
 */
export const fontes = `${display.variable} ${corpo.variable}`;
