"use client";

import { useActionState, useEffect, useState } from "react";
import { Aviso } from "./Aviso";
import { Campo } from "./Campo";
import { EstadoDaGravacao } from "./EstadoDaGravacao";
import { gravarCasa, type DadosDaCasa, type EstadoDaCasa } from "@/app/painel/(dentro)/casa/accoes";
import { porGravar } from "@/lib/painel/por-gravar";

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

/*
  As três partes da casa, em separadores — como os capítulos da carta, para se
  ir direito à que se quer. Só se mostra uma de cada vez, mas as três continuam
  no formulário (`hidden`, e não desmontadas): o que se escreveu numa não se
  perde ao passar para outra, e o "Gravar" grava tudo junto, como sempre.
*/
const PARTES = [
  ["horario", "Horário"],
  ["contactos", "Contactos"],
  ["redes", "Redes sociais"],
] as const;

type Parte = (typeof PARTES)[number][0];

/* O que cada separador tem de seu, para o ponto de "por gravar" acender só no
   que mudou. */
const DE_CADA_PARTE: Record<Parte, (c: DadosDaCasa) => unknown> = {
  horario: (c) => c.horarios,
  contactos: (c) => [c.telefone, c.email],
  redes: (c) => c.redes,
};

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
  const [aberta, setAberta] = useState<Parte>("horario");

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
  const mudou = (parte: Parte) =>
    JSON.stringify(DE_CADA_PARTE[parte](base)) !== JSON.stringify(DE_CADA_PARTE[parte](casa));

  useEffect(() => {
    if (!mudado) return;
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener("beforeunload", avisar);
    /* E os separadores do topo, que mudam de secção sem fechar a página —
       ver `lib/painel/por-gravar.ts`. */
    porGravar.ativo = true;
    return () => {
      window.removeEventListener("beforeunload", avisar);
      porGravar.ativo = false;
    };
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
      /* Um campo inválido num separador escondido (uma hora apagada) travava o
         "Gravar" sem se ver porquê — o browser não consegue mostrar o aviso num
         campo que não está à vista. Abre-se o separador dele. */
      onInvalidCapture={(e) => {
        const parte = (e.target as HTMLElement).closest<HTMLElement>("[data-parte]")?.dataset.parte;
        if (parte) setAberta(parte as Parte);
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

      <div className="pn-abas" role="tablist" aria-label="Partes da casa">
        {PARTES.map(([parte, nome]) => (
          <button
            key={parte}
            type="button"
            role="tab"
            id={`aba-${parte}`}
            aria-controls={`parte-${parte}`}
            aria-selected={aberta === parte}
            className="pn-abas__uma"
            onClick={() => setAberta(parte)}
          >
            {nome}
            {mudou(parte) ? <span className="pn-abas__ponto" aria-label="(por gravar)" /> : null}
          </button>
        ))}
      </div>

      <section
        className="pn-bloco pn-seccao"
        role="tabpanel"
        id="parte-horario"
        aria-labelledby="aba-horario"
        data-parte="horario"
        hidden={aberta !== "horario"}
      >
        <h2 className="pn-seccao__titulo">Horário</h2>
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

      <section
        className="pn-bloco pn-seccao"
        role="tabpanel"
        id="parte-contactos"
        aria-labelledby="aba-contactos"
        data-parte="contactos"
        hidden={aberta !== "contactos"}
      >
        <h2 className="pn-seccao__titulo">Contactos</h2>
        <div className="pn-campos-lado-a-lado">
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
        </div>
      </section>

      <section
        className="pn-bloco pn-seccao"
        role="tabpanel"
        id="parte-redes"
        aria-labelledby="aba-redes"
        data-parte="redes"
        hidden={aberta !== "redes"}
      >
        <h2 className="pn-seccao__titulo">Redes sociais</h2>
        <p className="pn-nota">
          O endereço completo, copiado da barra do browser. Só são aceites endereços da própria
          rede — um link do Instagram tem de ser do instagram.com. Vazio esconde o ícone.
        </p>
        <div className="pn-campos-lado-a-lado">
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
        </div>
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
