import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Marca } from "./Marca";
import { MudarIdioma } from "./MudarIdioma";

/**
 * A navegação do site.
 *
 * As rotas estão escritas à mão aqui, e não geradas a partir de
 * `ROTAS_FIXAS` em `lib/site.ts`, porque as duas listas respondem a perguntas
 * diferentes: aquela é "o que o Google deve indexar" e inclui a privacidade e os
 * cookies; esta é "o que o visitante precisa de ver no topo", e essas duas
 * páginas vivem no rodapé. Juntá-las obrigava a marcar exceções em ambos os
 * sítios.
 */
export function Cabecalho({ locale }: { locale: Locale }) {
  const t = useTranslations("nav");

  const paginas = [
    { href: "/", etiqueta: t("inicio") },
    { href: "/ementa", etiqueta: t("ementa") },
    { href: "/sobre", etiqueta: t("sobre") },
    { href: "/contactos", etiqueta: t("contactos") },
  ] as const;

  return (
    <header className="border-b border-linha">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4">
        <Link href="/" className="font-display text-lg font-semibold">
          <Marca />
        </Link>
        {/* `nav` com nome acessível: um leitor de ecrã que liste as regiões da
            página precisa de distinguir esta da navegação do rodapé. */}
        <nav aria-label={t("inicio")} className="flex flex-wrap gap-4 text-sm">
          {paginas.map((pagina) => (
            <Link key={pagina.href} href={pagina.href} className="hover:underline">
              {pagina.etiqueta}
            </Link>
          ))}
        </nav>
        <div className="ms-auto text-sm">
          <MudarIdioma locale={locale} etiqueta={t("mudarIdioma")} />
        </div>
      </div>
    </header>
  );
}
