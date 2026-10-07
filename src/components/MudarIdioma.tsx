"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/**
 * O seletor de idioma.
 *
 * É de cliente por uma razão só: precisa do caminho atual para trocar de língua
 * **sem perder a página**. Um link fixo para `/en` mandava quem está na ementa
 * para a homepage inglesa, que é a forma mais rápida de alguém desistir de
 * mudar de idioma.
 *
 * O `usePathname` do `@/i18n/navigation` devolve o caminho **já sem o prefixo de
 * idioma** — é por isso que se usa este e não o do `next/navigation`, que
 * devolveria `/en/ementa` e duplicaria o prefixo no link.
 *
 * Leva também o `#capítulo` em que se está: quem lia os cocktails na ementa e
 * mudou para inglês ia parar ao topo da carta inglesa. O `#` só existe no
 * browser, e por isso é lido como uma loja externa — vazio no HTML estático e
 * na hidratação, o do endereço depois.
 */
const ouvirAncora = (avisar: () => void) => {
  window.addEventListener("hashchange", avisar);
  return () => window.removeEventListener("hashchange", avisar);
};
const ancora = () => window.location.hash;
const semAncora = () => "";

export function MudarIdioma({
  locale,
  etiqueta,
  curta,
}: {
  locale: Locale;
  etiqueta: string;
  /** "EN" / "PT" para o telemóvel. O nome acessível continua a ser a
      `etiqueta` inteira: um leitor de ecrã a dizer "E N" não ajuda ninguém. */
  curta: string;
}) {
  const caminho = usePathname();
  const hash = useSyncExternalStore(ouvirAncora, ancora, semAncora);
  const outro = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  return (
    <Link
      href={`${caminho}${hash}`}
      locale={outro}
      hrefLang={outro}
      aria-label={etiqueta}
    >
      <span className="pg-barra__curto">{curta}</span>
      <span className="pg-barra__longo">{etiqueta}</span>
    </Link>
  );
}
