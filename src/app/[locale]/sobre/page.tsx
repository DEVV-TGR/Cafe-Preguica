import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { Aviso, Pagina } from "@/components/Pagina";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return metadataDaPagina(locale, "sobre", "/sobre");
}

/**
 * A casa.
 *
 * Fica de propósito com uma frase só: é a página que depende inteiramente da
 * conversa com o cliente — o que a casa é, desde quando, o que a distingue. Não
 * se escreve à frente disso, porque texto inventado sobre um negócio real é o
 * tipo de coisa que passa despercebida até alguém da família a ler.
 */
export default async function Sobre({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sobre");
  const comum = await getTranslations("comum");

  return (
    <Pagina locale={locale} olho={comum("olhoCasa")} titulo={t("titulo")}>
      <Aviso>{t("porEscrever")}</Aviso>
    </Pagina>
  );
}
