import { BarraSite } from "@/components/BarraSite";
import { Rodape } from "@/components/Rodape";
import type { Locale } from "@/i18n/routing";

/**
 * O invólucro das páginas de leitura: a barra do site, uma coluna de largura
 * legível, e rodapé.
 *
 * ⚠️ **A inicial e a ementa não usam isto, e é de propósito.** Têm secções
 * que vão de margem a margem, e aqui ficavam com as fotografias presas a 48rem.
 * A barra, essa, é a mesma nas três — `BarraSite` — e é aí que se muda.
 *
 * Por isso o `layout.tsx` não embrulha nada: cada página diz o que é. As de
 * leitura chamam este componente; a inicial e a ementa tratam de si.
 */
export function Pagina({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <>
      <BarraSite locale={locale} />
      <main id="conteudo" className="mx-auto max-w-3xl px-4 py-10">
        {children}
      </main>
      <Rodape />
    </>
  );
}
