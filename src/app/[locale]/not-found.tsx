import { useLocale, useTranslations } from "next-intl";
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

  /* Sem botão próprio: o fecho da `Pagina` já leva ao início e à ementa. */
  return <Pagina locale={locale} olho={t("olho")} titulo={t("titulo")} intro={t("texto")} />;
}
