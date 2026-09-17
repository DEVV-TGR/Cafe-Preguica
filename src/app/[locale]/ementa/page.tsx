import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { Pagina } from "@/components/Pagina";
import { formatarPreco } from "@/lib/preco";
import {
  porCategoria,
  CARTA_CONFIRMADA,
  temAlergeniosDeclarados,
  METADADOS,
} from "@/data/ementa";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return metadataDaPagina(locale, "ementa", "/ementa");
}

/**
 * A ementa.
 *
 * A página não sabe nada sobre a carta: pede `porCategoria()` e desenha o que
 * vier. Acrescentar uma categoria é acrescentá-la ao enum em `data/ementa.ts` e
 * ao `messages/*.json` — este ficheiro não muda.
 *
 * Os dois avisos no topo não são decoração. O da carta provisória desaparece
 * sozinho quando alguém puser `confirmada: true` no JSON; o dos alergénios
 * desaparece quando houver alergénios declarados. Enquanto lá estiverem, estão a
 * dizer a verdade sobre o estado dos dados — que é preferível a uma página que
 * parece pronta e não está.
 */
export default async function Ementa({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ementa");
  const comum = await getTranslations("comum");

  return (
    <Pagina locale={locale}>
      <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-4xl font-semibold">{t("titulo")}</h1>
        <p className="text-suave">{t("introducao")}</p>

        {!CARTA_CONFIRMADA && (
          /* `role="status"` e não `alert`: é informação sobre o estado da
             página, não uma emergência que interrompa quem usa leitor de ecrã. */
          <p
            role="status"
            className="border border-linha bg-white px-4 py-3 text-sm"
          >
            {t("avisoProvisoria")}
          </p>
        )}

        {!temAlergeniosDeclarados() && (
          <p className="border border-linha bg-white px-4 py-3 text-sm">
            {t("avisoAlergenios")}
          </p>
        )}
      </header>

      {porCategoria().map(({ categoria, artigos }) => (
        <section key={categoria} aria-labelledby={`seccao-${categoria}`}>
          <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2
              id={`seccao-${categoria}`}
              className="font-display text-2xl font-semibold"
            >
              {t(`categorias.${categoria}`)}
            </h2>

            {/* A dose é propriedade da secção, não do artigo: o gin serve-se
                todo a 5 cl e repeti-lo em onze linhas era ruído. */}
            {METADADOS[categoria]?.dose && (
              <p className="text-sm text-suave">
                {comum("dose")} {METADADOS[categoria]!.dose}
              </p>
            )}

            {/* As tostas têm dois preços, e sem estes rótulos a carta mostrava
                dois números sem dizer de quê. */}
            {METADADOS[categoria]?.colunas && (
              <p className="ms-auto text-sm text-suave tabular-nums">
                {t("colunaPreco")} · {t("colunaPrecoAlt")}
              </p>
            )}
          </header>

          <ul className="mt-4 flex flex-col gap-4">
            {artigos.map((artigo) => (
              <li key={artigo.id} className="flex justify-between gap-6">
                <div>
                  <h3 className="font-medium">{artigo.nome[locale]}</h3>
                  {artigo.descricao && (
                    <p className="text-sm text-suave">
                      {artigo.descricao[locale]}
                    </p>
                  )}
                </div>
                {/* `tabular-nums` mantém a coluna dos preços alinhada; sem isso
                    os algarismos têm larguras diferentes e a coluna dança. */}
                <p className="shrink-0 tabular-nums">
                  {artigo.preco === null
                    ? comum("precoPorConfirmar")
                    : formatarPreco(artigo.preco, locale)}
                  {/* O segundo preço só existe nas tostas — o `zod` rebenta o
                      build se aparecer noutro sítio. */}
                  {artigo.precoSecundario !== null && (
                    <>
                      {" · "}
                      {formatarPreco(artigo.precoSecundario, locale)}
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      </article>
    </Pagina>
  );
}
