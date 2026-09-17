import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * O 404 de dentro do site: já se sabe o idioma, por isso o texto vem das
 * mensagens e o visitante fica com o cabeçalho e o rodapé à volta.
 */
export default function NaoEncontrada() {
  const t = useTranslations("naoEncontrada");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-semibold">{t("titulo")}</h1>
      <p>{t("texto")}</p>
      <p>
        <Link href="/" className="underline">
          {t("voltar")}
        </Link>
      </p>
    </div>
  );
}
