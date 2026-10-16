"use client";

import { useMemo, useState, useTransition } from "react";
import {
  apagarContactoDeVez,
  cancelarInscricao,
  type EstadoDoApagamento,
  type EstadoDoCancelamento,
} from "@/app/painel/(dentro)/newsletter/accoes";
import { Aviso } from "./Aviso";

/**
 * Quem está inscrito — com uma procura, um botão para descarregar a lista, e
 * em cada contacto duas acções que não são a mesma coisa:
 *
 * - **Cancelar** (só a quem está inscrito): deixa de receber, fica na lista
 *   como "cancelou", e a pessoa recebe um email a dizê-lo (`cancelarInscricao`).
 * - **Apagar de vez**: para um pedido de apagamento. Tira o contacto do Resend
 *   e a prova do consentimento, e não manda nada (`apagarContactoDeVez`).
 *
 * A data de cada linha é a da última confirmação, da prova do consentimento;
 * quem se inscreveu antes de a prova existir não a tem.
 *
 * O CSV serve para o dia em que a newsletter passar da conta da agência para a
 * conta do Rafael: os contactos não passam sozinhos de uma conta do Resend para
 * a outra, e este ficheiro é o que se importa do lado de lá. É gerado aqui, no
 * browser, a partir do que já está no ecrã — não há rota nova a proteger.
 */

export type LinhaDeContacto = {
  email: string;
  /** Quando o contacto nasceu no Resend — não muda com uma reinscrição. */
  criadoEm: string;
  /** A última confirmação registada; `null` antes da prova existir. */
  confirmouEm: string | null;
  origem: "convite" | "carta" | null;
  versao: string | null;
  cancelou: boolean;
};

function paraCsv(linhas: LinhaDeContacto[]): string {
  /* Aspas à volta de tudo e aspas dobradas lá dentro: um email pode, em teoria,
     ter vírgulas, e o Excel abre isto sem perguntar nada. */
  const celula = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [
    ["email", "contacto_criado_em", "ultima_confirmacao", "origem", "versao_do_texto", "cancelou"]
      .map(celula)
      .join(","),
    ...linhas.map((l) =>
      [
        l.email,
        l.criadoEm,
        l.confirmouEm ?? "sem registo",
        l.origem === "carta" ? "carta secreta" : l.origem === "convite" ? "convite" : "",
        l.versao ?? "",
        l.cancelou ? "sim" : "não",
      ]
        .map(celula)
        .join(","),
    ),
  ].join("\r\n");
}

export function ListaDeContactos({ linhas: iniciais }: { linhas: LinhaDeContacto[] }) {
  const [procura, setProcura] = useState("");
  /* Os cancelados aqui, nesta visita: a linha passa a "cancelou" sem esperar
     por voltar a ler a lista do Resend. */
  const [canceladosAgora, setCanceladosAgora] = useState<Set<string>>(() => new Set());
  const [apagadosAgora, setApagadosAgora] = useState<Set<string>>(() => new Set());
  /* Qual linha está a pedir confirmação, e de quê. */
  const [aConfirmar, setAConfirmar] = useState<{ email: string; accao: "cancelar" | "apagar" } | null>(
    null,
  );
  const [resultado, setResultado] = useState<
    ((EstadoDoCancelamento | EstadoDoApagamento) & { email: string }) | null
  >(null);
  const [aCancelar, comecar] = useTransition();

  const linhas = useMemo(
    () =>
      iniciais
        .filter((l) => !apagadosAgora.has(l.email))
        .map((l) => (canceladosAgora.has(l.email) ? { ...l, cancelou: true } : l)),
    [iniciais, canceladosAgora, apagadosAgora],
  );

  function cancelar(email: string) {
    comecar(async () => {
      const resposta = await cancelarInscricao(email);
      if (resposta.tipo === "cancelado") setCanceladosAgora((antes) => new Set(antes).add(email));
      setResultado({ ...resposta, email });
      setAConfirmar(null);
    });
  }

  function apagar(email: string) {
    comecar(async () => {
      const resposta = await apagarContactoDeVez(email);
      if (resposta.tipo === "apagado") setApagadosAgora((antes) => new Set(antes).add(email));
      setResultado({ ...resposta, email });
      setAConfirmar(null);
    });
  }

  const inscritos = linhas.filter((l) => !l.cancelou).length;
  const cancelaram = linhas.length - inscritos;

  const visiveis = useMemo(() => {
    const p = procura.trim().toLowerCase();
    return p ? linhas.filter((l) => l.email.includes(p)) : linhas;
  }, [linhas, procura]);

  function descarregar() {
    /* O `﻿` à cabeça é o que faz o Excel ler os acentos como acentos. */
    const ficheiro = new Blob([`﻿${paraCsv(linhas)}`], { type: "text/csv;charset=utf-8" });
    const endereco = URL.createObjectURL(ficheiro);
    const a = document.createElement("a");
    a.href = endereco;
    a.download = `newsletter-contactos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(endereco);
  }

  if (linhas.length === 0) {
    return (
      <p className="pn-texto-suave">
        Ainda ninguém se inscreveu. As inscrições chegam pelo convite que aparece no site, e só
        contam depois de a pessoa confirmar no email.
      </p>
    );
  }

  return (
    <div className="pn-pilha">
      <p className="pn-texto-suave">
        <strong className="pn-forte">{inscritos}</strong> {inscritos === 1 ? "inscrito" : "inscritos"}
        {cancelaram > 0 ? ` · ${cancelaram} ${cancelaram === 1 ? "cancelou" : "cancelaram"}` : ""}
      </p>

      {linhas.length > 8 ? (
        <label className="pn-campo">
          <span className="pn-campo__etiqueta">Procurar</span>
          <input
            type="search"
            className="pn-entrada"
            value={procura}
            onChange={(e) => setProcura(e.target.value)}
            placeholder="parte do email"
          />
        </label>
      ) : null}

      {resultado?.tipo === "erro" ? <Aviso tom="mau">{resultado.mensagem}</Aviso> : null}
      {resultado?.tipo === "cancelado" ? (
        <Aviso tom={resultado.avisado ? "bom" : "nota"}>
          {resultado.avisado
            ? `Cancelado. ${resultado.email} recebeu um email a dizê-lo.`
            : `Cancelado. O email de aviso a ${resultado.email} não saiu — a inscrição está cancelada na mesma.`}
        </Aviso>
      ) : null}
      {resultado?.tipo === "apagado" ? (
        <Aviso tom="bom">
          {`Apagado. ${resultado.email} saiu da lista e a prova do consentimento foi apagada. Não foi enviado nenhum email — responde ao pedido pelo canal por onde chegou.`}
        </Aviso>
      ) : null}

      <ul className="pn-lista">
        {visiveis.map((l) => (
          <li key={l.email} className="pn-lista__linha">
            <span className="pn-lista__principal">{l.email}</span>
            {aConfirmar?.email === l.email ? (
              <span className="pn-contacto__confirmar">
                <span className="pn-nota">
                  {aConfirmar.accao === "cancelar"
                    ? "Cancelar e avisar por email?"
                    : "Apagar de vez, sem avisar? Só a pedido da pessoa."}
                </span>
                <button
                  type="button"
                  className="pn-accao pn-accao--perigo"
                  disabled={aCancelar}
                  onClick={() => (aConfirmar.accao === "cancelar" ? cancelar(l.email) : apagar(l.email))}
                >
                  {aCancelar
                    ? aConfirmar.accao === "cancelar"
                      ? "A cancelar…"
                      : "A apagar…"
                    : aConfirmar.accao === "cancelar"
                      ? "Cancelar inscrição"
                      : "Apagar de vez"}
                </button>
                <button type="button" className="pn-accao" onClick={() => setAConfirmar(null)}>
                  Não
                </button>
              </span>
            ) : (
              <span className="pn-lista__lado pn-contacto__lado">
                {l.cancelou
                  ? "cancelou"
                  : l.confirmouEm
                    ? `confirmou a ${l.confirmouEm}`
                    : `desde ${l.criadoEm} · sem confirmação registada`}
                {l.cancelou ? null : (
                  <button
                    type="button"
                    className="pn-accao pn-contacto__cancelar"
                    onClick={() => {
                      setAConfirmar({ email: l.email, accao: "cancelar" });
                      setResultado(null);
                    }}
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="button"
                  className="pn-accao pn-contacto__cancelar"
                  onClick={() => {
                    setAConfirmar({ email: l.email, accao: "apagar" });
                    setResultado(null);
                  }}
                >
                  Apagar de vez
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>

      <button type="button" className="pn-ligacao pn-accao--sozinha" onClick={descarregar}>
        Descarregar a lista (CSV)
      </button>
    </div>
  );
}
