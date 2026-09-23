import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DadosEstruturados } from "@/components/DadosEstruturados";
import { Convite, type TextosDoConvite } from "@/components/newsletter/Convite";
import { routing } from "@/i18n/routing";
import { URL_SITE } from "@/lib/site";
import { fontes } from "../fontes";
import "../globals.css";
import "../site.css";

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
  const convite = await getTranslations({ locale, namespace: "newsletter.convite" });

  /* Os textos vão como props, já traduzidos, e não pelo `useTranslations` do
     cliente: assim o convite não obriga a mandar as mensagens todas para o
     browser. */
  const textosDoConvite: TextosDoConvite = {
    olho: convite("olho"),
    titulo: convite("titulo"),
    texto: convite("texto"),
    etiqueta: convite("etiqueta"),
    marcador: convite("marcador"),
    botao: convite("botao"),
    aEnviar: convite("aEnviar"),
    fechar: convite("fechar"),
    consentimento: convite("consentimento"),
    privacidade: convite("privacidade"),
    enviadoTitulo: convite("enviadoTitulo"),
    enviadoTexto: convite("enviadoTexto"),
    jaTitulo: convite("jaTitulo"),
    jaTexto: convite("jaTexto"),
    erroEmail: convite("erroEmail"),
    erroLimite: convite("erroLimite"),
    erroServico: convite("erroServico"),
  };

  return (
    <html lang={locale} className={fontes}>
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
          {/* Sem invólucro aqui: **cada página diz o que é.** As de leitura
              chamam `<Pagina>`, que traz a coluna legível; a inicial e a ementa
              vão de margem a margem e seriam estragadas por ela. A barra é a
              mesma em todas (`BarraSite`), mas cada página a põe onde precisa —
              a inicial, por exemplo, tem a preguiça e o motor antes dela. */}
          {children}
          {/* No layout, e não no `template`: o layout não volta a montar ao
              mudar de página, e é isso que faz os 8 segundos contarem uma vez
              por visita e não uma vez por página. */}
          <Convite locale={locale} textos={textosDoConvite} />
        </NextIntlClientProvider>
        <DadosEstruturados descricao={t("descricao")} />
      </body>
    </html>
  );
}
