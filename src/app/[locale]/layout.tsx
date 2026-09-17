import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fraunces, Geist } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DadosEstruturados } from "@/components/DadosEstruturados";
import { routing } from "@/i18n/routing";
import { URL_SITE } from "@/lib/site";
import "../globals.css";

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
const display = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--fonte-display",
  display: "swap",
});

const corpo = Geist({
  subsets: ["latin"],
  variable: "--fonte-corpo",
  display: "swap",
});

/** As duas línguas geram-se no `build`; não há renderização a pedido. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.inicio" });
  const marca = await getTranslations({ locale, namespace: "marca" });

  return {
    metadataBase: new URL(URL_SITE),
    /* O `%s` é o título de cada página; a homepage usa o `default`. Poupa
       repetir "— Café Preguiça" em cada `generateMetadata`. */
    title: { default: t("titulo"), template: `%s — ${marca("nome")}` },
    description: t("descricao"),
  };
}

export default async function LayoutIdioma({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  /* Sem isto, qualquer componente que peça traduções obriga a página a passar a
     dinâmica — e perde-se a geração estática das duas línguas. */
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "metadata.inicio" });
  const nav = await getTranslations({ locale, namespace: "nav" });

  return (
    <html lang={locale} className={`${display.variable} ${corpo.variable}`}>
      <body>
        <NextIntlClientProvider>
          {/* Primeiro tabulador da página: quem navega por teclado salta o
              cabeçalho inteiro em vez de o percorrer em todas as páginas. */}
          <a
            href="#conteudo"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded focus:bg-tinta focus:px-4 focus:py-2 focus:text-papel"
          >
            {nav("saltarParaConteudo")}
          </a>
          {/* Sem cabeçalho nem invólucro aqui: **cada página diz o que é.**
              As de leitura chamam `<Pagina>`, que traz o cabeçalho do site e a
              coluna legível; a inicial é um catálogo de margem a margem, com a
              sua própria navegação, e seria estragada por um invólucro comum.
              Ver `components/Pagina.tsx`. */}
          {children}
        </NextIntlClientProvider>
        <DadosEstruturados descricao={t("descricao")} />
      </body>
    </html>
  );
}
