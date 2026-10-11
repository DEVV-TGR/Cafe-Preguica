import { quadrosDaDeixa, quadrosDaInteracao } from "./quadros-da-rolagem";

/* O TypeScript ainda não declara ViewTimeline nem os limites de uma animação
   ligada à rolagem. A deteção é de capacidade, para preservar o motor nos
   browsers que ainda não oferecem esta API. */
type ConstrutorDaLinha = new (opcoes: {
  subject: Element;
  axis: "block";
}) => AnimationTimeline;

type OpcoesDaRolagem = KeyframeAnimationOptions & {
  rangeStart: string;
  rangeEnd: string;
};

/**
 * O browser conhece a posição da rolagem no compositor, mesmo quando ainda
 * não entregou um evento `scroll` ao JavaScript. Os carris e as deixas usam
 * essa posição diretamente; o motor continua a tratar os restantes efeitos
 * e o foco. Uma transição para cada destino atrasava e podia inverter o
 * movimento quando a barra do Safari mudava de altura.
 */
export function montarRolagemNativa(raiz: HTMLElement): () => void {
  const construtor = (window as Window & { ViewTimeline?: ConstrutorDaLinha }).ViewTimeline;
  if (!construtor || !CSS.supports("animation-range", "contain 0% contain 100%")) {
    return () => {};
  }
  const Linha = construtor;

  const preferencia = window.matchMedia("(prefers-reduced-motion: reduce)");
  let limpar = () => {};

  function montar() {
    limpar();
    if (preferencia.matches) return;

    const animacoes: Animation[] = [];
    const elementos: HTMLElement[] = [];
    const carris: HTMLElement[] = [];
    const observador = new ResizeObserver(medirCarris);

    function medirCarris() {
      for (const carril of carris) {
        const excesso = Math.max(0, carril.scrollWidth - innerWidth);
        const extra = Number(carril.dataset.scPan) || 0;
        carril.style.setProperty("--pg-carril-fim", `${-excesso * (1 + extra)}px`);
      }
    }

    for (const acto of raiz.querySelectorAll<HTMLElement>(
      '[data-sc-act="pan"], [data-sc-act="pin"]',
    )) {
      const linha = new Linha({ subject: acto, axis: "block" });
      const opcoes: OpcoesDaRolagem = {
        timeline: linha,
        rangeStart: "contain 0%",
        rangeEnd: "contain 100%",
        fill: "both",
        easing: "linear",
      };
      const carril = acto.querySelector<HTMLElement>("[data-sc-pan]");
      if (carril) {
        carris.push(carril);
        observador.observe(carril);
        animar(carril, [
          { transform: "translate3d(0,0,0)" },
          { transform: "translate3d(var(--pg-carril-fim),0,0)" },
        ]);
      }
      for (const deixa of acto.querySelectorAll<HTMLElement>("[data-sc-cue]")) {
        if (deixa.hasAttribute("data-sc-kinetic")) continue;
        const subida = Number.parseFloat(deixa.dataset.scRise ?? "1");
        animar(deixa, quadrosDaDeixa(deixa.dataset.scCue ?? "", subida));
        /* A interação também segue a timeline, mas num efeito separado para
           não impedir a composição da opacidade e da transformação. */
        animacoes.push(deixa.animate(quadrosDaInteracao(deixa.dataset.scCue ?? ""), opcoes));
      }

      function animar(elemento: HTMLElement, quadros: Keyframe[]) {
        elementos.push(elemento);
        elemento.classList.add("pg-rolagem-nativa");
        animacoes.push(elemento.animate(quadros, opcoes));
      }
    }
    medirCarris();
    window.addEventListener("resize", medirCarris, { passive: true });

    limpar = () => {
      observador.disconnect();
      window.removeEventListener("resize", medirCarris);
      for (const animacao of animacoes) animacao.cancel();
      for (const elemento of elementos) elemento.classList.remove("pg-rolagem-nativa");
      for (const carril of carris) carril.style.removeProperty("--pg-carril-fim");
    };
  }

  montar();
  preferencia.addEventListener("change", montar);
  return () => {
    preferencia.removeEventListener("change", montar);
    limpar();
  };
}
