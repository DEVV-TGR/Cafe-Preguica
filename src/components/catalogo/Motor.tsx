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
 * O `montado` garante que as duas vias juntas montam **uma vez só** — montar
 * duas vezes deixava dois loops de `requestAnimationFrame` a escrever nas mesmas
 * propriedades.
 */

declare global {
  interface Window {
    ScrollCraft?: {
      mount: (raiz: Element | Document) => unknown;
      instances: unknown[];
    };
  }
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

export function Motor() {
  const montado = useRef(false);

  const montar = useCallback(() => {
    if (montado.current || !window.ScrollCraft) return;
    window.ScrollCraft.mount(document.body);
    montado.current = true;

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
        /* Já está no sítio: a reposição volta ao normal, para as páginas
           seguintes a herdarem ligada. Ver o `pagehide` abaixo. */
        history.scrollRestoration = "auto";
      }),
    );
  }, []);

  useEffect(() => {
    montar();
  }, [montar]);

  /* Recarregar a inicial a meio abria-a a meio: o browser repõe a posição, e
     fá-lo depois de a página carregar, a ganhar ao salto para o topo. Por isso,
     no instante de sair, pede-se ao browser que não a reponha.

     ⚠️ Só nesse instante, e desfaz-se logo a seguir (em `montar`): esta regra
     fica guardada na entrada do histórico **e passa para as páginas que se
     abrem a seguir**. Deixada ligada, a ementa deixava de lembrar onde se ia
     na carta ao voltar à frente — já aconteceu. */
  useEffect(() => {
    const aoSair = () => {
      history.scrollRestoration = "manual";
    };
    window.addEventListener("pagehide", aoSair);
    window.addEventListener("hashchange", esquecerSeccao);
    return () => {
      window.removeEventListener("pagehide", aoSair);
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
    />
  );
}
