import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Instrument_Sans } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { DadosEstruturados } from "@/components/DadosEstruturados";
import { routing, type Locale } from "@/i18n/routing";
import { URL_SITE } from "@/lib/site";
import "../globals.css";

/**
 * ⚠️ **A fonte é provisória.** Não há manual de marca do Café Preguiça; a
 * Instrument Sans está aqui por ser neutra e legível, não por ser a escolha
 * certa. Quando a identidade estiver decidida, troca-se aqui — e só aqui, porque
 * o resto do site vai buscar a variável CSS.
 *
 * `next/font` descarrega-a no `build` e serve-a do próprio domínio. É isso que
 * permite ao `font-src 'self'` da CSP ser tão fechado, e é também o que evita um
 * pedido ao Google com o IP de cada visitante — que é o que um `<link>` para o
 * Google Fonts faz, e que obrigaria a falar de cookies de terceiros na página de
 * privacidade.
 *
 * As duas variáveis apontam hoje para a mesma família de propósito: sem
 * identidade definida, um display diferente seria uma escolha estética a fingir
 * de estrutura. A separação fica feita para quando houver.
 */
const corpo = Instrument_Sans({
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
    <html lang={locale} className={`${corpo.variable}`}>
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
          <Cabecalho locale={locale as Locale} />
          <main id="conteudo" className="mx-auto max-w-3xl px-4 py-10">
            {children}
          </main>
          <Rodape />
        </NextIntlClientProvider>
        <DadosEstruturados descricao={t("descricao")} />
      </body>
    </html>
  );
}
