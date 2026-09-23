"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Aviso } from "./Aviso";
import { confirmarCodigo, reenviarCodigo, type EstadoDoCodigo } from "@/app/painel/accoes";

/**
 * O segundo passo.
 *
 * Um campo só, com seis algarismos — não seis caixinhas: são bonitas e são
 * péssimas, colar um código numa delas enche só a primeira. `inputMode` abre o
 * teclado numérico, e `autoComplete="one-time-code"` faz o iPhone oferecer o
 * código por cima do teclado assim que o email chega.
 */
export function FormularioDeCodigo({ paraOnde }: { paraOnde: string }) {
  const [estado, accao, aConfirmar] = useActionState<EstadoDoCodigo, FormData>(confirmarCodigo, {});
  const [reenvio, setReenvio] = useState<EstadoDoCodigo | null>(null);
  const [aReenviar, comecarReenvio] = useTransition();

  return (
    <div className="pn-pilha">
      {estado.erro ? <Aviso tom="mau">{estado.erro}</Aviso> : null}
      {reenvio?.erro ? <Aviso tom="mau">{reenvio.erro}</Aviso> : null}
      {reenvio?.reenviado ? (
        <Aviso tom="bom">Enviámos outro código. O anterior já não serve.</Aviso>
      ) : null}

      <p className="pn-texto-suave">
        Enviámos um código de seis algarismos para <strong className="pn-forte">{paraOnde}</strong>.
        Vale 10 minutos.
      </p>

      <form action={accao} className="pn-pilha">
        <label className="pn-campo">
          <span className="pn-campo__etiqueta">Código</span>
          <input
            name="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            required
            autoFocus
            placeholder="000000"
            className="pn-entrada pn-entrada--codigo"
          />
        </label>

        <button type="submit" disabled={aConfirmar} className="pg-botao pg-botao--cheio pn-largo">
          {aConfirmar ? "A confirmar…" : "Entrar"}
        </button>
      </form>

      <div className="pn-rodape-form">
        <button
          type="button"
          disabled={aReenviar}
          onClick={() => comecarReenvio(async () => setReenvio(await reenviarCodigo()))}
          className="pn-ligacao"
        >
          {aReenviar ? "A enviar…" : "Não chegou nada — enviar outro código"}
        </button>
        <Link href="/painel/entrar" className="pn-ligacao">
          Voltar atrás
        </Link>
      </div>
    </div>
  );
}
