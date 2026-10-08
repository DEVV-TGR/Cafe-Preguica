import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { URL_SITE, caminhoLocalizado, urlLocalizado } from "./site";

/**
 * Monta as metadata de uma página a partir das mensagens, e trata sozinho da
 * parte que é sempre igual e sempre esquecida: o `metadataBase` (sem ele as
 * imagens de partilha saem com caminho relativo e nenhuma rede as resolve) e os
 * `alternates.languages`, que são o que diz ao Google que `/ementa` e
 * `/en/ementa` são a mesma página em duas línguas — e não conteúdo duplicado a
 * competir consigo próprio.
 *
 * `chave` aponta para `metadata.<chave>.{titulo,descricao}` nas mensagens.
 *
 * O `x-default` diz ao Google qual das duas servir a quem não é de nenhuma —
 * a portuguesa, que é também a que abre sem prefixo.
 *
 * A imagem de partilha é a fachada (`public/partilha.jpg`, feita por
 * `scripts/desenhar-partilha.mjs`), com o mesmo texto alternativo do herói.
 * Vai aqui e não num `opengraph-image` por pasta: o `openGraph` de uma página
 * substitui o do layout inteiro, e todas as páginas passam por esta função.
 */
const IMAGEM_DE_PARTILHA = { url: "/partilha.jpg", width: 1200, height: 630 };

export async function metadataDaPagina(
  locale: Locale,
  chave: string,
  rota: string,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: `metadata.${chave}` });
  const marca = await getTranslations({ locale, namespace: "marca" });
  const heroi = await getTranslations({ locale, namespace: "inicio.heroi" });
  const imagem = { ...IMAGEM_DE_PARTILHA, alt: heroi("alt") };

  const titulo = t("titulo");
  const descricao = t("descricao");

  return {
    metadataBase: new URL(URL_SITE),
    title: titulo,
    description: descricao,
    alternates: {
      canonical: caminhoLocalizado(rota, locale),
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, caminhoLocalizado(rota, l)])),
        "x-default": caminhoLocalizado(rota, routing.defaultLocale),
      },
    },
    openGraph: {
      type: "website",
      siteName: marca("nome"),
      title: titulo,
      description: descricao,
      url: urlLocalizado(rota, locale),
      locale: locale === "pt" ? "pt_PT" : "en_GB",
      images: [imagem],
    },
    twitter: { card: "summary_large_image", images: [imagem] },
  };
}
