"use client";

import { useEffect, useRef } from "react";
import "../app/transicao.css";

/**
 * Onde nascem as folhas, em fração da largura do ecrã. Cada uma abre quando a
 * ponta do ramo lá passa — ver `--tr-pos` em `transicao.css`.
 */
const FOLHAS = [
  { pos: 0.14, lado: "cima" },
  { pos: 0.29, lado: "baixo" },
  { pos: 0.46, lado: "cima" },
  { pos: 0.63, lado: "baixo" },
  { pos: 0.8, lado: "cima" },
] as const;

/**
 * # A transição: o ramo que cresce e a preguiça que vai com ele
 *
 * Ao abrir cada página, um ramo dourado nasce da esquerda e atravessa o ecrã,
 * com a preguiça pendurada na ponta. Quando chega ao outro lado, o pano escuro
 * abre-se e a página está por baixo. Pedido do Tomás, que decidiu que aparece
 * **sempre que se muda de página** — e por isso é curta (1,5s) e salta-se.
 *
 * ## Porque funciona sem JavaScript
 *
 * A animação é CSS puro e começa com o HTML, antes de o React acordar. Se o JS
 * falhar, o pano sai na mesma ao fim de 1,5s — nunca fica ninguém preso atrás
 * dele. O JS aqui serve **só para saltar**: um toque, uma tecla ou a roda do
 * rato, e o pano sai logo.
 *
 * ## Porque repete a cada página
 *
 * Vive no `[locale]/template.tsx`, não no layout. O layout mantém-se entre
 * navegações; o template é montado de novo, e um elemento novo recomeça a
 * animação. Saltos dentro da mesma página (`#onde`, `#top`) não mudam de rota,
 * e por isso não a repetem.
 *
 * ⚠️ Não guarda nada no browser para "só mostrar uma vez" — foi escolhido
 * assim para as páginas de cookies e privacidade continuarem certas.
 *
 * ## A curta, do painel
 *
 * `curta` é a do painel: a mesma cena em pouco mais de meio segundo, e por
 * baixo do topo, que não se mexe (ver `painel.css`). Ali muda-se de secção
 * dezenas de vezes por noite, e 1,5s de cada vez era tempo a mais.
 */
export function Transicao({ curta = false }: { curta?: boolean }) {
  const pano = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = pano.current;
    if (!el) return;

    const saltar = () => {
      el.dataset.saltar = "";
      parar();
    };
    const eventos = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    const parar = () => eventos.forEach((e) => window.removeEventListener(e, saltar));

    eventos.forEach((e) => window.addEventListener(e, saltar, { passive: true }));
    /* Acabou sozinho: já não há nada para saltar. */
    el.addEventListener("animationend", (e) => e.target === el && parar());
    return parar;
  }, []);

  return (
    /* `aria-hidden`: é pintura por cima da página, não conteúdo. O leitor de
       ecrã vai direto à página, que já está no HTML por baixo. */
    <div ref={pano} className={curta ? "tr tr--curta" : "tr"} aria-hidden="true">
      <CenaDoRamo />
    </div>
  );
}

/**
 * O ramo, as folhas e a preguiça — sem o pano à volta nem o tempo.
 *
 * À parte para o painel poder pôr a mesma cena no ecrã de espera de uma secção
 * (`app/painel/(dentro)/loading.tsx`), parada no fim, sem copiar o desenho.
 */
export function CenaDoRamo() {
  return (
    <div className="tr__cena">
      <svg className="tr__ramo" viewBox="0 0 1000 40" preserveAspectRatio="none">
        {/* `non-scaling-stroke`: o SVG estica à largura do ecrã, o traço não
            engrossa nem afina com ele. */}
        <path d="M0 22 C 120 14, 240 27, 380 20 S 640 13, 760 21 S 930 26, 1000 19" />
        <path d="M210 23 q 18 -10 34 -14" />
        <path d="M540 17 q 20 10 38 12" />
        <path d="M835 23 q 14 -9 30 -12" />
      </svg>
      {FOLHAS.map(({ pos, lado }) => (
        <span
          key={pos}
          className="tr__folha"
          data-lado={lado}
          style={{ "--tr-pos": pos } as React.CSSProperties}
        />
      ))}
      <span className="tr__preguica">
        <img src="/marca/preguica.webp" width={325} height={286} alt="" />
      </span>
    </div>
  );
}
