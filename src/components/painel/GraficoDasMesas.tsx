"use client";

import { useState } from "react";
import { Barras } from "./Barras";

/**
 * As leituras das mesas, noite a noite, em barras — o cartão grande do meio do
 * quadro.
 *
 * As barras são riscadas, e a melhor noite do período é cheia, com o número
 * por cima: é a primeira coisa que se quer saber ("quando é que leram mais?"),
 * e assim lê-se sem ler os números todos. De cliente só por causa do seletor
 * de 7 ou 14 noites; os dados chegam já contados do servidor.
 */

/* Três letras à mão: o `weekday: "short"` do pt-PT dá "segunda", por extenso,
   e catorze dias por extenso não cabem num telemóvel. */
const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DATA = new Intl.DateTimeFormat("pt-PT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/* A noite é uma data sem hora (`2026-10-11`); em UTC para o dia da semana não
   escorregar — a mesma conta da página das Mesas. */
const comoData = (noite: string) => new Date(`${noite}T00:00:00Z`);
const diaCurto = (noite: string) => DIAS_CURTOS[comoData(noite).getUTCDay()];

const PERIODOS = [7, 14] as const;

export function GraficoDasMesas({ porNoite }: { porNoite: { noite: string; total: number }[] }) {
  const [noites, setNoites] = useState<(typeof PERIODOS)[number]>(7);

  /* Do servidor vêm da mais recente para trás; o gráfico lê-se da esquerda
     para a direita, com hoje no fim. */
  const barras = porNoite.slice(0, noites).reverse();
  const maior = Math.max(0, ...barras.map((b) => b.total));
  const melhor = maior > 0 ? barras.findLastIndex((b) => b.total === maior) : -1;
  const total = barras.reduce((soma, b) => soma + b.total, 0);

  return (
    <div className="pn-grafico">
      <div className="pn-alternar" role="group" aria-label="Período do gráfico">
        {PERIODOS.map((p) => (
          <button
            key={p}
            type="button"
            className="pn-alternar__um"
            aria-pressed={noites === p}
            onClick={() => setNoites(p)}
          >
            {p} noites
          </button>
        ))}
      </div>

      {/* Para o leitor de ecrã, o gráfico em palavras. */}
      <p className="pn-so-leitor">
        {total} leituras nas últimas {noites} noites
        {melhor >= 0 ? `; a melhor foi ${DATA.format(comoData(barras[melhor].noite))}, com ${maior}.` : "."}
      </p>

      <Barras
        denso={noites === 14}
        barras={barras.map((b) => ({
          chave: b.noite,
          etiqueta: diaCurto(b.noite),
          valor: b.total,
          titulo: `${DATA.format(comoData(b.noite))}: ${b.total}`,
        }))}
      />

      {total === 0 ? (
        <p className="pn-nota pn-centro">Ainda ninguém abriu a carta por uma mesa nestas noites.</p>
      ) : null}
    </div>
  );
}
