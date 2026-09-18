import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { URL_LIVRO_RECLAMACOES, URL_PORTAL_CONSUMIDOR } from "@/lib/site";
import { cafe } from "@/data/cafe";
import { Pagina, Seccao } from "@/components/Pagina";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return metadataDaPagina(locale, "informacaoLegal", "/informacao-legal");
}

/**
 * Resolução de litígios — o que a lei manda dizer a quem compra.
 *
 * Existe porque é obrigatório (Lei 144/2015, art. 18.º): quem vende a
 * consumidores e tem site indica lá o centro de arbitragem a que o cliente pode
 * recorrer. Esteve primeiro numa linha do rodapé, e pesava demais; ficou o link
 * no rodapé e o texto aqui.
 *
 * A entidade vem de `cafe.litigios` e não está escrita aqui — é um facto da
 * casa, e muda se ela aderir a outro centro. Com `null` a secção desaparece e
 * fica só o Livro de Reclamações, para a página nunca dar 404 (está no sitemap).
 */
export default async function InformacaoLegal({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("informacaoLegal");
  const meta = await getTranslations("metadata.informacaoLegal");

  const externo = (url: string) =>
    function Ligacao(texto: React.ReactNode) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {texto} <span aria-hidden="true">↗</span>
        </a>
      );
    };

  const seccoes = [
    cafe.litigios && {
      chave: "litigios",
      texto: t.rich("litigios.texto", {
        nome: cafe.litigios.nome,
        entidade: externo(cafe.litigios.url),
        portal: externo(URL_PORTAL_CONSUMIDOR),
      }),
    },
    {
      chave: "reclamacoes",
      texto: t.rich("reclamacoes.texto", { livro: externo(URL_LIVRO_RECLAMACOES) }),
    },
  ].filter((s) => !!s);

  return (
    <Pagina locale={locale} olho={t("olho")} titulo={t("titulo")} intro={meta("descricao")}>
      {seccoes.map(({ chave, texto }, i) => (
        <Seccao key={chave} numero={i + 1} titulo={t(`${chave}.titulo`)}>
          <p>{texto}</p>
        </Seccao>
      ))}
    </Pagina>
  );
}
