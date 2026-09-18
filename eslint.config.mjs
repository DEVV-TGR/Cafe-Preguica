import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * `eslint-config-next` 16 já exporta *flat config* nativo. A receita antiga, com
 * `FlatCompat` a traduzir o formato `.eslintrc`, rebenta com esta versão
 * ("Converting circular structure to JSON") — se aparecer esse erro, é sinal de
 * que alguém voltou a pôr o `FlatCompat` aqui.
 */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      /* O motor do scrollcraft é material de terceiros, copiado para dentro do
         projeto **byte a byte** e nunca editado — é essa a regra da skill que o
         produziu. Analisá-lo dá avisos sobre código que não é nosso e que não
         podemos corrigir sem quebrar a regra. */
      "public/scrollcraft/**",
      /* Screenshots e scripts de verificação, fora do git — ver `.gitignore`. */
      "scrollcraft/lab/**",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    /**
     * A página inicial e os seus componentes servem `<img>` em vez de
     * `next/image`, e é uma decisão, não um esquecimento.
     *
     * As fotografias em `public/casa/` **já saíram do `npm run fotos` em WebP e
     * exactamente nas duas larguras que a página pede** (640 e 1080), com
     * `srcset` e `sizes` escritos à mão em cada sítio. O que o `next/image`
     * acrescentaria era um pedido ao `/_next/image` para refazer um trabalho já
     * feito — e, na Vercel, uma factura de optimização de imagens por cima.
     *
     * Há ainda uma razão de mecanismo: a preguiça de `components/catalogo/
     * Preguica.tsx` leva uma `transform` reescrita a cada frame, e o
     * `next/image` embrulha a imagem em elementos com posicionamento próprio que
     * lutam com ela.
     *
     * A ementa entra pela mesma razão e só por ela: usa **as mesmas fotografias
     * de `public/casa/`**, já nas duas larguras, e a preguiça pendurada.
     *
     * ⚠️ Isto vale para estas duas páginas. Uma página nova com fotografias de
     * tamanho desconhecido deve usar `next/image` — não alargar esta excepção.
     */
    /* ⚠️ O padrão do caminho não é escrito com a pasta `[locale]` à letra: nos
       globos, os parênteses rectos são uma **classe de caracteres**, por isso o
       caminho literal não se encontra a si próprio e a excepção era
       silenciosamente ignorada — o lint continuava a avisar e ninguém percebia
       porquê. A estrela não atravessa barras, portanto o padrão abaixo apanha só
       a página inicial; as outras estão um nível mais abaixo.
       (E sim, uma estrela seguida de barra dentro deste comentário fechá-lo-ia
       a meio — foi o erro a seguir a este.) */
    files: [
      "src/app/*/page.tsx",
      "src/app/*/ementa/page.tsx",
      "src/components/catalogo/**",
      "src/components/ementa/**",
      "src/components/BarraSite.tsx",
      "src/components/Pagina.tsx",
      "src/components/Transicao.tsx",
    ],
    rules: { "@next/next/no-img-element": "off" },
  },
];

export default eslintConfig;
