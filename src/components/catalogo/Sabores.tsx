"use client";

import { useState } from "react";
import { SABORES } from "@/data/ementa";

/**
 * O selector de sabores do Cocktail Preguiça e do Unicórnio.
 *
 * É o único sítio da página que responde ao **ponteiro** em vez da rolagem, e
 * é de propósito: depois de cinco actos em que a página se move sozinha, um
 * que só se mexe quando a pessoa lhe toca muda o registo. No `BRIEF.md` este
 * acto chama-se *posse* — deixa de ser uma montra.
 *
 * ⚠️ **Os catorze sabores não são catorze artigos da ementa.** São uma lista
 * própria em `src/data/ementa.ts`, partilhada pelos dois cocktails, porque é
 * assim que a casa os vende: escolhe-se o copo e depois o sabor. Repeti-los
 * como artigos dava vinte e oito entradas na carta para duas bebidas.
 *
 * Botões a sério, com `aria-pressed`, e não `div`s com `onClick`: isto navega-se
 * com o teclado e anuncia-se num leitor de ecrã sem trabalho nenhum.
 */
export function Sabores({
  etiquetas,
  inicial,
}: {
  /** O nome de cada sabor na língua da página, pela ordem de `SABORES`. */
  etiquetas: Record<string, string>;
  /** Qual vem escolhido de início. Nunca nenhum: um ecrã vazio não explica nada. */
  inicial: string;
}) {
  const [escolhido, setEscolhido] = useState(inicial);

  return (
    <div className="flex flex-col gap-6">
      {/* `aria-live="polite"` porque o nome grande muda sem a página navegar:
          sem isto, quem usa leitor de ecrã carrega no botão e não ouve nada. */}
      <p className="pg-sabor-escolhido" aria-live="polite">
        {etiquetas[escolhido]}
      </p>

      <div className="pg-sabores">
        {SABORES.map((sabor) => (
          <button
            key={sabor}
            type="button"
            className="pg-sabor"
            aria-pressed={sabor === escolhido}
            onClick={() => setEscolhido(sabor)}
          >
            {etiquetas[sabor]}
          </button>
        ))}
      </div>
    </div>
  );
}
