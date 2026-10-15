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
 * O fim da `/ementa`, a seguir aos chás e antes do "Dúvidas?". Fechada à
 * chegada, aberta a quem confirmar um email — com ou sem as novidades da casa.
 *
 * ## O percurso
 *
 * 1. **Fechada:** uma lista desfocada por trás (barras, não nomes — os nomes
 *    nem cá estão), a preguiça e o cadeado por cima, o campo do email e, à
 *    parte, a caixa das novidades — **desmarcada**.
 * 2. O email vai à `/api/newsletter` com `origem: "carta"`, que manda um link.
 * 3. A página de confirmação abre a carta (e inscreve nas novidades, se a
 *    caixa estava marcada), guarda a chave e traz a pessoa de volta, já aberta.
 * 4. **Aberta:** os artigos entram um a um. Por baixo, "lembrar neste
 *    aparelho" e "fechar a carta".
 *
 * ## Porque é que já não é "só para quem está na lista"
 *
 * Revisão legal de 2026-10-15. A carta era o prémio de receber a newsletter, e
 * quem cancelava perdia-a — o que fazia do acesso o preço do consentimento para
 * marketing, contra o que a CNPD escreve (Diretriz 1/2022, § 70). Agora o
 * marketing é uma escolha à parte, e cancelá-lo não fecha a carta. Se a casa
 * quiser outra coisa (abrir a carta sem email nenhum, por exemplo), é decisão
 * dela — está em `docs/decisoes-pendentes.md`.
 *
 * ## A chave no browser
 *
 * No `sessionStorage` por defeito; no `localStorage` só com "lembrar neste
 * aparelho" (90 dias, sem renovar). Ver `lib/carta-secreta/no-browser.ts`.
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
  enviarLink: string;
  aEnviar: string;
  /** A frase da caixa das novidades — vai, tal e qual, para a prova do consentimento. */
  consentimento: string;
  nota: string;
  privacidade: string;
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
  | { tipo: "fechada"; erro?: string; aEnviar?: boolean }
  | { tipo: "enviado"; email: string }
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
  /* Controlados: o React 19 repõe os campos de um `<form action>` quando a
     acção acaba, e o email desaparecia por baixo da mensagem de erro. */
  const [email, setEmail] = useState("");
  const [novidades, setNovidades] = useState(false);
  /* Depois de um pedido feito por quem está a ver, o foco vai para o resultado:
     o formulário onde estava desaparece, e sem isto o foco caía no `<body>` e o
     leitor de ecrã não dizia o que mudou. */
  const focarResultado = useRef(false);

  const erroDoPedido = (status: number) =>
    status === 400 ? textos.erroEmail : status === 429 ? textos.erroLimite : textos.erroServico;

  async function abrirCom(chave: string, lembrar = false): Promise<Resposta | null> {
    try {
      const resposta = await fetch("/api/carta-secreta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chave, lingua: locale, ...(lembrar ? { lembrar: true } : {}) }),
      });
      if (!resposta.ok) return null;
      /* Um 200 que não é JSON (uma página de erro de um proxy pelo meio) conta
         como falha, e não como carta fechada. */
      return (await resposta.json().catch(() => null)) as Resposta | null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (!focarResultado.current) return;
    if (estado.tipo !== "aberta" && estado.tipo !== "enviado") return;
    focarResultado.current = false;
    seccao.current?.querySelector<HTMLElement>("[data-resultado]")?.focus();
  }, [estado]);

  /* Um browser que já confirmou um email abre a carta sozinho. */
  useEffect(() => {
    const guardada = lerChaveGuardada();
    if (!guardada) return;
    void abrirCom(guardada.valor).then((r) => {
      if (!r) return;
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
    // Só à chegada: `abrirCom` muda a cada render, e correr isto outra vez era
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

  async function pedirLink(dados: FormData) {
    setEstado({ tipo: "fechada", aEnviar: true });

    let resposta: Response;
    try {
      resposta = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          novidades,
          origem: "carta",
          sitio: dados.get("sitio"),
          lingua: locale,
        }),
      });
    } catch {
      setEstado({ tipo: "fechada", erro: textos.erroServico });
      return;
    }

    if (!resposta.ok) {
      setEstado({ tipo: "fechada", erro: erroDoPedido(resposta.status) });
      return;
    }
    focarResultado.current = true;
    setEstado({ tipo: "enviado", email });
  }

  async function lembrar() {
    if (estado.tipo !== "aberta") return;
    const guardada = lerChaveGuardada();
    setEstado({ ...estado, aLembrar: true, erro: undefined });
    const r = guardada ? await abrirCom(guardada.valor, true) : null;
    if (r?.aberta && r.chave) {
      guardarChave(r.chave);
      setEstado({ tipo: "aberta", artigos: r.artigos, lembrada: true });
    } else {
      setEstado({ ...estado, aLembrar: false, erro: textos.erroServico });
    }
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
              {estado.tipo === "enviado" ? (
                <div className="em-secreta__form" role="status" tabIndex={-1} data-resultado>
                  <p className="em-secreta__estado">{textos.enviadoTitulo}</p>
                  <p className="em-secreta__nota">
                    {textos.enviadoTexto.replace("{email}", estado.email)}
                  </p>
                  <button
                    type="button"
                    className="em-secreta__ligacao"
                    onClick={() => setEstado({ tipo: "fechada" })}
                  >
                    {textos.outroEmail}
                  </button>
                </div>
              ) : (
                <form className="em-secreta__form" action={pedirLink}>
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
                      aria-invalid={estado.erro ? true : undefined}
                    />
                  </label>
                  {/* O isco para robôs — ver `app/api/newsletter/route.ts`. */}
                  <input
                    type="text"
                    name="sitio"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="pg-convite__isco"
                  />
                  {/* As novidades à parte, desmarcadas: a carta abre-se na
                      mesma. A frase é a que vai para a prova do consentimento. */}
                  <label className="em-secreta__escolha">
                    <input
                      type="checkbox"
                      checked={novidades}
                      onChange={(e) => setNovidades(e.target.checked)}
                    />
                    <span>{textos.consentimento}</span>
                  </label>
                  <button
                    type="submit"
                    className="pg-botao pg-botao--cheio"
                    disabled={estado.aEnviar}
                  >
                    {estado.aEnviar ? textos.aEnviar : textos.enviarLink}
                  </button>
                  {estado.erro ? (
                    <p className="em-secreta__erro" role="alert">
                      {estado.erro}
                    </p>
                  ) : null}
                  <p className="em-secreta__nota">
                    {textos.nota} <Link href="/privacidade">{textos.privacidade}</Link>
                  </p>
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
