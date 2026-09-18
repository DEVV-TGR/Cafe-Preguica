import { Transicao } from "@/components/Transicao";

/**
 * O `template` e não o layout, de propósito: o Next monta-o de novo a cada
 * mudança de página, e é isso que faz a transição repetir. No layout ela só
 * aparecia na primeira abertura. Ver `components/Transicao.tsx`.
 */
export default function Modelo({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Transicao />
      {children}
    </>
  );
}
