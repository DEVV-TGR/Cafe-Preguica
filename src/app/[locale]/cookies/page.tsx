import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { Ficha, Pagina, Seccao } from "@/components/Pagina";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return metadataDaPagina(locale, "cookies", "/cookies");
}

/**
 * Cookies — ou a ausência deles.
 *
 * Esta página só pode dizer o que diz porque o site não carrega nada de fora: as
 * fontes vêm do próprio domínio (`next/font`), não há mapa embebido, não há
 * botões de redes sociais e não há ferramenta de estatísticas. A CSP em
 * `src/lib/cabecalhos.ts` é o que mantém isso verdadeiro ao longo do tempo — um script
 * de terceiros acrescentado por distração é bloqueado pelo browser em vez de
 * passar despercebido.
 *
 * ⚠️ **Se um dia entrar um mapa, um vídeo do YouTube ou estatísticas, esta
 * página deixa de estar correta** e passa a ser preciso banner de consentimento.
 * É uma das razões pelas quais essas coisas não entram sem decisão explícita.
 *
 * O cookie da língua do `next-intl` já esteve ligado sem ninguém dar por isso —
 * está desligado em `i18n/routing.ts`, e o CI verifica que nenhuma página
 * devolve `Set-Cookie`.
 */
export default async function Cookies({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cookies");
  const meta = await getTranslations("metadata.cookies");

  const seccoes = ["uso", "lingua", "equipa", "verificar"] as const;

  return (
    <Pagina locale={locale} olho={t("olho")} titulo={t("titulo")} intro={meta("descricao")}>
      <Ficha
        itens={[
          { rotulo: t("ficha.proprios"), valor: t("ficha.zero") },
          { rotulo: t("ficha.terceiros"), valor: t("ficha.zero") },
          { rotulo: t("ficha.banner"), valor: t("ficha.naoPreciso") },
        ]}
      />

      {seccoes.map((chave, i) => (
        <Seccao key={chave} numero={i + 1} titulo={t(`${chave}.titulo`)}>
          <p>{t(`${chave}.texto`)}</p>
        </Seccao>
      ))}
    </Pagina>
  );
}
