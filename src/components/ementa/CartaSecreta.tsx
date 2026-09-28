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
 * Por trás e por cima da moldura há ramos cruzados, de ponta a ponta da página,
 * e a preguiça anda num deles de um lado para o outro, sempre a balançar, e
 * passa por trás dos que estão à frente (`Ramos`, em baixo). Quando a secção entra no ecrã pela primeira vez, o
 * cadeado dá dois saltos (`data-a-vista`, CSS). Com "reduzir movimento" não mexe
 * nada — o `globals.css` corta as animações todas, e a preguiça fica a meio.
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
      <Ramos />
      <div className="em-secreta__moldura">
        <header className="em-secreta__cabeca">
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

/**
 * Os ramos: um fundo de paus cruzados por trás da carta secreta, de ponta a
 * ponta da página, e em cima dela a preguiça a andar. De trás para a frente:
 *
 * 1. **o fundo** — paus compridos e apagados, do tamanho da secção inteira. A
 *    moldura é translúcida e deixa-os ver por trás;
 * 2. **atrás** — paus no topo, que descem e somem por trás da moldura;
 * 3. **o trilho** — o ramo onde a preguiça anda, e ela pendurada nele;
 * 4. **à frente** — paus mais fortes que cruzam o trilho: é por trás destes que
 *    ela passa.
 *
 * O fundo estica (`none`) porque a altura da secção muda (fechada, aberta) e
 * paus soltos não têm um ângulo certo. Os de cima têm folhas, que esticadas
 * ficavam amassadas: por isso são um desenho largo (2000) em `slice` — no
 * telemóvel vê-se o meio, num ecrã largo quase tudo. O trilho é à parte porque
 * a preguiça anda nele em px — ver `.em-ramos__trilho` no CSS.
 */
function Ramos() {
  return (
    <div className="em-ramos" aria-hidden="true">
      <svg className="em-ramos__fundo" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        <path d="M-20 140 Q 300 420 520 1020" />
        <path d="M1020 80 Q 700 380 380 1020" />
        <path d="M-20 620 Q 380 700 1020 980" />
        <path d="M1020 520 Q 640 600 -20 900" />
        <path d="M180 -20 Q 120 400 260 1020" />
        <path d="M840 -20 Q 900 500 760 1020" />
        <path className="em-ramos__raminho" d="M150 330 q 60 -20 90 -70" />
        <path className="em-ramos__raminho" d="M870 330 q -60 10 -80 -50" />
        <path className="em-ramos__raminho" d="M300 760 q 40 -40 50 -100" />
        <path className="em-ramos__raminho" d="M700 790 q -30 -50 -20 -110" />
      </svg>

      <div className="em-ramos__cima">
        <svg className="em-ramos__paus em-ramos__paus--atras" viewBox="0 0 2000 160" preserveAspectRatio="xMidYMin slice">
          <path d="M650 196 Q 800 118 952 6" />
          <path d="M1048 10 Q 1252 74 1405 196" />
          <path d="M520 30 Q 696 64 840 150" />
          <path d="M60 196 Q 200 90 380 10" />
          <path d="M1620 8 Q 1780 60 1960 196" />
          <path d="M240 20 Q 380 70 470 170" />
          <path className="em-ramos__raminho" d="M1260 128 q 26 -4 44 -24" />
          <path className="em-ramos__raminho" d="M762 126 q -10 -22 -32 -34" />
          <path className="em-ramos__raminho" d="M1840 104 q 20 -8 30 -30" />
          <Folha x={736} y={92} rodar={-150} />
          <Folha x={1304} y={104} rodar={-40} />
          <Folha x={920} y={26} rodar={-70} />
          <Folha x={1870} y={74} rodar={-60} />
          <Folha x={300} y={52} rodar={160} />
        </svg>

        <div className="em-ramos__trilho">
          <svg viewBox="0 0 1000 20" preserveAspectRatio="none">
            <path d="M-20 10 C 150 5, 300 14, 480 10 S 800 6, 1020 11" />
          </svg>
          <span className="em-ramos__preguica">
            <span>
              <img src="/marca/preguica.webp" width={325} height={286} alt="" loading="lazy" />
            </span>
          </span>
        </div>

        <svg className="em-ramos__paus em-ramos__paus--frente" viewBox="0 0 2000 160" preserveAspectRatio="xMidYMin slice">
          <path d="M796 8 Q 932 52 1020 146" />
          <path d="M1204 150 Q 1312 50 1452 8" />
          <path d="M1100 4 Q 1106 74 1162 122" />
          <path d="M360 150 Q 450 60 600 6" />
          <path d="M1560 6 Q 1640 90 1700 150" />
          <path className="em-ramos__raminho" d="M940 91 q 18 -2 30 -18" />
          <path className="em-ramos__raminho" d="M1368 58 q -6 -20 -24 -30" />
          <path className="em-ramos__raminho" d="M470 88 q 20 4 34 -8" />
          <Folha x={970} y={73} rodar={-50} />
          <Folha x={1344} y={28} rodar={-150} />
          <Folha x={1130} y={62} rodar={20} />
          <Folha x={504} y={80} rodar={-20} />
        </svg>
      </div>
    </div>
  );
}

/** Uma folha em gota, na ponta de um raminho. */
function Folha({ x, y, rodar }: { x: number; y: number; rodar: number }) {
  return (
    <path
      className="em-ramos__folha"
      d="M0 0 q 9 -7 18 0 q -9 7 -18 0 Z"
      transform={`translate(${x} ${y}) rotate(${rodar})`}
    />
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
