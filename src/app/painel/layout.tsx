import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { fontes } from "../fontes";
import "../globals.css";
import "../site.css";
import "./painel.css";

/**
 * O painel da casa — o segundo documento HTML deste projeto.
 *
 * ## Porque é que este ficheiro tem `<html>` e `<body>`
 *
 * Porque é um layout de raiz, e não por acidente. Não existe `app/layout.tsx`:
 * o do site vive debaixo de `[locale]`, e qualquer layout sem outro por cima é
 * raiz. O Next chama-lhe *multiple root layouts*. Efeito colateral: passar do
 * site para o painel é um carregamento completo, e é o que se quer — são duas
 * coisas diferentes.
 *
 * ## Só em português
 *
 * O site fala duas línguas porque metade de quem o abre está de passagem. O
 * painel é para quem trabalha na casa, e por isso os textos estão nos
 * componentes e não em `messages/`.
 *
 * ## Este layout NÃO verifica a sessão
 *
 * E é deliberado: um layout não volta a renderizar em navegação do lado do
 * cliente e não impede um segmento filho de correr. Quem protege é o
 * `exigirSessao()` de `src/lib/painel/porta.ts`, dentro de **cada** `page.tsx`
 * e à cabeça de **cada** server action.
 */
export const metadata: Metadata = {
  title: "Painel · Café Preguiça",
  /* Uma de três camadas, e a mais fraca. As outras são o `disallow` do
     `robots.ts` e o `X-Robots-Tag` de `src/lib/cabecalhos.ts`. */
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = { themeColor: "#0b0806" };

export default function LayoutDoPainel({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-PT" className={fontes}>
      <body className="pn-corpo">{children}</body>
    </html>
  );
}
