"use client";

import { useEffect, useRef } from "react";

/**
 * # O movimento de assinatura: a preguiça atrasa-se
 *
 * Ela está pendurada num fio e desce com a página — **mas nunca ao mesmo
 * ritmo.** Rola-se depressa e ela fica para trás, com o fio a esticar; pára-se e
 * ela chega devagar. É a lentidão transformada em interação, e é a única coisa
 * nesta página que nenhum outro site faz.
 *
 * ## Porque é que isto é JS e não CSS
 *
 * Uma `scroll-timeline` ligava a posição dela à rolagem **exactamente**, que é o
 * contrário do que se quer: o efeito inteiro vive no desfasamento. É preciso um
 * estado que persiga outro sem nunca o apanhar, e isso é um `lerp` por frame.
 *
 * ⚠️ **O motor do scrollcraft não é tocado.** A skill diz para nunca o editar, e
 * isto é markup e JS próprios desta página, como manda o manual. O motor
 * continua byte a byte igual em `public/scrollcraft/scrollcraft.js`.
 *
 * ## Os números, e o que cada um faz
 *
 * - `PERSEGUICAO = 0.055` — quanto do caminho que falta ela percorre por frame.
 *   Mais alto e deixa de haver atraso; mais baixo e ela nunca chega, o que lê
 *   como avaria e não como preguiça. Foi afinado a olho contra a página.
 * - `ESTICAO_MAX = 34` — quanto o corpo se alonga quando o fio está esticado,
 *   em percentagem. É o que dá a sensação de peso.
 * - `BALANCO_MAX = 9` — graus de balanço, tirados da velocidade com que ela se
 *   move. Sem isto parece um ícone a deslizar; com isto parece um animal.
 *
 * ## Acessibilidade
 *
 * `aria-hidden` e `pointer-events: none`: é decoração, não conteúdo, e não deve
 * aparecer a quem usa leitor de ecrã nem apanhar cliques.
 *
 * Com `prefers-reduced-motion` o componente **não monta sequer o loop** — fica
 * uma preguiça parada no sítio. Não é um caso à parte tratado no fim: é a
 * primeira coisa que o efeito verifica.
 */

const PERSEGUICAO = 0.055;
const ESTICAO_MAX = 34;
const BALANCO_MAX = 9;

/** Onde ela vive na altura do ecrã, em fração: 0 é o topo, 1 o fundo. */
const TOPO = 0.12;
const FUNDO = 0.78;

export function Preguica() {
  const raiz = useRef<HTMLDivElement>(null);
  const fio = useRef<HTMLDivElement>(null);
  const corpo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raizEl = raiz.current;
    const fioEl = fio.current;
    const corpoEl = corpo.current;
    if (!raizEl || !fioEl || !corpoEl) return;

    const calmo = window.matchMedia("(prefers-reduced-motion: reduce)");

    /** A posição que a rolagem pede, em píxeis a partir do topo do ecrã. */
    function alvo() {
      const rolavel = document.documentElement.scrollHeight - window.innerHeight;
      const p = rolavel > 0 ? window.scrollY / rolavel : 0;
      return window.innerHeight * (TOPO + (FUNDO - TOPO) * Math.min(1, Math.max(0, p)));
    }

    /* Sem movimento: põe-se no sítio certo e fica lá. O `resize` continua ligado
       porque a posição depende da altura do ecrã, e rodar o telemóvel com ela
       encalhada a meio seria pior do que não ter efeito nenhum. */
    if (calmo.matches) {
      const colocar = () => {
        const y = alvo();
        raizEl.style.setProperty("--y", `${y}px`);
        fioEl.style.setProperty("--fio", `${y}px`);
      };
      colocar();
      window.addEventListener("resize", colocar);
      return () => window.removeEventListener("resize", colocar);
    }

    let atual = alvo();
    let anterior = atual;
    let frame = 0;
    let vivo = true;

    function passo() {
      if (!vivo || !raizEl || !fioEl || !corpoEl) return;

      const destino = alvo();
      /* O coração da coisa: ela anda uma fração do que falta, por isso quanto
         mais longe estiver, mais depressa vai — e quando chega perto, arrasta-se.
         É a curva de quem não tem pressa nenhuma. */
      atual += (destino - atual) * PERSEGUICAO;

      const falta = destino - atual;
      const velocidade = atual - anterior;
      anterior = atual;

      /* O fio estica com a distância que falta, não com a velocidade: o que se
         quer ver é o **peso** dela a ficar para trás. */
      const esticao = Math.min(ESTICAO_MAX, Math.abs(falta) * 0.22);
      const balanco = Math.max(-BALANCO_MAX, Math.min(BALANCO_MAX, velocidade * 0.85));

      raizEl.style.setProperty("--y", `${atual}px`);
      raizEl.style.setProperty("--balanco", `${balanco}deg`);
      corpoEl.style.setProperty("--esticao", `${1 + esticao / 100}`);
      fioEl.style.setProperty("--fio", `${atual}px`);

      frame = requestAnimationFrame(passo);
    }

    frame = requestAnimationFrame(passo);
    return () => {
      vivo = false;
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={raiz} className="pg-preguica" aria-hidden="true">
      {/* O fio vem do topo do ecrã até onde ela está. É um elemento e não uma
          borda porque tem de mudar de altura a cada frame, e animar `height`
          obrigava o browser a refazer o layout 60 vezes por segundo — daí o
          `scaleY` sobre uma altura fixa. */}
      <div ref={fio} className="pg-preguica__fio" />
      <div ref={corpo} className="pg-preguica__corpo">
        {/* `<img>` e não `next/image`: o motivo está no `eslint.config.mjs`,
            junto da excepção que o permite. */}
        <img src="/marca/preguica.webp" alt="" width={325} height={286} />
      </div>
    </div>
  );
}
