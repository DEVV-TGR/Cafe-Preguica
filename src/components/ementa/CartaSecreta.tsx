"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatarPreco } from "@/lib/preco";

/**
 * # A carta secreta
 *
 * O fim da `/ementa`, a seguir aos chás e antes do "Dúvidas?". Fechada para
 * quem não recebe a newsletter, aberta para quem recebe — é o isco da
 * newsletter, e por isso tem de se ver e de dar vontade.
 *
 * ## O percurso
 *
 * 1. **Fechada:** uma lista desfocada por trás (barras, não nomes — os nomes
 *    nem cá estão), a preguiça e o cadeado por cima, e o campo do email.
 * 2. O email vai à `/api/carta-secreta`, que pergunta ao Resend.
 * 3. **Inscrito:** a lista dissolve-se e os artigos entram um a um. A chave que
 *    vem na resposta fica no `localStorage`, e na próxima visita a carta abre
 *    sozinha.
 * 4. **Não inscrito:** o formulário da newsletter aparece ali mesmo — o mesmo
 *    `/api/newsletter` do convite, sem pop-up. Ao confirmar no email, a página
 *    de confirmação guarda a chave e traz a pessoa de volta, já aberta.
 *
 * ## O chamativo
 *
 * Quando a secção entra no ecrã pela primeira vez, a preguiça balança e o
 * cadeado dá dois saltos (`data-a-vista`, CSS). Uma vez por visita. Com
 * "reduzir movimento" não mexe nada — o `globals.css` corta as animações todas.
 */

const CHAVE = "preguica:carta-secreta";

export type TextosDaCartaSecreta = {
  olho: string;
  titulo: string;
  texto: string;
  etiqueta: string;
  marcador: string;
  abrir: string;
  aAbrir: string;
  naoInscritoTitulo: string;
  naoInscritoTexto: string;
  inscrever: string;
  aEnviar: string;
  consentimento: string;
  privacidade: string;
  enviadoTitulo: string;
  enviadoTexto: string;
  outroEmail: string;
  abertaTexto: string;
  fechar: string;
  erroEmail: string;
  erroLimite: string;
  erroServico: string;
};

type ArtigoSecreto = { id: string; nome: string; descricao: string; preco: number };

type Estado =
  | { tipo: "fechada"; erro?: string }
  | { tipo: "a-abrir" }
  | { tipo: "nao-inscrito"; email: string; aEnviar?: boolean; enviado?: boolean; erro?: string }
  | { tipo: "aberta"; artigos: ArtigoSecreto[] };

function lerChave(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

function guardarChave(valor: string | null) {
  try {
    if (valor) localStorage.setItem(CHAVE, valor);
    else localStorage.removeItem(CHAVE);
  } catch {
    /* Sem armazenamento, a carta abre na mesma — só não se lembra. */
  }
}

/* As larguras das barras da lista desfocada: fixas, para o servidor e o browser
   desenharem o mesmo, e variadas, para parecer uma carta e não um código de
   barras. */
const BARRAS = [62, 48, 71, 55, 66];

export function CartaSecreta({ locale, textos }: { locale: Locale; textos: TextosDaCartaSecreta }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "fechada" });
  const [aVista, setAVista] = useState(false);
  const seccao = useRef<HTMLElement>(null);

  const erroDoPedido = (status: number) =>
    status === 400 ? textos.erroEmail : status === 429 ? textos.erroLimite : textos.erroServico;

  /* `discreto` é a abertura sozinha, à chegada: sem o "A abrir…" no botão — a
     pessoa ainda nem chegou lá abaixo. */
  async function pedir(
    corpo: { email: string } | { chave: string },
    discreto = false,
  ): Promise<void> {
    if (!discreto) setEstado({ tipo: "a-abrir" });
    let resposta: Response;
    try {
      resposta = await fetch("/api/carta-secreta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...corpo, lingua: locale }),
      });
    } catch {
      setEstado({ tipo: "fechada", erro: discreto ? undefined : textos.erroServico });
      return;
    }

    if (!resposta.ok) {
      setEstado({ tipo: "fechada", erro: discreto ? undefined : erroDoPedido(resposta.status) });
      return;
    }

    const r = (await resposta.json()) as
      | { aberta: true; artigos: ArtigoSecreto[]; chave: string }
      | { aberta: false };

    if (r.aberta) {
      guardarChave(r.chave);
      setEstado({ tipo: "aberta", artigos: r.artigos });
    } else if ("email" in corpo) {
      setEstado({ tipo: "nao-inscrito", email: corpo.email });
    } else {
      /* A chave já não serve (cancelou, ou caducou): esquece-a e volta ao
         campo do email, sem dizer nada — não é um erro de quem está a ver. */
      guardarChave(null);
      setEstado({ tipo: "fechada" });
    }
  }

  /* Um telemóvel que já abriu a carta abre-a sozinho. */
  useEffect(() => {
    const chave = lerChave();
    /* Numa microtarefa, e não no corpo do efeito: o estado só muda quando a
       resposta chegar. */
    if (chave) void Promise.resolve().then(() => pedir({ chave }, true));
    // Só à chegada: `pedir` muda a cada render, e correr isto outra vez era
    // voltar a pedir o que já está no ecrã.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* O chamativo, uma vez: quando um terço da secção já se vê. */
  useEffect(() => {
    const el = seccao.current;
    if (!el) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setAVista(true);
          observador.disconnect();
        }
      },
      { threshold: 0.33 },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  async function inscrever(dados: FormData) {
    if (estado.tipo !== "nao-inscrito") return;
    const email = estado.email;
    setEstado({ tipo: "nao-inscrito", email, aEnviar: true });

    let resposta: Response;
    try {
      resposta = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sitio: dados.get("sitio"), lingua: locale }),
      });
    } catch {
      setEstado({ tipo: "nao-inscrito", email, erro: textos.erroServico });
      return;
    }

    if (!resposta.ok) {
      setEstado({ tipo: "nao-inscrito", email, erro: erroDoPedido(resposta.status) });
      return;
    }

    try {
      localStorage.setItem("preguica:newsletter", "inscrito");
    } catch {}

    const r = (await resposta.json().catch(() => ({}))) as { jaInscrito?: boolean };
    /* Inscreveu-se entretanto (noutro separador, ou confirmou já): abre. */
    if (r.jaInscrito) {
      void pedir({ email });
      return;
    }
    setEstado({ tipo: "nao-inscrito", email, enviado: true });
  }

  const aberta = estado.tipo === "aberta";

  return (
    <section
      ref={seccao}
      id="carta-secreta"
      className="em-secreta"
      data-a-vista={aVista || undefined}
      data-aberta={aberta || undefined}
      aria-labelledby="titulo-carta-secreta"
    >
      <div className="em-secreta__moldura">
        <header className="em-secreta__cabeca">
          <img
            className="em-secreta__preguica"
            src="/marca/preguica.webp"
            alt=""
            width={325}
            height={286}
            loading="lazy"
          />
          <Cadeado aberto={aberta} />
          <p className="em-olho">{textos.olho}</p>
          <h2 id="titulo-carta-secreta" className="em-secreta__titulo">
            {textos.titulo}
          </h2>
          <p className="em-secreta__texto">{aberta ? textos.abertaTexto : textos.texto}</p>
        </header>

        {aberta ? (
          <>
            <ul className="em-lista em-secreta__lista">
              {estado.artigos.map((a, i) => (
                <li
                  key={a.id}
                  className="em-artigo em-secreta__artigo"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <div className="em-artigo__texto">
                    <p className="em-artigo__linha">
                      <span className="em-artigo__nome">{a.nome}</span>
                      <span className="em-artigo__pontos" aria-hidden="true" />
                      <span className="em-artigo__preco">{formatarPreco(a.preco, locale)}</span>
                    </p>
                    <p className="em-artigo__descricao">{a.descricao}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="em-secreta__rodape">
              <button
                type="button"
                className="em-secreta__ligacao"
                onClick={() => {
                  guardarChave(null);
                  setEstado({ tipo: "fechada" });
                }}
              >
                {textos.fechar}
              </button>
            </p>
          </>
        ) : (
          <div className="em-secreta__fechada">
            {/* A carta por trás do vidro — barras e pontos de interrogação.
                Nenhum nome verdadeiro chega a este ficheiro. */}
            <ul className="em-secreta__desfocada" aria-hidden="true">
              {BARRAS.map((largura, i) => (
                <li key={i}>
                  <span style={{ width: `${largura}%` }} />
                  <span>?,?? €</span>
                </li>
              ))}
            </ul>

            <div className="em-secreta__porta">
              {estado.tipo === "nao-inscrito" ? (
                estado.enviado ? (
                  <div className="em-secreta__form" role="status">
                    <p className="em-secreta__estado">{textos.enviadoTitulo}</p>
                    <p className="em-secreta__nota">{textos.enviadoTexto}</p>
                    <button
                      type="button"
                      className="em-secreta__ligacao"
                      onClick={() => setEstado({ tipo: "fechada" })}
                    >
                      {textos.outroEmail}
                    </button>
                  </div>
                ) : (
                  <form action={inscrever} className="em-secreta__form">
                    <p className="em-secreta__estado" role="status">
                      {textos.naoInscritoTitulo}
                    </p>
                    <p className="em-secreta__nota">
                      {textos.naoInscritoTexto.replace("{email}", estado.email)}
                    </p>
                    {/* O isco para robôs — ver `app/api/newsletter/route.ts`. */}
                    <input
                      type="text"
                      name="sitio"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      className="pg-convite__isco"
                    />
                    <button
                      type="submit"
                      className="pg-botao pg-botao--cheio"
                      disabled={estado.aEnviar}
                    >
                      {estado.aEnviar ? textos.aEnviar : textos.inscrever}
                    </button>
                    {estado.erro ? (
                      <p className="em-secreta__erro" role="alert">
                        {estado.erro}
                      </p>
                    ) : null}
                    <p className="em-secreta__nota">
                      {textos.consentimento} <Link href="/privacidade">{textos.privacidade}</Link>
                    </p>
                    <button
                      type="button"
                      className="em-secreta__ligacao"
                      onClick={() => setEstado({ tipo: "fechada" })}
                    >
                      {textos.outroEmail}
                    </button>
                  </form>
                )
              ) : (
                <form
                  className="em-secreta__form"
                  action={(dados) => pedir({ email: String(dados.get("email") ?? "") })}
                >
                  <label className="em-secreta__campo">
                    <span className="sr-only">{textos.etiqueta}</span>
                    <input
                      type="email"
                      name="email"
                      required
                      autoComplete="email"
                      inputMode="email"
                      placeholder={textos.marcador}
                      className="pg-convite__entrada"
                      aria-invalid={estado.tipo === "fechada" && estado.erro ? true : undefined}
                    />
                  </label>
                  <button
                    type="submit"
                    className="pg-botao pg-botao--cheio"
                    disabled={estado.tipo === "a-abrir"}
                  >
                    {estado.tipo === "a-abrir" ? textos.aAbrir : textos.abrir}
                  </button>
                  {estado.tipo === "fechada" && estado.erro ? (
                    <p className="em-secreta__erro" role="alert">
                      {estado.erro}
                    </p>
                  ) : null}
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Um cadeado em traço dourado; aberto, a haste sobe e roda. */
function Cadeado({ aberto }: { aberto: boolean }) {
  return (
    <svg
      className="em-secreta__cadeado"
      data-aberto={aberto || undefined}
      viewBox="0 0 48 56"
      aria-hidden="true"
    >
      <path className="em-secreta__haste" d="M14 26 V17 a10 10 0 0 1 20 0 V26" />
      <rect x="7" y="25" width="34" height="26" rx="5" />
      <circle cx="24" cy="37" r="3.5" />
      <path d="M24 40 V45" />
    </svg>
  );
}
