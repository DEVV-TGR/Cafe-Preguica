"use client";

import { useEffect, useRef } from "react";

/**
 * # A linha de progresso — quanto da página já se leu
 *
 * Um fio dourado no topo do ecrã, que enche da esquerda para a direita à
 * medida que se desce. Está em todas as páginas (pedido do Tomás), para quem
 * lê saber sempre quanto falta — na ementa, com 125 artigos, é o que mais
 * ajuda.
 *
 * Substitui a linha do motor do scrollcraft, que só existia na inicial e vinha
 * com a cor por omissão do motor, um verde-lima que não era da casa.
 *
 * Não se anima com CSS (`animation-timeline: scroll()`) porque o Firefox ainda
 * não o suporta. Aqui lê-se a rolagem uma vez por frame, e só escreve um
 * `transform` — não toca no layout.
 */
export function Progresso() {
  const linha = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = linha.current;
    if (!el) return;

    let pedido = 0;
    const medir = () => {
      pedido = 0;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      /* Uma página que cabe no ecrã já está lida toda: a linha vai cheia. */
      const p = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 1;
      el.style.transform = `scaleX(${p.toFixed(4)})`;
    };
    const agendar = () => {
      if (!pedido) pedido = requestAnimationFrame(medir);
    };

    /* A altura muda depois de carregar — o motor da inicial estica os actos
       presos, as imagens chegam — e a conta tem de a acompanhar. */
    const observador = new ResizeObserver(agendar);
    observador.observe(document.body);
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    agendar();

    return () => {
      cancelAnimationFrame(pedido);
      observador.disconnect();
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
    };
  }, []);

  return <span ref={linha} className="pg-progresso" aria-hidden="true" />;
}
