"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { terminarSessaoDoAparelho } from "@/app/painel/accoes";

/**
 * O botão "Terminar sessão" de um aparelho, com a confirmação na própria
 * linha — e não num `confirm()` do browser, que no telemóvel tapa o ecrã e
 * parece um erro.
 */
export function TerminarSessao({ aparelho, este }: { aparelho: string; este: boolean }) {
  const [aConfirmar, setAConfirmar] = useState(false);

  if (!aConfirmar) {
    return (
      <button type="button" className="pn-accao" onClick={() => setAConfirmar(true)}>
        Terminar sessão
      </button>
    );
  }

  return (
    <form action={terminarSessaoDoAparelho} className="pn-terminar">
      <input type="hidden" name="aparelho" value={aparelho} />
      <span className="pn-nota">
        {este ? "Sais deste aparelho, e para voltar pedes o código." : "Esse aparelho sai já, e para voltar pede o código."}
      </span>
      <Confirmar />
      <button type="button" className="pn-accao" onClick={() => setAConfirmar(false)}>
        Não
      </button>
    </form>
  );
}

function Confirmar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="pn-accao pn-accao--perigo" disabled={pending}>
      {pending ? "A terminar…" : "Terminar"}
    </button>
  );
}
