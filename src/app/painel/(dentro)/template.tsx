import type { ReactNode } from "react";

/**
 * O `template`, e não o layout, porque o Next o monta de novo a cada mudança
 * de secção — e é isso que faz a secção nova entrar com um desvanecer curto,
 * em vez de aparecer de repente. O topo, que está no layout, não se mexe.
 */
export default function ModeloDeDentro({ children }: { children: ReactNode }) {
  return <div className="pn-entra">{children}</div>;
}
