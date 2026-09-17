import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import type { Locale } from "@/i18n/routing";

/**
 * O invólucro das páginas de leitura: cabeçalho do site, uma coluna de largura
 * legível, e rodapé.
 *
 * ⚠️ **A página inicial não usa isto, e é de propósito.** Ela é um catálogo que
 * se percorre de lado, com a sua própria navegação — um índice dos objectos da
 * colecção, que salta para eles — e com secções que vão de margem a margem. Se
 * herdasse este invólucro ficava com duas barras no topo, uma por cima da
 * outra, e com as fotografias presas a 48rem.
 *
 * Por isso o `layout.tsx` não embrulha nada: cada página diz o que é. As de
 * leitura chamam este componente; a inicial trata de si.
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
      <Cabecalho locale={locale} />
      <main id="conteudo" className="mx-auto max-w-3xl px-4 py-10">
        {children}
      </main>
      <Rodape />
    </>
  );
}
