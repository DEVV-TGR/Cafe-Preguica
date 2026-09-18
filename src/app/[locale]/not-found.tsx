import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Pagina } from "@/components/Pagina";
import type { Locale } from "@/i18n/routing";

/**
 * O 404 de dentro do site: já se sabe o idioma, por isso o texto vem das
 * mensagens e o visitante fica com o cabeçalho e o rodapé à volta.
 *
 * O idioma vem do `useLocale` e não de `params` porque uma página de erro não
 * recebe parâmetros de rota — é renderizada no sítio onde o erro aconteceu.
 */
export default function NaoEncontrada() {
  const t = useTranslations("naoEncontrada");
  const locale = useLocale() as Locale;

  return (
    <Pagina locale={locale}>
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-4xl font-semibold">{t("titulo")}</h1>
        <p>{t("texto")}</p>
        <p>
          <Link href="/" className="underline">
            {t("voltar")}
          </Link>
        </p>
      </div>
    </Pagina>
  );
}
