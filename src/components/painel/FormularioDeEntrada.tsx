"use client";

import { useActionState } from "react";
import { Campo } from "./Campo";
import { Aviso } from "./Aviso";
import { pedirCodigo, type EstadoDaEntrada } from "@/app/painel/accoes";

/**
 * Um campo, e é tudo: quem tem acesso escreve o email e recebe um código. Não
 * há palavra-passe para escrever nem para esquecer.
 *
 * `type="email"` troca o teclado do telemóvel por um que tem o `@` à mão, e
 * `autoComplete="email"` oferece o endereço logo.
 */
export function FormularioDeEntrada() {
  const [estado, accao, aPedir] = useActionState<EstadoDaEntrada, FormData>(pedirCodigo, {});

  return (
    <form action={accao} className="pn-pilha">
      {estado.erro ? <Aviso tom="mau">{estado.erro}</Aviso> : null}

      {/* A mesma frase para quem tem acesso e para quem não tem. Se dissesse
          "esse email não está autorizado", o formulário servia para descobrir
          quem entra no painel. */}
      {estado.enviado ? (
        <Aviso tom="bom">
          Se este email tiver acesso ao painel, o código chega em instantes. Vale 10 minutos.
        </Aviso>
      ) : null}

      <Campo
        etiqueta="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoFocus
        placeholder="o-teu-email@exemplo.pt"
      />

      <button type="submit" disabled={aPedir} className="pg-botao pg-botao--cheio pn-largo">
        {aPedir ? "A enviar…" : "Receber código"}
      </button>
    </form>
  );
}
