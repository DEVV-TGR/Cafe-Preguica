"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/**
 * O convite para a newsletter — o cartão que aparece uns segundos depois de se
 * entrar no site.
 *
 * ## Quando aparece
 *
 * - **8 segundos depois de entrar**, e não logo: quem acabou de chegar ainda
 *   não sabe se gosta da casa, e um pedido de email antes disso é ruído.
 * - **Nunca na `/ementa`.** Os QR das mesas levam lá, e um cartão por cima da
 *   carta a meio de alguém escolher o que pedir estraga a noite em vez de ganhar
 *   um subscritor. Se os 8 segundos acabarem lá, espera pela página seguinte.
 * - **Nunca na página de confirmação**, que é o fim deste mesmo caminho.
 * - **Quem se inscreveu ou o fechou não o volta a ver nesta visita**, e vê-o
 *   outra vez, uma vez, na visita seguinte.
 * - **Quem carregar em "não mostrar mais neste aparelho" não o vê durante seis
 *   meses**, neste browser.
 *
 * ## A memória, e porque é que a página de cookies a menciona
 *
 * "Inscreveu-se" e "fechou" ficam no `sessionStorage`, que o browser apaga ao
 * fechar o separador — é isso que faz a próxima visita ser uma visita nova.
 * "Não mostrar mais" fica no `localStorage`, com a data em que deixa de valer,
 * e sai sozinho à primeira leitura depois disso.
 *
 * Até à revisão legal de 2026-10-15, "inscreveu-se" ficava no `localStorage`
 * sem prazo — mesmo que a pessoa nunca confirmasse. Guardar no aparelho de
 * quem visita pede consentimento, a não ser que seja estritamente necessário
 * para o que a pessoa pediu (Lei 41/2004, art. 5.º): uma nota de sessão para
 * não repetir o convite cabe nisso; uma nota para sempre, que ninguém pediu,
 * não. A nota de seis meses existe porque a pessoa a pede ao carregar no botão,
 * e o botão diz quanto tempo fica. A nota antiga apaga-se à chegada.
 *
 * Nenhuma é um cookie: não viajam nos pedidos, não têm identificador, e não
 * saem do aparelho. Vivem dentro de `try`: numa janela privada do Safari, ou
 * com o armazenamento bloqueado, o acesso atira. Nesse caso o convite
 * comporta-se como numa primeira visita, que é o pior que pode acontecer.
 *
 * ## Não é modal, de propósito
 *
 * Não escurece a página, não prende o foco e não obriga a responder. Quem está a
 * ler continua a ler; quem usa leitor de ecrã não é arrancado do sítio onde
 * estava — e por isso é um `<aside>` com nome (um marco que o leitor de ecrã
 * lista), e não um `role="dialog"`, que promete um diálogo que não existe.
 * Fecha-se com o ×, com o Esc, ou ignorando-o.
 *
 * O Esc é dele só quando não há um `<dialog>` aberto: com uma fotografia aberta
 * no visor, o Esc é do visor. Já foi dos dois — fechava a fotografia e o
 * convite ao mesmo tempo, e o convite não voltava nessa visita.
 *
 * ## Pára no rodapé
 *
 * O cartão fica fixo no canto de baixo, e no fim da página é aí que está o
 * rodapé — com o "feito por" da DevPlus. Quando o rodapé entra no ecrã, o cartão
 * sobe o mesmo que ele e fica pousado por cima, como se o rodapé o empurrasse:
 * desce com a página até lá chegar, e dali não passa. Sem espaço acrescentado
 * à página.
 */

const MEMORIA = "preguica:newsletter";
const NAO_MOSTRAR = "preguica:newsletter:nao-mostrar";
const NAO_MOSTRAR_MS = 183 * 24 * 60 * 60 * 1000;
const ESPERA_MS = 8000;

export type TextosDoConvite = {
  olho: string;
  titulo: string;
  texto: string;
  etiqueta: string;
  marcador: string;
  botao: string;
  aEnviar: string;
  fechar: string;
  naoMostrar: string;
  consentimento: string;
  privacidade: string;
  enviadoTitulo: string;
  enviadoTexto: string;
  jaTitulo: string;
  jaTexto: string;
  erroEmail: string;
  erroLimite: string;
  erroServico: string;
};

type Estado =
  | { tipo: "formulario"; erro?: string }
  | { tipo: "a-enviar" }
  | { tipo: "enviado" }
  | { tipo: "ja-inscrito" }
  | { tipo: "fechado" };

function ler(armazem: () => Storage): string | null {
  try {
    return armazem().getItem(MEMORIA);
  } catch {
    return null;
  }
}

function guardar(armazem: () => Storage, valor: string): void {
  try {
    armazem().setItem(MEMORIA, valor);
  } catch {
    /* Sem memória, o convite volta na próxima página — pior, mas não partido. */
  }
}

/* "Não mostrar mais" ainda vale? Se já passou, sai daqui. */
function naoMostrarAinda(): boolean {
  try {
    const ate = Number(localStorage.getItem(NAO_MOSTRAR));
    if (ate > Date.now()) return true;
    localStorage.removeItem(NAO_MOSTRAR);
  } catch {}
  return false;
}

function podeAparecerAqui(caminho: string): boolean {
  return !caminho.startsWith("/ementa") && !caminho.startsWith("/newsletter");
}

export function Convite({ locale, textos }: { locale: Locale; textos: TextosDoConvite }) {
  const caminho = usePathname();
  const [passouOTempo, setPassouOTempo] = useState(false);
  const [estado, setEstado] = useState<Estado>({ tipo: "formulario" });
  const idTitulo = useId();
  const idErro = useId();
  const cartao = useRef<HTMLElement>(null);
  /* Controlado, e não deixado ao browser: o React 19 repõe os campos de um
     `<form action>` quando a acção acaba, e acabava também quando dava erro —
     o email desaparecia por baixo da mensagem que pedia para o corrigir. */
  const [email, setEmail] = useState("");

  /* O relógio conta uma vez por visita: o layout não volta a montar ao mudar de
     página, portanto este efeito também não. */
  useEffect(() => {
    /* A nota antiga, sem prazo, de antes da revisão legal. */
    try {
      localStorage.removeItem(MEMORIA);
    } catch {}
    if (ler(() => sessionStorage)) return;
    if (naoMostrarAinda()) return;

    const relogio = window.setTimeout(() => setPassouOTempo(true), ESPERA_MS);
    return () => window.clearTimeout(relogio);
  }, []);

  /* Calculado, e não guardado: se o relógio acabar na ementa, o cartão fica à
     espera e aparece na primeira página seguinte onde possa aparecer. */
  const visivel = passouOTempo && estado.tipo !== "fechado" && podeAparecerAqui(caminho);

  function fechar(paraSempre = false) {
    if (estado.tipo !== "enviado" && estado.tipo !== "ja-inscrito") {
      guardar(() => sessionStorage, "fechado");
    }
    if (paraSempre) {
      try {
        localStorage.setItem(NAO_MOSTRAR, String(Date.now() + NAO_MOSTRAR_MS));
      } catch {}
    }
    /* Quem fechou pelo teclado tinha o foco cá dentro, e o cartão vai
       desaparecer com ele: o foco passa para o conteúdo da página, em vez de
       cair no `<body>` e recomeçar do topo. */
    if (cartao.current?.contains(document.activeElement)) {
      const principal = document.querySelector<HTMLElement>("main");
      if (principal) {
        if (!principal.hasAttribute("tabindex")) principal.tabIndex = -1;
        principal.focus({ preventScroll: true });
      }
    }
    setEstado({ tipo: "fechado" });
  }

  useEffect(() => {
    if (!visivel) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector("dialog[open]")) return;
      fechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  });

  /* Quanto do rodapé já entrou no ecrã é o quanto o cartão sobe. Mexe-se no
     estilo direto, e não em estado do React: corre a cada evento de rolagem. */
  useEffect(() => {
    const elemento = cartao.current;
    if (!visivel || !elemento) return;
    let pedido = 0;
    const ajustar = () => {
      cancelAnimationFrame(pedido);
      pedido = requestAnimationFrame(() => {
        const rodape = document.querySelector(".pg-rodape");
        const dentro = rodape ? window.innerHeight - rodape.getBoundingClientRect().top : 0;
        elemento.style.translate = dentro > 0 ? `0 ${-Math.ceil(dentro)}px` : "";
      });
    };
    ajustar();
    window.addEventListener("scroll", ajustar, { passive: true });
    window.addEventListener("resize", ajustar);
    return () => {
      cancelAnimationFrame(pedido);
      window.removeEventListener("scroll", ajustar);
      window.removeEventListener("resize", ajustar);
    };
    /* O caminho conta: mudar de página troca o rodapé. */
  }, [visivel, caminho]);

  async function inscrever(dados: FormData) {
    setEstado({ tipo: "a-enviar" });

    let resposta: Response;
    try {
      resposta = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          sitio: dados.get("sitio"),
          lingua: locale,
        }),
      });
    } catch {
      setEstado({ tipo: "formulario", erro: textos.erroServico });
      return;
    }

    if (resposta.ok) {
      /* A partir daqui a pessoa já disse que quer: nesta visita o convite não
         volta, confirme ou não no email. */
      guardar(() => sessionStorage, "inscrito");
      const corpo = (await resposta.json().catch(() => ({}))) as { jaInscrito?: boolean };
      setEstado({ tipo: corpo.jaInscrito ? "ja-inscrito" : "enviado" });
      return;
    }

    const erro =
      resposta.status === 400
        ? textos.erroEmail
        : resposta.status === 429
          ? textos.erroLimite
          : textos.erroServico;
    setEstado({ tipo: "formulario", erro });
  }

  if (!visivel) return null;

  return (
    <aside ref={cartao} className="pg-convite" aria-labelledby={idTitulo}>
      {/* A preguiça pendurada na borda, como no topo da inicial. É decorativa,
          e por isso `alt` vazio. */}
      <img
        className="pg-convite__preguica"
        src="/marca/preguica.webp"
        alt=""
        width={325}
        height={286}
      />

      <button type="button" className="pg-convite__fechar" onClick={() => fechar()} aria-label={textos.fechar}>
        <span aria-hidden="true">×</span>
      </button>

      {estado.tipo === "enviado" || estado.tipo === "ja-inscrito" ? (
        <div role="status">
          <p className="pg-convite__olho">{textos.olho}</p>
          <h2 id={idTitulo} className="pg-convite__titulo">
            {estado.tipo === "enviado" ? textos.enviadoTitulo : textos.jaTitulo}
          </h2>
          <p className="pg-convite__texto">
            {estado.tipo === "enviado" ? textos.enviadoTexto : textos.jaTexto}
          </p>
        </div>
      ) : (
        <>
          <p className="pg-convite__olho">{textos.olho}</p>
          <h2 id={idTitulo} className="pg-convite__titulo">
            {textos.titulo}
          </h2>
          <p className="pg-convite__texto">{textos.texto}</p>

          <form action={inscrever} className="pg-convite__form">
            <label className="pg-convite__campo">
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
                aria-invalid={estado.tipo === "formulario" && estado.erro ? true : undefined}
                aria-describedby={estado.tipo === "formulario" && estado.erro ? idErro : undefined}
                className="pg-convite__entrada"
              />
            </label>

            {/* O isco para robôs — ver `app/api/newsletter/route.ts`. Fora do
                ecrã e fora do tabulador, e o leitor de ecrã também o salta. */}
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
              className="pg-botao pg-botao--cheio pg-convite__botao"
              disabled={estado.tipo === "a-enviar"}
            >
              {estado.tipo === "a-enviar" ? textos.aEnviar : textos.botao}
            </button>
          </form>

          {estado.tipo === "formulario" && estado.erro ? (
            <p id={idErro} className="pg-convite__erro" role="alert">
              {estado.erro}
            </p>
          ) : null}

          {/* O que a pessoa aceita, escrito antes de carregar no botão — é isto
              que faz a inscrição ser um consentimento informado, sem precisar
              de uma caixa para marcar. Ver `docs/NEWSLETTER.md`. */}
          <p className="pg-convite__nota">
            {textos.consentimento} <Link href="/privacidade">{textos.privacidade}</Link>
          </p>
        </>
      )}

      {/* O pedido de não voltar a ver o convite, e por quanto tempo — é o que
          justifica a nota que fica no browser (ver o cabeçalho). */}
      <button type="button" className="pg-convite__nao-mostrar" onClick={() => fechar(true)}>
        {textos.naoMostrar}
      </button>
    </aside>
  );
}
