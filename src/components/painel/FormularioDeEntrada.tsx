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

      {/* Não há frase de "enviado": com acesso ou sem ele, o passo seguinte é
          sempre o ecrã do código — ver `pedirCodigo`. */}

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
