"use client";

import { useActionState, useEffect, useState } from "react";
import { Aviso } from "./Aviso";
import { Campo } from "./Campo";
import { EstadoDaGravacao } from "./EstadoDaGravacao";
import { gravarCasa, type DadosDaCasa, type EstadoDaCasa } from "@/app/painel/casa/accoes";

/**
 * O horário, os contactos e as redes.
 *
 * O ecrã trabalha sobre um objeto só, que vai inteiro num campo escondido — a
 * ação valida esse mesmo objeto, e não há uma terceira forma no meio para se
 * desencontrar das outras duas.
 */

const DIAS = [
  ["segunda", "Segunda"],
  ["terca", "Terça"],
  ["quarta", "Quarta"],
  ["quinta", "Quinta"],
  ["sexta", "Sexta"],
  ["sabado", "Sábado"],
  ["domingo", "Domingo"],
] as const;

type Dia = (typeof DIAS)[number][0];
type Horarios = NonNullable<DadosDaCasa["horarios"]>;

const REDES = [
  ["instagram", "Instagram", "https://www.instagram.com/…"],
  ["facebook", "Facebook", "https://www.facebook.com/…"],
  ["tiktok", "TikTok", "https://www.tiktok.com/@…"],
  ["spotify", "Spotify", "https://open.spotify.com/…"],
] as const;

/* Quando o horário ainda não existe no ficheiro (`null`, "por confirmar"), o
   ecrã começa com a semana toda encerrada — nada aparece no site sem alguém o
   escrever. */
const SEMANA_VAZIA: Horarios = {
  segunda: null,
  terca: null,
  quarta: null,
  quinta: null,
  sexta: null,
  sabado: null,
  domingo: null,
};

export function EditorDaCasa({
  inicial,
  shaCafe,
  shaMarca,
  horarioConfirmado,
}: {
  inicial: DadosDaCasa;
  shaCafe: string;
  shaMarca: string;
  horarioConfirmado: boolean;
}) {
  const [base, setBase] = useState(inicial);
  const [casa, setCasa] = useState<DadosDaCasa>(inicial);
  const [shas, setShas] = useState({ cafe: shaCafe, marca: shaMarca });

  const [estado, accao, aGravar] = useActionState<EstadoDaCasa, FormData>(
    async (anterior, dados) => {
      const resposta = await gravarCasa(anterior, dados);
      if (resposta.tipo === "gravado") {
        setShas({ cafe: resposta.shaCafe, marca: resposta.shaMarca });
        setBase(JSON.parse(String(dados.get("casa"))) as DadosDaCasa);
      }
      return resposta;
    },
    { tipo: "parado" },
  );

  const mudado = JSON.stringify(base) !== JSON.stringify(casa);

  useEffect(() => {
    if (!mudado) return;
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [mudado]);

  const horarios = casa.horarios ?? SEMANA_VAZIA;

  function mudarDia(dia: Dia, valor: Horarios[Dia]) {
    setCasa((anterior) => ({
      ...anterior,
      horarios: { ...(anterior.horarios ?? SEMANA_VAZIA), [dia]: valor },
    }));
  }

  return (
    <form
      action={accao}
      className="pn-editor pn-pilha-larga"
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault();
      }}
    >
      <input type="hidden" name="shaCafe" value={shas.cafe} />
      <input type="hidden" name="shaMarca" value={shas.marca} />
      <input type="hidden" name="casa" value={JSON.stringify(casa)} />

      {estado.tipo === "erro" ? <Aviso tom="mau">{estado.mensagem}</Aviso> : null}
      {estado.tipo === "problemas" ? (
        <Aviso tom="mau">
          <strong>Isto não pode ser gravado assim:</strong>
          <ul className="pn-problemas">
            {estado.lista.map((problema) => (
              <li key={problema}>{problema}</li>
            ))}
          </ul>
        </Aviso>
      ) : null}
      {estado.tipo === "gravado" ? (
        <EstadoDaGravacao key={estado.commit} commit={estado.commit} endereco={estado.endereco} />
      ) : null}

      <section className="pn-seccao" aria-labelledby="titulo-horario">
        <p className="pn-olho">A casa</p>
        <h2 id="titulo-horario" className="pn-seccao__titulo">Horário</h2>
        {!horarioConfirmado ? (
          <p className="pn-nota">
            No site, o horário aparece com a nota “sujeito a confirmação”. Quando estiver certo,
            diz ao Tomás para a tirar.
          </p>
        ) : null}
        {casa.horarios === null ? (
          <p className="pn-nota">
            O horário ainda não aparece no site. Escreve-o aqui e grava para passar a aparecer.
          </p>
        ) : null}

        <ul className="pn-dias">
          {DIAS.map(([dia, nome]) => {
            const valor = horarios[dia];
            return (
              <li key={dia} className="pn-dia">
                <span className="pn-dia__nome">{nome}</span>
                <label className="pn-interruptor">
                  <input
                    type="checkbox"
                    checked={valor !== null}
                    onChange={(e) =>
                      mudarDia(
                        dia,
                        e.target.checked
                          ? { abre: "16:00", fecha: "00:30", cozinhaFecha: null }
                          : null,
                      )
                    }
                  />
                  <span>{valor === null ? "Encerrado" : "Aberto"}</span>
                </label>
                {valor !== null ? (
                  <span className="pn-dia__horas">
                    <input
                      type="time"
                      className="pn-entrada pn-entrada--hora"
                      aria-label={`${nome}, abre às`}
                      value={valor.abre}
                      required
                      onChange={(e) => mudarDia(dia, { ...valor, abre: e.target.value })}
                    />
                    <span aria-hidden="true">–</span>
                    <input
                      type="time"
                      className="pn-entrada pn-entrada--hora"
                      aria-label={`${nome}, fecha às`}
                      value={valor.fecha}
                      required
                      onChange={(e) => mudarDia(dia, { ...valor, fecha: e.target.value })}
                    />
                  </span>
                ) : null}
                {/* A hora da cozinha. Vazio quer dizer que fecha com o bar — é o
                    `null` do `cafe.json`, e o site não escreve nada a mais. */}
                {valor !== null ? (
                  <span className="pn-dia__cozinha">
                    <span>Cozinha até</span>
                    <input
                      type="time"
                      className="pn-entrada pn-entrada--hora"
                      aria-label={`${nome}, a cozinha fecha às`}
                      value={valor.cozinhaFecha ?? ""}
                      onChange={(e) =>
                        mudarDia(dia, { ...valor, cozinhaFecha: e.target.value || null })
                      }
                    />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="pn-nota">
          Se fecha depois da meia-noite, escreve a hora a que fecha mesmo — 01:00, e não 25:00. A
          cozinha aparece no site ao lado do horário; se a deixares vazia, fecha com o bar.
        </p>
      </section>

      <section className="pn-seccao pn-pilha" aria-labelledby="titulo-contactos">
        <h2 id="titulo-contactos" className="pn-seccao__titulo">Contactos</h2>
        <Campo
          etiqueta="Telefone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={casa.telefone}
          nota="Como se diz ao telefone, com espaços: 229 730 873. Vazio esconde-o do site."
          onChange={(e) => setCasa({ ...casa, telefone: e.target.value })}
        />
        <Campo
          etiqueta="Email"
          type="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={casa.email}
          nota="Vazio esconde-o do site."
          onChange={(e) => setCasa({ ...casa, email: e.target.value })}
        />
      </section>

      <section className="pn-seccao pn-pilha" aria-labelledby="titulo-redes">
        <h2 id="titulo-redes" className="pn-seccao__titulo">Redes sociais</h2>
        <p className="pn-nota">
          O endereço completo, copiado da barra do browser. Só são aceites endereços da própria
          rede — um link do Instagram tem de ser do instagram.com. Vazio esconde o ícone.
        </p>
        {REDES.map(([rede, nome, exemplo]) => (
          <Campo
            key={rede}
            etiqueta={nome}
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={exemplo}
            value={casa.redes[rede]}
            onChange={(e) => setCasa({ ...casa, redes: { ...casa.redes, [rede]: e.target.value } })}
          />
        ))}
      </section>

      <div className="pn-publicar">
        <div className="pn-publicar__dentro">
          <button
            type="submit"
            disabled={aGravar || !mudado}
            className="pg-botao pg-botao--cheio pn-largo"
          >
            {aGravar ? "A gravar…" : mudado ? "Gravar" : "Nada por gravar"}
          </button>
        </div>
      </div>
    </form>
  );
}
