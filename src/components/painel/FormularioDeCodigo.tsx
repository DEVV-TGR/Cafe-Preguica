"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Aviso } from "./Aviso";
import { confirmarCodigo, reenviarCodigo, type EstadoDoCodigo } from "@/app/painel/accoes";

/**
 * O segundo passo.
 *
 * Um campo só, com seis algarismos — **por baixo** das seis caixinhas. As
 * caixinhas são desenho (`aria-hidden`); quem recebe o que se escreve é o
 * `<input>` transparente que está por cima delas. Seis campos a sério eram
 * bonitos e péssimos: colar um código numa delas enchia só a primeira, e o
 * iPhone só oferece o código do email por cima do teclado a um campo com
 * `autoComplete="one-time-code"`.
 *
 * ## A animação
 *
 * O JS só decide a fase (`data-fase`); a forma está toda no `painel.css`.
 *
 * - `escrever` — o anel dourado está na casa do algarismo seguinte.
 * - `a-confirmar` — o dourado dá voltas à fila inteira. Dura pelo menos uma
 *   volta (`VOLTA_MS`), mesmo que o servidor responda antes: uma resposta em
 *   80 ms fazia a volta parecer um soluço.
 * - `certo` — as casas juntam-se no meio, aparece o logótipo, e o painel abre.
 * - `errado` — tudo a vermelho, um abanão, e as casas voltam vazias.
 *
 * Por isso a acção não é um `useActionState`: o resultado chega a meio de uma
 * sequência com tempos, e quem a conduz é o `submeter` de baixo.
 */

type Fase = "escrever" | "a-confirmar" | "certo" | "errado";

/* Os mesmos números das animações do `painel.css` (`pn-codigo-…`). */
const VOLTA_MS = 900;
const ENTRAR_MS = 1300;
const ERRADO_MS = 900;

const CASAS = 6;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function FormularioDeCodigo({
  paraOnde,
  jaDentro,
}: {
  paraOnde: string;
  /** Há sessão aberta. A página não redireciona — ver o comentário dela. */
  jaDentro: boolean;
}) {
  const router = useRouter();
  const campo = useRef<HTMLInputElement>(null);
  const [valor, setValor] = useState("");
  const [focado, setFocado] = useState(true);
  const [fase, setFase] = useState<Fase>("escrever");
  const [erro, setErro] = useState<string | null>(null);
  const [reenvio, setReenvio] = useState<EstadoDoCodigo | null>(null);
  const [aReenviar, comecarReenvio] = useTransition();

  /* Chegou cá com a sessão já aberta, sem estar a meio de uma entrada: vai
     para dentro já. A meio da animação (`certo`) quem abre o painel é o
     `submeter`, quando ela acabar. */
  const deixarEntrar = jaDentro && fase === "escrever";
  useEffect(() => {
    if (deixarEntrar) router.replace("/painel");
  }, [deixarEntrar, router]);

  async function submeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (fase !== "escrever") return;

    const dados = new FormData(evento.currentTarget);
    setErro(null);
    setReenvio(null);
    setFase("a-confirmar");

    let resposta: EstadoDoCodigo;
    try {
      [resposta] = await Promise.all([confirmarCodigo({}, dados), esperar(VOLTA_MS)]);
    } catch {
      resposta = { erro: "Não foi possível confirmar o código agora. Tenta outra vez." };
    }

    if (resposta.certo) {
      setFase("certo");
      await esperar(ENTRAR_MS);
      /* `replace`: o botão de voltar não deve trazer ninguém a este ecrã com
         a sessão já aberta. */
      router.replace("/painel");
      return;
    }

    setFase("errado");
    await esperar(ERRADO_MS);
    setErro(resposta.erro ?? "Código errado.");
    setValor("");
    setFase("escrever");
    campo.current?.focus();
  }

  /* A casa onde vai cair o próximo algarismo; com as seis cheias, a última. */
  const ativa = Math.min(valor.length, CASAS - 1);
  const ocupado = fase !== "escrever";

  return (
    <div className="pn-pilha">
      {erro ? <Aviso tom="mau">{erro}</Aviso> : null}
      {reenvio?.erro ? <Aviso tom="mau">{reenvio.erro}</Aviso> : null}
      {reenvio?.reenviado ? (
        <Aviso tom="bom">Enviámos outro código. O anterior já não serve.</Aviso>
      ) : null}

      <p className="pn-texto-suave">
        Enviámos um código de seis algarismos para <strong className="pn-forte">{paraOnde}</strong>.
        Vale 10 minutos.
      </p>

      <form onSubmit={submeter} className="pn-pilha">
        <label className="pn-campo">
          <span className="pn-campo__etiqueta">Código</span>
          <span className="pn-codigo" data-fase={fase} data-focado={focado || undefined}>
            <span className="pn-codigo__fila" aria-hidden="true">
              <span className="pn-codigo__anel" />
              {Array.from({ length: CASAS }, (_, i) => (
                <span
                  key={i}
                  className="pn-codigo__casa"
                  style={{ "--i": i } as React.CSSProperties}
                  data-ativa={i === ativa || undefined}
                  data-cheia={i < valor.length || undefined}
                >
                  {valor[i] ?? ""}
                </span>
              ))}
              {/* eslint-disable-next-line @next/next/no-img-element -- só aparece no
                  fim da animação, e o `next/image` acrescentava um `srcset` a uma
                  imagem que já está em cache desde o ecrã de entrada. */}
              <img className="pn-codigo__marca" src="/marca/marca.webp" alt="" width={819} height={506} />
            </span>
            <input
              ref={campo}
              name="codigo"
              value={valor}
              onChange={(e) => setValor(e.target.value.replace(/\D/g, "").slice(0, CASAS))}
              onFocus={() => setFocado(true)}
              onBlur={() => setFocado(false)}
              readOnly={ocupado}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={CASAS}
              required
              autoFocus
              className="pn-codigo__campo"
            />
          </span>
        </label>

        {/* Desmarcada por defeito: o cookie de 30 dias é uma comodidade, e só
            se grava se quem entra o pedir — ver `confirmarCodigo`. A frase diz
            o que fica e quanto tempo, que é o que torna a escolha informada. */}
        <label className="pn-interruptor pn-escolha">
          <input type="checkbox" name="lembrar" value="sim" disabled={ocupado} />
          <span>
            Lembrar este aparelho durante 30 dias — guarda um cookie neste browser para não pedir o
            código. Não marques num aparelho partilhado.
          </span>
        </label>

        {/* Para quem não vê a animação: o que ela está a dizer. */}
        <p className="pn-so-leitor" role="status">
          {fase === "a-confirmar" ? "A confirmar o código…" : fase === "certo" ? "Código certo. A abrir o painel." : ""}
        </p>

        <button type="submit" disabled={ocupado} className="pg-botao pg-botao--cheio pn-largo">
          {fase === "a-confirmar" ? "A confirmar…" : fase === "certo" ? "A abrir o painel…" : "Entrar"}
        </button>
      </form>

      <div className="pn-rodape-form">
        <button
          type="button"
          disabled={aReenviar || ocupado}
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
