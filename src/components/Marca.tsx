import { useTranslations } from "next-intl";

/**
 * O nome da casa, em texto.
 *
 * ⚠️ É texto e não imagem porque **ainda não há logótipo**. Quando chegar — de
 * preferência em vetor, ver o README — troca-se aqui e muda em todo o lado: no
 * cabeçalho, no rodapé e na página de erro.
 */
export function Marca({ className }: { className?: string }) {
  const t = useTranslations("marca");
  return <span className={className}>{t("nome")}</span>;
}
