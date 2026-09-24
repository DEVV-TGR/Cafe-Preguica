import { useTranslations } from "next-intl";
import { horarioDaCozinha, type DiaDaSemana } from "@/data/cafe";
import type { Locale } from "@/i18n/routing";

/**
 * "Cozinha — segunda a quinta até 00:00 · sexta e sábado até 01:00"
 *
 * A casa pediu que a hora da cozinha estivesse **escrita**, e não subentendida:
 * quem chega perto do fecho para comer tem de saber antes de se sentar. Aparece
 * onde a pessoa decide — em "Para comer", na ementa, e ao pé do horário em
 * "Onde estamos".
 *
 * Sai do `cafe.json` (`horarioDaCozinha()`), e por isso muda quando o painel
 * mudar o horário, sem ninguém ter de se lembrar desta linha.
 */
export function HorarioDaCozinha({ locale, className }: { locale: Locale; className?: string }) {
  const t = useTranslations("comum");
  const blocos = horarioDaCozinha();
  if (blocos.length === 0) return null;

  /* Em português os dias vão em minúscula a meio da frase; em inglês não. */
  const nome = (dia: DiaDaSemana) => {
    const escrito = t(`dias.${dia}`);
    return locale === "pt" ? escrito.toLocaleLowerCase("pt-PT") : escrito;
  };

  const dias = (lista: DiaDaSemana[]) =>
    lista.length === 1
      ? nome(lista[0])
      : lista.length === 2
        ? t("diasE", { a: nome(lista[0]), b: nome(lista[1]) })
        : t("diasAte", { de: nome(lista[0]), ate: nome(lista.at(-1)!) });

  return (
    <p className={className}>
      <strong>{t("cozinha")}</strong>
      {" — "}
      {blocos.map((b) => t("cozinhaBloco", { dias: dias(b.dias), hora: b.hora })).join(" · ")}
    </p>
  );
}
