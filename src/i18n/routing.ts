import { defineRouting } from "next-intl/routing";

/**
 * Duas línguas: português para quem vive aqui, inglês para quem está de
 * passagem.
 *
 * `localePrefix: "as-needed"` deixa as rotas portuguesas sem prefixo
 * (`/ementa`) e prefixa só o inglês (`/en/ementa`). Os *slugs* são iguais nas
 * duas línguas de propósito: traduzi-los obrigava a manter um mapa de
 * `pathnames` e a tratar redirecionamentos, e não traz nada a um site deste
 * tamanho.
 *
 * ⚠️ Acrescentar uma língua aqui é acrescentá-la em todo o lado — o `messages/`
 * passa a precisar do ficheiro dela, e o `sitemap.ts` e os `alternates` das
 * metadata seguem sozinhos porque leem esta lista. É por isso que a lista vive
 * aqui e não copiada em três sítios.
 */
export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
