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
 *
 * ⚠️ **`localeCookie: false` é o que mantém a página `/cookies` verdadeira.**
 * Por omissão o `next-intl` grava um `NEXT_LOCALE` a quem abre `/en` com o
 * browser noutra língua — ou seja, a toda a gente que carregue em "English" na
 * barra. A língua já está no endereço, e é aí que fica: quem escolheu inglês
 * continua em `/en/...` enquanto navegar. O CI fica vermelho se o cookie voltar.
 *
 * ⚠️ **`localeDetection: false` é o que faz o botão da barra funcionar**, e sai
 * directamente da linha de cima. Sem cookie, o negociador não tem memória: a
 * única coisa que lhe resta para adivinhar a língua é o `Accept-Language` do
 * browser, e ele re-adivinha a cada pedido. Com a detecção ligada, quem tem o
 * browser em inglês carregava em "Português" e não saía do sítio — o link vai a
 * `/pt/ementa`, o negociador tira o prefixo porque o português é a língua por
 * omissão (`as-needed`), e ao ver `/ementa` sem prefixo volta a ler o
 * `Accept-Language` e devolve a pessoa a `/en/ementa`. Dois saltos para ficar
 * onde estava, que é indistinguível de um botão partido.
 *
 * Desligada, o endereço manda e mais nada: `/...` é português, `/en/...` é
 * inglês, e uma escolha explícita nunca é desfeita por trás. O que se perde é a
 * abertura automática em inglês para quem chega de fora ao domínio sem `/en` —
 * fica-se pelo português, com o botão à vista na barra. É a troca certa para uma
 * casa de bairro, e de qualquer forma não havia como ter as duas coisas sem
 * guardar a escolha em lado nenhum.
 */
export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  localePrefix: "as-needed",
  localeCookie: false,
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
