import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";

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
 * `next.config.ts` é o que mantém isso verdadeiro ao longo do tempo — um script
 * de terceiros acrescentado por distração é bloqueado pelo browser em vez de
 * passar despercebido.
 *
 * ⚠️ **Se um dia entrar um mapa, um vídeo do YouTube ou estatísticas, esta
 * página deixa de estar correta** e passa a ser preciso banner de consentimento.
 * É uma das razões pelas quais essas coisas não entram sem decisão explícita.
 */
export default async function Cookies({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cookies");

  return (
    <article className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-semibold">{t("titulo")}</h1>
      <p>{t("texto")}</p>
      <p className="text-suave">{t("verificar")}</p>
    </article>
  );
}
