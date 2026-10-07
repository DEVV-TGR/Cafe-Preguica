"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

/**
 * Arranca o motor do scrollcraft.
 *
 * ⚠️ **O motor não arranca sozinho, e isso apanha quem vem do exemplo da skill.**
 * O ficheiro só define `window.ScrollCraft`; quem o põe a trabalhar é uma
 * chamada a `mount()`. No `template.html` da skill isso é a última linha do
 * `<body>`, mas num sítio em Next não há onde escrever essa linha — daí este
 * componente.
 *
 * Sem ele a página carrega inteira e correcta, com os sete actos no HTML e o
 * `<script>` servido com 200, **e nada se mexe**. É uma avaria silenciosa: não
 * há erro na consola, não há pedido falhado, só `document.documentElement` sem
 * a classe `sc-ready` que o motor acrescenta quando monta. Foi assim que foi
 * encontrada.
 *
 * ## Porque é que há duas formas de montar
 *
 * O `onLoad` do `next/script` dispara quando o ficheiro acaba de descarregar —
 * é o caminho normal, na primeira visita. Mas numa navegação do lado do cliente
 * (sair para a ementa e voltar) o Next **não volta a descarregar** um script que
 * já tem, portanto o `onLoad` não dispara outra vez e a página voltava sem
 * movimento nenhum.
 *
 * O `useEffect` cobre esse caso: se o `window.ScrollCraft` já lá estiver, monta.
 * A `instancia` garante que as duas vias juntas montam **uma vez só** — montar
 * duas vezes deixava dois loops de `requestAnimationFrame` a escrever nas mesmas
 * propriedades — e é o que se desmonta ao sair (ver `desmontar`).
 */

/*
  O que o `mount()` devolve, e só o que este ficheiro usa. Os três arrays são os
  do próprio motor (não cópias): esvaziá-los é o que pára uma instância antiga.
  Ver `desmontar`.
*/
type InstanciaDoMotor = {
  acts: { raw: number; p: number }[];
  worlds: unknown[];
  clips: unknown[];
};

declare global {
  interface Window {
    ScrollCraft?: {
      mount: (raiz: Element | Document) => InstanciaDoMotor;
      instances: InstanciaDoMotor[];
    };
  }
}

/* Posta no `<html>` quando o motor não chega a montar. O `catalogo-motor.css`
   mostra então o conteúdo que o motor devia revelar. */
const SEM_MOTOR = "sc-sem-motor";

/* Quanto se espera pelo motor antes de mostrar a página sem ele. É servido do
   próprio domínio e pesa pouco; se ao fim disto ainda não montou, há qualquer
   coisa no caminho (bloqueador, rede partida, um erro). Se montar depois, a
   classe sai e o movimento volta. */
const PRAZO_DO_MOTOR_MS = 4000;

/*
  ⚠️ **O motor não tem `destroy`, e não se edita** (`public/scrollcraft/` é de
  terceiros). Cada visita à inicial monta uma instância nova sobre o `body`, e
  as antigas ficavam vivas para sempre: o ciclo de `requestAnimationFrame`, os
  ouvintes de `scroll` a escrever estilos em actos que já não estão na página
  (e a segurar o DOM antigo inteiro na memória), e a cor de fundo do acto
  antigo a competir com a do novo. Três idas à ementa e regresso deixavam
  quatro instâncias.

  O que dá para fazer de fora: esvaziar os arrays que o motor percorre — os
  mesmos que ele expõe em `instances` — e pôr a zero o progresso dos actos
  antigos, que é o que a cor de fundo lê. A instância continua a existir, mas
  cada passagem passa a percorrer listas vazias e o DOM antigo fica livre para
  ser recolhido. O que fica é um ciclo de animação vazio e três ouvintes que
  não fazem nada, por visita — o limite do que se consegue sem tocar no motor.
*/
function desmontar(instancia: InstanciaDoMotor) {
  for (const acto of instancia.acts) {
    acto.raw = 0;
    acto.p = 0;
  }
  instancia.acts.length = 0;
  instancia.worlds.length = 0;
  instancia.clips.length = 0;
  const lista = window.ScrollCraft?.instances;
  const i = lista?.indexOf(instancia) ?? -1;
  if (lista && i >= 0) lista.splice(i, 1);
}

/**
 * Tira o `#secção` do endereço depois de o salto estar feito. O endereço é o
 * que o browser relê ao recarregar: com `/#onde` lá, recarregar abria a página
 * no fundo. Usa `history.state` para não apagar o estado do router do Next.
 */
function esquecerSeccao() {
  if (!location.hash) return;
  history.replaceState(history.state, "", location.pathname + location.search);
}

/**
 * Volta a ligar a reposição da posição, desligada no `pagehide` (ver abaixo),
 * para as páginas seguintes a herdarem ligada.
 *
 * ⚠️ **Só depois do `load`.** O browser repõe a posição ao recarregar por
 * volta do `load`, e o motor monta antes disso (~45ms). Ligada no momento de
 * montar, o browser ainda a encontrava ligada e repunha a posição antiga —
 * em produção, uma vez sim, outra não, conforme a rede. Localmente o `load` é
 * instantâneo e o erro não aparecia.
 */
function religarReposicao(seccao: HTMLElement | null) {
  const ligar = () =>
    setTimeout(() => {
      history.scrollRestoration = "auto";
      if (!seccao) window.scrollTo(0, 0);
    }, 0);
  if (document.readyState === "complete") ligar();
  else window.addEventListener("load", ligar, { once: true });
}

/** Visível na janela, e não só no documento. */
function aVista(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.left >= 0 && r.right <= innerWidth && r.bottom > 0 && r.top < innerHeight;
}

/*
  A rolagem que põe à vista um elemento que recebeu o foco num acto preso.

  ⚠️ **O teclado não chegava a metade da inicial.** Os cartões dos dois carris
  (cocktails e pratos) estão num palco com `overflow: clip` e são deslocados
  pelo motor com `transform`; o browser, ao focar, só sabe rolar a página na
  vertical, e o foco caía em cartões fora do ecrã (medido: sete em 70 Tabs). Nas
  celas dos Reels, o motor só trata o foco centrando o acto, que não chega às
  celas que entram mais tarde — o foco ficava em links com opacidade 0. Quem
  navega por teclado via o anel de foco desaparecer.

  O motor não se edita, mas as contas dele são públicas no código:
  - num acto preso, `p = (scrollY − topo) / (altura − ecrã)`;
  - o carril anda `−(excesso × (1 + data-sc-pan)) × p`, sem suavização;
  - um `data-sc-cue="de [até]"` está aceso com `p` dentro dessa janela.

  Daqui sai o `scrollY` que mostra o elemento: no carril, o que o põe ao centro
  do ecrã; num cue, o meio da janela dele. Nenhum acto da inicial usa
  `data-sc-dwell`; se algum vier a usar, esta conta deixa de bater certo.
*/
function rolagemParaMostrar(el: HTMLElement): number | null {
  const acto = el.closest<HTMLElement>('[data-sc-act="pan"], [data-sc-act="pin"]');
  if (!acto) return null;

  const percurso = acto.offsetHeight - innerHeight;
  if (percurso <= 0) return null;
  const topo = acto.getBoundingClientRect().top + scrollY;

  let p: number | null = null;
  const cue = el.closest<HTMLElement>("[data-sc-cue]");
  const carril = el.closest<HTMLElement>("[data-sc-pan]");

  if (cue && acto.contains(cue)) {
    if (Number(getComputedStyle(cue).opacity) > 0.85 && aVista(el)) return null;
    const [de = 0, ate] = (cue.dataset.scCue ?? "").trim().split(/\s+/).map(Number);
    p = ate === undefined || Number.isNaN(ate) ? Math.min(1, de + 0.2) : (de + ate) / 2;
  } else if (carril && acto.contains(carril)) {
    if (aVista(el)) return null;
    const excesso = carril.scrollWidth - innerWidth;
    if (excesso <= 0) return null;
    const total = excesso * (1 + (Number(carril.dataset.scPan) || 0));
    const deslocado = new DOMMatrixReadOnly(getComputedStyle(carril).transform).m41;
    /* O carril dos pratos está ao espelho (`.pg-pratos-espelho`): lá, o mesmo
       deslocamento leva o cartão para o outro lado do ecrã. */
    let sinal = 1;
    for (let e = carril.parentElement; e && e !== acto; e = e.parentElement) {
      const t = getComputedStyle(e).transform;
      if (t !== "none" && new DOMMatrixReadOnly(t).a < 0) sinal = -sinal;
    }
    const r = el.getBoundingClientRect();
    const alvo = deslocado + ((innerWidth - r.width) / 2 - r.left) * sinal;
    p = -alvo / total;
  }

  if (p === null || Number.isNaN(p)) return null;
  return topo + Math.min(1, Math.max(0, p)) * percurso;
}

export function Motor() {
  const instancia = useRef<InstanciaDoMotor | null>(null);

  const montar = useCallback(() => {
    if (instancia.current || !window.ScrollCraft) return;
    instancia.current = window.ScrollCraft.mount(document.body);
    document.documentElement.classList.remove(SEM_MOTOR);

    /* ⚠️ **A inicial abre sempre no topo** (pedido do Tomás). A exceção é quem
       pediu uma secção de propósito — um link "A casa" na barra de outra
       página, que chega como `/#casa`. Esse já foi rolado pelo browser
       **antes** de o motor esticar os actos presos, e ficava a meio; por isso
       salta-se outra vez depois de o motor assentar. `#top` é o logótipo. */
    const alvo = decodeURIComponent(location.hash.slice(1));
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const seccao = alvo && alvo !== "top" ? document.getElementById(alvo) : null;
        if (seccao) seccao.scrollIntoView();
        else window.scrollTo(0, 0);
        esquecerSeccao();
        religarReposicao(seccao);
      }),
    );
  }, []);

  useEffect(() => {
    montar();
    const prazo = window.setTimeout(() => {
      if (!instancia.current) document.documentElement.classList.add(SEM_MOTOR);
    }, PRAZO_DO_MOTOR_MS);
    return () => {
      window.clearTimeout(prazo);
      document.documentElement.classList.remove(SEM_MOTOR);
      if (instancia.current) desmontar(instancia.current);
      instancia.current = null;
    };
  }, [montar]);

  /* Recarregar a inicial a meio abria-a a meio: o browser repõe a posição, e
     fá-lo depois de a página carregar, a ganhar ao salto para o topo. Por isso,
     no instante de sair, pede-se ao browser que não a reponha.

     ⚠️ Só nesse instante, e desfaz-se logo a seguir (em `montar`): esta regra
     fica guardada na entrada do histórico **e passa para as páginas que se
     abrem a seguir**. Deixada ligada, a ementa deixava de lembrar onde se ia
     na carta ao voltar à frente — já aconteceu. */
  /* O foco por teclado nos actos presos — ver `rolagemParaMostrar`. Depois do
     salto do próprio browser (e do do motor, que só centra o acto), e só com o
     motor a mexer: com "reduzir movimento" ou sem motor, os carris já estão
     em grelha e o salto normal chega. */
  useEffect(() => {
    let pedido = 0;
    const aoFocar = (e: FocusEvent) => {
      if (!instancia.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;
      cancelAnimationFrame(pedido);
      pedido = requestAnimationFrame(() => {
        const alvo = rolagemParaMostrar(el);
        if (alvo !== null) window.scrollTo({ top: alvo, behavior: "instant" });
      });
    };
    document.addEventListener("focusin", aoFocar);
    return () => {
      cancelAnimationFrame(pedido);
      document.removeEventListener("focusin", aoFocar);
    };
  }, []);

  useEffect(() => {
    const aoSair = () => {
      history.scrollRestoration = "manual";
    };
    /* Voltar à inicial pelo bfcache não volta a montar nada, e a regra ficava
       `manual` — e passava às páginas seguintes, que é o defeito que o
       `religarReposicao` existe para evitar. */
    const aoVoltar = (e: PageTransitionEvent) => {
      if (e.persisted) history.scrollRestoration = "auto";
    };
    window.addEventListener("pagehide", aoSair);
    window.addEventListener("pageshow", aoVoltar);
    window.addEventListener("hashchange", esquecerSeccao);
    return () => {
      window.removeEventListener("pagehide", aoSair);
      window.removeEventListener("pageshow", aoVoltar);
      window.removeEventListener("hashchange", esquecerSeccao);
    };
  }, []);

  return (
    /* Servido do próprio domínio, e é isso que deixa a CSP manter
       `script-src 'self'`. O passo do CI que recusa recursos de terceiros vigia
       que continue assim. */
    <Script
      src="/scrollcraft/scrollcraft.js"
      strategy="afterInteractive"
      onLoad={montar}
      /* Bloqueado ou partido: o conteúdo que o motor revelaria tem de
         aparecer na mesma. Ver `.sc-sem-motor` no `catalogo-motor.css`. */
      onError={() => document.documentElement.classList.add(SEM_MOTOR)}
    />
  );
}
