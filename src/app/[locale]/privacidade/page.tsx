import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { Aviso, Ficha, Pagina, Seccao } from "@/components/Pagina";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return metadataDaPagina(locale, "privacidade", "/privacidade");
}

/**
 * Política de privacidade.
 *
 * ⚠️ **É um rascunho e não substitui parecer jurídico.** O que aqui está é
 * verdade sobre o site tal como ele é hoje — sem formulários, sem análise, sem
 * terceiros — e é isso que a torna curta.
 *
 * **Esta página tem de ser relida no dia em que entrar um formulário**, uma
 * ferramenta de estatísticas ou um mapa embebido. Nessa altura passa a haver
 * dados de visitantes e fundamento de tratamento para declarar, e uma política
 * que diga "não recolhemos nada" passa a ser falsa. Está anotado em
 * `docs/decisoes-pendentes.md`.
 */
export default async function Privacidade({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacidade");
  const meta = await getTranslations("metadata.privacidade");

  const seccoes = ["recolha", "terceiros", "alojamento", "contacto"] as const;

  return (
    <Pagina locale={locale} olho={t("olho")} titulo={t("titulo")} intro={meta("descricao")}>
      {/* A ficha tem de dizer o mesmo que as secções. Se entrar um formulário
          ou um serviço de terceiros, mudam as duas — ver o aviso acima. */}
      <Ficha
        itens={[
          { rotulo: t("ficha.formularios"), valor: t("ficha.nenhum") },
          { rotulo: t("ficha.cookies"), valor: t("ficha.nenhum") },
          { rotulo: t("ficha.terceiros"), valor: t("ficha.nenhum") },
        ]}
      />
      <Aviso>{t("atualizado")}</Aviso>

      {seccoes.map((chave, i) => (
        <Seccao key={chave} numero={i + 1} titulo={t(`${chave}.titulo`)}>
          <p>{t(`${chave}.texto`)}</p>
        </Seccao>
      ))}
    </Pagina>
  );
}
