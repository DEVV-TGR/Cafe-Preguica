import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { Pagina } from "@/components/Pagina";

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

  const seccoes = ["recolha", "terceiros", "alojamento", "contacto"] as const;

  return (
    <Pagina locale={locale}>
      <article className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-semibold">{t("titulo")}</h1>
      <p className="text-sm text-suave">{t("atualizado")}</p>

      {seccoes.map((chave) => (
        <section key={chave}>
          <h2 className="font-display text-xl font-semibold">
            {t(`${chave}.titulo`)}
          </h2>
          <p className="mt-2">{t(`${chave}.texto`)}</p>
        </section>
      ))}
      </article>
    </Pagina>
  );
}
