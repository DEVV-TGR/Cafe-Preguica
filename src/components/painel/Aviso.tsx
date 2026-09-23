import type { ReactNode } from "react";

/**
 * Uma faixa de aviso — o erro da entrada, o conflito de gravação, a confirmação
 * de que o commit foi feito. Três tons e mais nenhum; o "mau" usa o ouro claro
 * com a borda a marcar o tom, porque um vermelho sobre este castanho não passa
 * o contraste AA em texto pequeno.
 */
export function Aviso({
  tom = "nota",
  children,
}: {
  tom?: "mau" | "bom" | "nota";
  children: ReactNode;
}) {
  return (
    <div role={tom === "mau" ? "alert" : "status"} className={`pn-aviso pn-aviso--${tom}`}>
      {children}
    </div>
  );
}
