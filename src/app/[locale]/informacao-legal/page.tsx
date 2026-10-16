import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { metadataDaPagina } from "@/lib/metadata";
import { URL_LIVRO_RECLAMACOES, URL_PORTAL_CONSUMIDOR } from "@/lib/site";
import { cafe, pendenciasLegais } from "@/data/cafe";
import { Aviso, Pagina, Seccao } from "@/components/Pagina";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return metadataDaPagina(locale, "informacaoLegal", "/informacao-legal");
}

/*
  O que falta confirmar aparece no registo do build, uma vez por processo — é
  onde quem publica olha. Não parte o build: o site pode ir para o ar com a
  pendência à vista na página, mas ninguém a pode dar por fechada sem a ver.
*/
let avisou = false;
function avisarPendencias() {
  if (avisou) return;
  avisou = true;
  const pendentes = pendenciasLegais();
  if (pendentes.length) {
    console.warn(
      `\n[informação legal] por confirmar antes de fechar as páginas legais:\n${pendentes
        .map((p) => `  · ${p}`)
        .join("\n")}\nVer docs/decisoes-pendentes.md.\n`,
    );
  }
}

/**
 * Informação legal: quem explora a casa, a resolução de litígios e o Livro de
 * Reclamações.
 *
 * ## Quem explora a casa
 *
 * O DL 7/2004 (art. 10.º) pede a quem tem um site de uma atividade económica
 * o nome ou a firma, o endereço, o NIF e os registos públicos — com ou sem
 * vendas online. Vem de `cafe.operador`, e com `null` a página diz que está
 * por publicar (revisão legal de 2026-10-15). **O nome comercial não serve no
 * lugar disto.**
 *
 * ## A resolução de litígios
 *
 * A Lei 144/2015 (art. 18.º) manda indicar as entidades de resolução
 * alternativa de litígios **disponíveis** — não só aquelas a que a casa
 * tenha aderido —, e não depende de vender pelo site. A entidade vem de
 * `cafe.litigios`. A página diz que é a **competente para a zona**, e só diz
 * que a casa aderiu se `adesao` for `true`.
 *
 * Com `litigios: null` a secção **não desaparece**: diz que a entidade está
 * por confirmar e aponta para a lista oficial. Já desapareceu em silêncio, e
 * o que é obrigatório não pode sumir por um campo estar vazio.
 *
 * A antiga plataforma europeia de resolução de litígios em linha (ODR/RLL)
 * fechou em 2025 (Regulamento (UE) 2024/3228) e **não se liga**: os modelos
 * de texto antigos ainda a trazem.
 */
export default async function InformacaoLegal({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  avisarPendencias();
  const t = await getTranslations("informacaoLegal");
  const formas = await getTranslations("privacidade.formas");
  const meta = await getTranslations("metadata.informacaoLegal");

  const externo = (url: string) =>
    function Ligacao(texto: React.ReactNode) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {texto} <span aria-hidden="true">↗</span>
        </a>
      );
    };
  const contactos = (texto: React.ReactNode) => <Link href="/contactos">{texto}</Link>;
  const operador = cafe.operador;
  const litigios = cafe.litigios;

  return (
    <Pagina locale={locale} olho={t("olho")} titulo={t("titulo")} intro={meta("descricao")} larga>
      <Seccao numero={1} titulo={t("identificacao.titulo")}>
        {operador ? (
          <>
            <p>
              {t("identificacao.texto", {
                nome: operador.nome,
                forma: formas(operador.forma),
                nif: operador.nif,
                sede: operador.sede,
              })}
            </p>
            {operador.registo && operador.capitalSocial ? (
              <p>
                {t("identificacao.registo", {
                  registo: operador.registo,
                  capital: operador.capitalSocial,
                })}
              </p>
            ) : null}
          </>
        ) : (
          <Aviso>{t("pendente")}</Aviso>
        )}
        <p>{t.rich("identificacao.contactos", { contactos })}</p>
      </Seccao>

      <Seccao numero={2} titulo={t("litigios.titulo")}>
        {litigios ? (
          <>
            <p>
              {t.rich("litigios.texto", {
                nome: litigios.nome,
                entidade: externo(litigios.url),
                portal: externo(URL_PORTAL_CONSUMIDOR),
              })}
              {litigios.adesao ? ` ${t("litigios.adesao")}` : null}
            </p>
            <p>{t("litigios.reduzidoValor")}</p>
          </>
        ) : (
          <Aviso>{t.rich("litigios.pendente", { portal: externo(URL_PORTAL_CONSUMIDOR) })}</Aviso>
        )}
      </Seccao>

      <Seccao numero={3} titulo={t("reclamacoes.titulo")}>
        <p>{t.rich("reclamacoes.texto", { livro: externo(URL_LIVRO_RECLAMACOES) })}</p>
      </Seccao>
    </Pagina>
  );
}
