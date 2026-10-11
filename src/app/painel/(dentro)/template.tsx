import type { ReactNode } from "react";
import { Transicao } from "@/components/Transicao";

/**
 * O `template`, e não o layout, porque o Next o monta de novo a cada mudança
 * de secção — e é isso que faz a transição repetir, como no site
 * (`app/[locale]/template.tsx`). Aqui é a curta: o ramo e a preguiça em pouco
 * mais de meio segundo, por baixo do topo, que está no layout e não se mexe.
 */
export default function ModeloDeDentro({ children }: { children: ReactNode }) {
  return (
    <>
      <Transicao curta />
      <div className="pn-entra">{children}</div>
    </>
  );
}
