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

export function Motor() {
  const montado = useRef(false);

  const montar = useCallback(() => {
    if (montado.current || !window.ScrollCraft) return;
    window.ScrollCraft.mount(document.body);
    montado.current = true;

    /* Quem chega com `/#onde` (a barra, noutra página, ou um link partilhado)
       já foi rolado pelo browser **antes** de o motor esticar os actos presos,
       e ficava a meio da página. Depois de o motor assentar, salta-se outra vez. */
    const alvo = decodeURIComponent(location.hash.slice(1));
    if (alvo) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => document.getElementById(alvo)?.scrollIntoView()),
      );
    }
  }, []);

  useEffect(() => {
    montar();
  }, [montar]);

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
