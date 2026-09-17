import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return metadataDaPagina(locale, "inicio", "/");
}

/**
 * A página de entrada, reduzida ao osso: um `h1`, uma frase e os dois caminhos
 * que interessam a quem chega — ver o que se come e saber onde é.
 *
 * **Não há desenho aqui de propósito.** É a estrutura à vista, para se discutir
 * o que a página diz antes de se discutir como ela se parece.
 */
export default async function Inicio({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("inicio");

  return (
    <article className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-semibold">{t("titulo")}</h1>
      <p className="text-suave">{t("subtitulo")}</p>
      <nav className="flex gap-4">
        <Link href="/ementa" className="underline">
          {t("verEmenta")}
        </Link>
        <Link href="/contactos" className="underline">
          {t("verContactos")}
        </Link>
      </nav>
    </article>
  );
}
