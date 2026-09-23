"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * O botão "Confirmar inscrição" da página a que o email de confirmação leva.
 *
 * O convite vem no fragmento (`#…`) — ver `app/api/newsletter/route.ts`. O
 * fragmento só existe no browser, e por isso é lido aqui e não na página.
 */

export type TextosDaConfirmacao = {
  texto: string;
  botao: string;
  aConfirmar: string;
  feitoTitulo: string;
  feitoTexto: string;
  semConvite: string;
  invalido: string;
  expirado: string;
  erro: string;
};

type Estado = "pronto" | "a-confirmar" | "feito" | "invalido" | "expirado" | "erro";

/* O fragmento lido como uma "loja" externa: no servidor (e na hidratação) é
   `null` — ainda não se sabe —, no browser é o que está no endereço. Com `""` no
   servidor, o HTML estático dizia "este link não traz convite" a toda a gente,
   durante o instante antes de o browser ler o endereço. */
const lerFragmento = () => decodeURIComponent(window.location.hash.slice(1));
const semFragmento = () => null;
const naoMuda = () => () => {};

export function ConfirmarInscricao({ textos }: { textos: TextosDaConfirmacao }) {
  const convite = useSyncExternalStore(naoMuda, lerFragmento, semFragmento);
  const [estado, setEstado] = useState<Estado>("pronto");

  async function confirmar() {
    setEstado("a-confirmar");
    try {
      const resposta = await fetch("/api/newsletter/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convite }),
      });

      if (resposta.ok) {
        /* O mesmo sinal que o pop-up deixa: quem confirmou não volta a ser
           convidado, mesmo que se tenha inscrito noutro aparelho. */
        try {
          localStorage.setItem("preguica:newsletter", "inscrito");
        } catch {}
        /* Tira o convite do endereço: não há razão para ficar no histórico. */
        history.replaceState(null, "", window.location.pathname);
        setEstado("feito");
        return;
      }

      setEstado(
        resposta.status === 410 ? "expirado" : resposta.status === 400 ? "invalido" : "erro",
      );
    } catch {
      setEstado("erro");
    }
  }

  if (estado === "feito") {
    return (
      <section className="lt-seccao" role="status">
        <h2 className="lt-seccao__titulo">{textos.feitoTitulo}</h2>
        <div className="lt-seccao__texto">
          <p>{textos.feitoTexto}</p>
        </div>
      </section>
    );
  }

  if (convite === null) return null;

  if (!convite) {
    return (
      <section className="lt-seccao">
        <div className="lt-seccao__texto">
          <p>{textos.semConvite}</p>
        </div>
      </section>
    );
  }

  const erro =
    estado === "invalido"
      ? textos.invalido
      : estado === "expirado"
        ? textos.expirado
        : estado === "erro"
          ? textos.erro
          : null;

  return (
    <section className="lt-seccao">
      <div className="lt-seccao__texto">
        <p>{textos.texto}</p>
      </div>
      <p className="lt-accao">
        <button
          type="button"
          className="pg-botao pg-botao--cheio"
          onClick={confirmar}
          disabled={estado === "a-confirmar" || estado === "invalido" || estado === "expirado"}
        >
          {estado === "a-confirmar" ? textos.aConfirmar : textos.botao}
        </button>
      </p>
      {erro ? (
        <p className="lt-accao__erro" role="alert">
          {erro}
        </p>
      ) : null}
    </section>
  );
}
