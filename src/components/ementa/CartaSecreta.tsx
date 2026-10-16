"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatarPreco } from "@/lib/preco";
import { esquecerChave, guardarChave, lerChaveGuardada } from "@/lib/carta-secreta/no-browser";
import { Ramos } from "./Ramos";

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
 *    vem na resposta fica no browser (ver abaixo), e a carta abre sozinha.
 * 4. **Não inscrito:** o formulário da newsletter aparece ali mesmo — o mesmo
 *    `/api/newsletter` do convite, com `origem: "carta"`. Ao confirmar no
 *    email, a página de confirmação guarda a chave e traz a pessoa de volta.
 * 5. **Aberta:** por baixo, "lembrar neste aparelho" e "fechar a carta".
 *
 * ## O que mudou na revisão legal de 2026-10-15
 *
 * A carta continua a ser o benefício de quem recebe as novidades — decisão do
 * Tomás, porque é o que a torna apelativa. O que mudou à volta:
 *
 * - **Cancelar a newsletter não fecha a carta** no browser onde já foi aberta:
 *   a chave não volta a perguntar ao Resend (RGPD, art. 7.º, n.º 3 — retirar o
 *   consentimento não pode custar nada).
 * - **A chave não leva o email**, fica no `sessionStorage` por defeito, e só
 *   vai para o `localStorage` (90 dias) com "lembrar neste aparelho". Ver
 *   `lib/carta-secreta/no-browser.ts`.
 * - **Há uma alternativa sem email**: a linha "peça-a ao balcão". É o que deixa
 *   a escolha de dar o email ser livre — sem ela, a carta era o preço do
 *   consentimento para marketing, que a CNPD critica (Diretriz 1/2022, § 70).
 *   O risco que sobra está em `docs/decisoes-pendentes.md`.
 *
 * ## O chamativo
 *
 * Por trás e por cima da moldura há ramos cruzados, de ponta a ponta da página,
 * e a preguiça anda por eles e deixa-se agarrar e arrastar (`Ramos.tsx`).
 * Quando a secção entra no ecrã pela primeira vez, o cadeado dá dois saltos
 * (`data-a-vista`, CSS). Com "reduzir movimento", nada disto mexe sozinho.
 */

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
  /** A frase ao lado do "Inscrever e abrir" — vai, tal e qual, para a prova do consentimento. */
  consentimento: string;
  privacidade: string;
  /** A alternativa sem email. */
  balcao: string;
  enviadoTitulo: string;
  enviadoTexto: string;
  outroEmail: string;
  abertaTexto: string;
  lembrar: string;
  lembrarNota: string;
  aLembrar: string;
  lembrada: string;
  fechar: string;
  erroEmail: string;
  erroLimite: string;
  erroServico: string;
  /** O "—" da carta, para um cocktail com o preço por confirmar. */
  precoPorConfirmar: string;
};

type ArtigoSecreto = { id: string; nome: string; descricao: string; preco: number | null };

type Estado =
  | { tipo: "fechada"; erro?: string }
  | { tipo: "a-abrir" }
  | { tipo: "nao-inscrito"; email: string; aEnviar?: boolean; enviado?: boolean; erro?: string }
  | { tipo: "aberta"; artigos: ArtigoSecreto[]; lembrada: boolean; aLembrar?: boolean; erro?: string };

type Resposta = { aberta: true; artigos: ArtigoSecreto[]; chave?: string } | { aberta: false };

/* As larguras das barras da lista desfocada: fixas, para o servidor e o browser
   desenharem o mesmo, e variadas, para parecer uma carta e não um código de
   barras. */
const BARRAS = [62, 48, 71, 55, 66];

export function CartaSecreta({ locale, textos }: { locale: Locale; textos: TextosDaCartaSecreta }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "fechada" });
  const [aVista, setAVista] = useState(false);
  const seccao = useRef<HTMLElement>(null);
  /* Controlado: o React 19 repõe os campos de um `<form action>` quando a
     acção acaba, e o email desaparecia por baixo da mensagem de erro. */
  const [email, setEmail] = useState("");
  /* O número do último pedido. A abertura sozinha (com a chave) e a do botão
     (com o email) podem estar em voo ao mesmo tempo, e a resposta que chegasse
     em último decidia o ecrã — uma chave caducada fechava a carta por cima de
     um "não está inscrito" acabado de mostrar. Só conta a do último pedido. */
  const ultimoPedido = useRef(0);
  /* Depois de um pedido feito por quem está a ver, o foco vai para o resultado:
     o formulário onde estava desaparece, e sem isto o foco caía no `<body>` e o
     leitor de ecrã não dizia o que mudou. */
  const focarResultado = useRef(false);

  const erroDoPedido = (status: number) =>
    status === 400 ? textos.erroEmail : status === 429 ? textos.erroLimite : textos.erroServico;

  /* Um pedido à `/api/carta-secreta`; `null` se falhar, com o estado HTTP. */
  async function perguntar(
    corpo: { email: string } | { chave: string; lembrar?: boolean },
  ): Promise<{ r: Resposta | null; status: number }> {
    try {
      const resposta = await fetch("/api/carta-secreta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...corpo, lingua: locale }),
      });
      if (!resposta.ok) return { r: null, status: resposta.status };
      /* Um 200 que não é JSON (uma página de erro de um proxy pelo meio) conta
         como falha, e não como carta fechada. */
      return { r: (await resposta.json().catch(() => null)) as Resposta | null, status: resposta.status };
    } catch {
      return { r: null, status: 503 };
    }
  }

  /* Abrir com o email escrito na secção. */
  async function abrirComEmail() {
    const numero = ++ultimoPedido.current;
    setEstado({ tipo: "a-abrir" });
    const { r, status } = await perguntar({ email });
    if (numero !== ultimoPedido.current) return;
    if (!r) {
      setEstado({ tipo: "fechada", erro: erroDoPedido(status) });
      return;
    }
    focarResultado.current = true;
    if (r.aberta) {
      if (r.chave) guardarChave(r.chave);
      setEstado({ tipo: "aberta", artigos: r.artigos, lembrada: false });
    } else {
      setEstado({ tipo: "nao-inscrito", email });
    }
  }

  useEffect(() => {
    if (!focarResultado.current) return;
    if (estado.tipo !== "aberta" && estado.tipo !== "nao-inscrito") return;
    focarResultado.current = false;
    seccao.current?.querySelector<HTMLElement>("[data-resultado]")?.focus();
  }, [estado]);

  /* Um browser que já abriu a carta abre-a sozinho, sem o "A abrir…" no botão
     — a pessoa ainda nem chegou lá abaixo. */
  useEffect(() => {
    const guardada = lerChaveGuardada();
    if (!guardada) return;
    const numero = ++ultimoPedido.current;
    void perguntar({ chave: guardada.valor }).then(({ r }) => {
      if (!r || numero !== ultimoPedido.current) return;
      if (!r.aberta) {
        /* Caducou ou não é nossa: esquece-a, sem dizer nada — não é um erro de
           quem está a ver. */
        esquecerChave();
        return;
      }
      /* Uma chave antiga (com email) volta trocada por uma de sessão. */
      if (r.chave) guardarChave(r.chave);
      setEstado({ tipo: "aberta", artigos: r.artigos, lembrada: !r.chave && guardada.lembrada });
    });
    // Só à chegada: `perguntar` muda a cada render, e correr isto outra vez era
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
        body: JSON.stringify({ email, origem: "carta", sitio: dados.get("sitio"), lingua: locale }),
      });
    } catch {
      setEstado({ tipo: "nao-inscrito", email, erro: textos.erroServico });
      return;
    }

    if (!resposta.ok) {
      setEstado({ tipo: "nao-inscrito", email, erro: erroDoPedido(resposta.status) });
      return;
    }
    focarResultado.current = true;
    /* Nesta visita o convite da newsletter já não aparece. */
    try {
      sessionStorage.setItem("preguica:newsletter", "inscrito");
    } catch {}
    setEstado({ tipo: "nao-inscrito", email, enviado: true });
  }

  async function lembrar() {
    if (estado.tipo !== "aberta") return;
    const guardada = lerChaveGuardada();
    setEstado({ ...estado, aLembrar: true, erro: undefined });
    const { r } = guardada ? await perguntar({ chave: guardada.valor, lembrar: true }) : { r: null };
    if (r?.aberta && r.chave) {
      guardarChave(r.chave);
      setEstado({ tipo: "aberta", artigos: r.artigos, lembrada: true });
    } else {
      setEstado({ ...estado, aLembrar: false, erro: textos.erroServico });
    }
  }

  const aberta = estado.tipo === "aberta";
  const balcao = <p className="em-secreta__nota">{textos.balcao}</p>;

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
          <h2
            id="titulo-carta-secreta"
            className="em-secreta__titulo"
            tabIndex={-1}
            data-resultado={aberta || undefined}
          >
            {textos.titulo}
          </h2>
          <p className="em-secreta__texto">{aberta ? textos.abertaTexto : textos.texto}</p>
        </header>

        {estado.tipo === "aberta" ? (
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
                      <span className="em-artigo__preco">
                        {a.preco === null ? textos.precoPorConfirmar : formatarPreco(a.preco, locale)}
                      </span>
                    </p>
                    {a.descricao ? <p className="em-artigo__descricao">{a.descricao}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
            <div className="em-secreta__rodape">
              {estado.lembrada ? (
                <p className="em-secreta__nota" role="status">
                  {textos.lembrada}
                </p>
              ) : (
                <>
                  {/* A escolha de guardar no aparelho, com o que guarda e por
                      quanto tempo — ver `lib/carta-secreta/no-browser.ts`. */}
                  <button
                    type="button"
                    className="em-secreta__ligacao"
                    disabled={estado.aLembrar}
                    onClick={lembrar}
                  >
                    {estado.aLembrar ? textos.aLembrar : textos.lembrar}
                  </button>
                  <p className="em-secreta__nota">{textos.lembrarNota}</p>
                </>
              )}
              {estado.erro ? (
                <p className="em-secreta__erro" role="alert">
                  {estado.erro}
                </p>
              ) : null}
              <button
                type="button"
                className="em-secreta__ligacao"
                onClick={() => {
                  esquecerChave();
                  setEstado({ tipo: "fechada" });
                }}
              >
                {textos.fechar}
              </button>
            </div>
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
                  <div className="em-secreta__form" role="status" tabIndex={-1} data-resultado>
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
                    <p className="em-secreta__estado" role="status" tabIndex={-1} data-resultado>
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
                    {/* O que a pessoa aceita, antes de carregar — e a frase que
                        fica na prova do consentimento. */}
                    <p className="em-secreta__nota">
                      {textos.consentimento} <Link href="/privacidade">{textos.privacidade}</Link>
                    </p>
                    {balcao}
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
                <form className="em-secreta__form" action={abrirComEmail}>
                  <label className="em-secreta__campo">
                    <span className="sr-only">{textos.etiqueta}</span>
                    <input
                      type="email"
                      name="email"
                      required
                      autoComplete="email"
                      inputMode="email"
                      placeholder={textos.marcador}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                  {balcao}
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
