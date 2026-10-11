"use client";

import { useMemo, useState } from "react";
import {
  estatistica,
  noiteAntes,
  type Filtro,
  type Leitura,
  type LeituraComHora,
  type UltimaLeitura,
} from "@/lib/mesas/contas";
import { Barras } from "./Barras";

/**
 * A estatística das mesas, com filtro: que mesa, e que noites.
 *
 * Pedido do Tomás (2026-10-11): ver mesas e dias em separado, e a hora de
 * cada leitura, "fácil e intuitivo para ele ver". Por isso o filtro tem duas
 * perguntas e mais nenhuma:
 *
 * - **Que noites** — esta, as últimas 7, as últimas 30, ou uma à escolha.
 * - **Que mesa** — escolhe-se a tocar no mapa das mesas, que é ao mesmo tempo
 *   a resposta a "que mesa é mais lida?". Tocar outra vez volta a todas.
 *
 * Os dados chegam todos do servidor (são poucos), e as contas fazem-se aqui, em
 * `estatistica()` de `lib/mesas/contas.ts`: mudar o filtro não faz pedidos.
 */

type Periodo = "noite" | 7 | 30 | "outra";

const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIAS_DA_SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const DIAS_POR_EXTENSO = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

const DATA_LONGA = new Intl.DateTimeFormat("pt-PT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const DIA_E_HORA = new Intl.DateTimeFormat("pt-PT", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Lisbon",
});
const UMA_CASA = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 });

const comoData = (noite: string) => new Date(`${noite}T00:00:00Z`);
const hora = (h: number) => `${String(h).padStart(2, "0")}h`;

/* As mesas impressas vão da 1 à 22; uma mais alta que apareça nas leituras
   entra no mapa também. */
const MESAS_IMPRESSAS = 22;

export function EstatisticaDasMesas({
  leituras,
  horas,
  ultimas,
  hoje,
}: {
  leituras: Leitura[];
  horas: LeituraComHora[];
  ultimas: UltimaLeitura[];
  hoje: string;
}) {
  const [periodo, setPeriodo] = useState<Periodo>(7);
  const [outraNoite, setOutraNoite] = useState(noiteAntes(hoje, 1));
  const [mesa, setMesa] = useState<number | null>(null);
  /* As últimas leituras começam curtas: 40 linhas de uma vez eram um cartão
     maior do que o ecrã, com o resto da página lá para baixo. */
  const [quantasUltimas, setQuantasUltimas] = useState(12);

  const filtro: Filtro = useMemo(
    () => ({
      mesa,
      periodo: periodo === "noite" ? { noite: hoje } : periodo === "outra" ? { noite: outraNoite } : periodo,
    }),
    [mesa, periodo, outraNoite, hoje],
  );
  const e = useMemo(
    () => estatistica({ leituras, horas, ultimas }, filtro, hoje),
    [leituras, horas, ultimas, filtro, hoje],
  );

  const umaNoite = typeof filtro.periodo === "object";
  const totalDeMesas = Math.max(MESAS_IMPRESSAS, ...leituras.map((l) => l.mesa));
  const maisLida = Math.max(0, ...e.porMesa.values());
  const horaDePonta = e.porHora.reduce((a, b) => (b.total > a.total ? b : a), { hora: -1, total: 0 });
  const mesaDePonta = [...e.porMesa.entries()].reduce((a, b) => (b[1] > a[1] ? b : a), [0, 0]);

  const nomeDoPeriodo = umaNoite
    ? DATA_LONGA.format(comoData((filtro.periodo as { noite: string }).noite))
    : `últimas ${filtro.periodo} noites`;

  return (
    <div className="pn-pilha-larga">
      {/* ------------------------------------------------------- o filtro */}
      <div className="pn-filtro">
        <div className="pn-abas" role="group" aria-label="Que noites">
          {(
            [
              ["noite", "Esta noite"],
              [7, "7 noites"],
              [30, "30 noites"],
              ["outra", "Uma noite"],
            ] as const
          ).map(([valor, nome]) => (
            <button
              key={nome}
              type="button"
              className="pn-abas__uma"
              aria-pressed={periodo === valor}
              onClick={() => setPeriodo(valor)}
            >
              {nome}
            </button>
          ))}
        </div>

        {periodo === "outra" ? (
          <label className="pn-filtro__data">
            <span className="pn-so-leitor">Que noite</span>
            <input
              type="date"
              className="pn-entrada"
              value={outraNoite}
              max={hoje}
              onChange={(ev) => ev.target.value && setOutraNoite(ev.target.value)}
            />
          </label>
        ) : null}

        <p className="pn-filtro__resumo" role="status">
          {mesa === null ? "Todas as mesas" : `Mesa ${mesa}`} · {nomeDoPeriodo} ·{" "}
          <strong className="pn-forte">{e.total}</strong> {e.total === 1 ? "leitura" : "leituras"}
          {mesa !== null ? (
            <button type="button" className="pn-ligacao pn-filtro__limpar" onClick={() => setMesa(null)}>
              ver todas as mesas
            </button>
          ) : null}
        </p>
      </div>

      <div className="pn-mesas">
        {/* ------------------------------------------------- o mapa das mesas */}
        <section className="pn-bloco pn-mesas__mapa" aria-labelledby="mapa-das-mesas">
          <h2 id="mapa-das-mesas" className="pn-bloco__titulo">
            Mapa das mesas
          </h2>
          <p className="pn-bloco__sub">
            Mais dourada, mais lida. Toca numa mesa para ver só essa.
            {mesaDePonta[1] > 0 ? ` A mais lida é a ${mesaDePonta[0]}.` : ""}
          </p>
          <div className="pn-mapa">
            {Array.from({ length: totalDeMesas }, (_, i) => i + 1).map((n) => {
              const total = e.porMesa.get(n) ?? 0;
              return (
                <button
                  key={n}
                  type="button"
                  className="pn-mapa__mesa"
                  aria-pressed={mesa === n}
                  aria-label={`Mesa ${n}: ${total} ${total === 1 ? "leitura" : "leituras"}`}
                  /* Uma mesa lida uma vez já se distingue de uma sem leituras:
                     a força começa nos 0,15, e só a vazia fica a zero. */
                  style={{ "--forca": total ? 0.15 + 0.85 * (total / maisLida) : 0 } as React.CSSProperties}
                  onClick={() => setMesa(mesa === n ? null : n)}
                >
                  <span className="pn-mapa__numero">{n}</span>
                  <span className="pn-mapa__total">{total}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ---------------------------------------------------- por hora */}
        <section className="pn-bloco pn-mesas__horas" aria-labelledby="a-que-horas">
          <h2 id="a-que-horas" className="pn-bloco__titulo">
            A que horas
          </h2>
          <p className="pn-bloco__sub">
            {horaDePonta.total > 0
              ? `A hora mais forte é a das ${hora(horaDePonta.hora)}.`
              : e.horasDesde === null
                ? "As horas começam a contar a partir de hoje — as leituras de antes só têm o dia."
                : `As horas contam desde ${DATA_LONGA.format(comoData(e.horasDesde))}.`}
          </p>
          <p className="pn-so-leitor">
            {e.porHora.map((h) => `${hora(h.hora)}: ${h.total}`).join(", ")}
          </p>
          <Barras
            denso={e.porHora.length > 12}
            barras={e.porHora.map((h) => ({
              chave: String(h.hora),
              etiqueta: hora(h.hora),
              valor: h.total,
              titulo: `Das ${hora(h.hora)}: ${h.total}`,
            }))}
          />
        </section>

        {/* ------------------------------------------------ noite a noite */}
        {!umaNoite ? (
          <section className="pn-bloco pn-mesas__noites" aria-labelledby="noite-a-noite">
            <h2 id="noite-a-noite" className="pn-bloco__titulo">
              Noite a noite
            </h2>
            <p className="pn-bloco__sub">Cada barra é uma noite, das 06:00 às 06:00.</p>
            <p className="pn-so-leitor">
              {e.porNoite.map((n) => `${DATA_LONGA.format(comoData(n.noite))}: ${n.total}`).join(", ")}
            </p>
            <Barras
              denso={e.porNoite.length > 14}
              barras={e.porNoite.map((n) => ({
                chave: n.noite,
                etiqueta:
                  e.porNoite.length > 7
                    ? n.noite.slice(8)
                    : DIAS_CURTOS[comoData(n.noite).getUTCDay()],
                valor: n.total,
                titulo: `${DATA_LONGA.format(comoData(n.noite))}: ${n.total}`,
              }))}
            />
          </section>
        ) : null}

        {/* -------------------------------------------- dia da semana */}
        {!umaNoite ? (
          <section className="pn-bloco pn-mesas__semana" aria-labelledby="dia-da-semana">
            <h2 id="dia-da-semana" className="pn-bloco__titulo">
              Dia da semana
            </h2>
            <p className="pn-bloco__sub">A média de leituras de cada dia, nas noites escolhidas.</p>
            <p className="pn-so-leitor">
              {e.porDiaDaSemana
                .map((d) => `${DIAS_POR_EXTENSO[d.dia]}: ${UMA_CASA.format(d.media)}`)
                .join(", ")}
            </p>
            <Barras
              barras={e.porDiaDaSemana.map((d) => ({
                chave: String(d.dia),
                etiqueta: DIAS_DA_SEMANA[d.dia],
                valor: Math.round(d.media * 10) / 10,
                titulo: `${DIAS_POR_EXTENSO[d.dia]}: ${UMA_CASA.format(d.media)} em média`,
              }))}
            />
          </section>
        ) : null}

        {/* ------------------------------------------- últimas leituras */}
        <section className="pn-bloco pn-mesas__ultimas" aria-labelledby="ultimas-leituras">
          <h2 id="ultimas-leituras" className="pn-bloco__titulo">
            Últimas leituras
          </h2>
          <p className="pn-bloco__sub">Com o dia e a hora certos, da mais recente para trás.</p>
          {e.ultimas.length === 0 ? (
            <p className="pn-texto-suave">
              {ultimas.length === 0
                ? "Ainda não há leituras com hora — começam a aparecer a partir de hoje."
                : "Nenhuma leitura com hora nestas noites."}
            </p>
          ) : (
            <ul className="pn-lista">
              {e.ultimas.slice(0, quantasUltimas).map((u, i) => (
                <li key={`${u.quando}-${i}`} className="pn-lista__linha">
                  <span className="pn-lista__principal">{DIA_E_HORA.format(u.quando)}</span>
                  <button
                    type="button"
                    className="pn-ligacao pn-lista__lado"
                    onClick={() => setMesa(u.mesa)}
                  >
                    Mesa {u.mesa}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {e.ultimas.length > quantasUltimas ? (
            <button
              type="button"
              className="pn-ligacao pn-accao--sozinha"
              onClick={() => setQuantasUltimas((n) => n + 24)}
            >
              Mostrar mais ({e.ultimas.length - quantasUltimas})
            </button>
          ) : null}
        </section>
      </div>
    </div>
  );
}
