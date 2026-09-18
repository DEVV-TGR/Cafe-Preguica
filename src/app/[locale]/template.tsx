import { Progresso } from "@/components/Progresso";
import { Transicao } from "@/components/Transicao";

/**
 * O `template` e não o layout, de propósito: o Next monta-o de novo a cada
 * mudança de página, e é isso que faz a transição repetir. No layout ela só
 * aparecia na primeira abertura. Ver `components/Transicao.tsx`.
 *
 * A linha de progresso vive aqui pela mesma razão: cada página começa com uma
 * linha nova, a zero, sem ter de ouvir mudanças de rota.
 */
export default function Modelo({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Transicao />
      <Progresso />
      {children}
    </>
  );
}
