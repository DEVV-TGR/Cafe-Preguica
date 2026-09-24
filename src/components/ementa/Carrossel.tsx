"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

/**
 * # As fotografias que abrem cada capítulo da carta
 *
 * Com uma fotografia só, é o que sempre foi: a fotografia, a legenda e o título
 * por cima. Com várias, passam sozinhas — a casa quer que a carta mostre mais do
 * que um prato por capítulo.
 *
 * ## Deslizar é do browser
 *
 * A faixa é um `overflow-x` com `scroll-snap`: o dedo, o trackpad e as setas do
 * teclado já sabem mexer nela, sem biblioteca e sem reimplementar a física de um
 * deslizar. Este componente só acrescenta o relógio e os pontos.
 *
 * ## O relógio sabe quando se calar
 *
 * - Muda a cada 5 segundos, **só com o carrossel no ecrã** e o separador visível
 *   — uma fotografia a mudar onde ninguém a vê é trabalho para nada.
 * - Pára enquanto o rato está por cima ou o foco está lá dentro, e retoma a
 *   seguir.
 * - **Um toque, um deslizar ou um ponto param-no de vez**: a pessoa tomou conta,
 *   e uma fotografia a fugir-lhe da mão a seguir é irritante.
 * - Tem um botão de pausa, que é o que as regras de acessibilidade pedem a
 *   qualquer coisa que mexe sozinha mais de cinco segundos.
 * - Com "reduzir movimento" no sistema não arranca.
 */

export type FotoDoCarrossel = {
  src: string;
  srcSet: string;
  alt: string;
  /** "Negroni · 7,00 €" — já escrito no servidor, com os escondidos de fora. */
  legenda: string[];
};

export type TextosDoCarrossel = {
  naFotografia: string;
  /** O nome do capítulo, para o leitor de ecrã saber de que carrossel se trata. */
  nome: string;
  /** "Fotografia {n} de {total}" — os números são trocados aqui, por fotografia. */
  rotuloDaFoto: string;
  pausar: string;
  continuar: string;
};

const INTERVALO_MS = 5000;
const SIZES = "(min-width: 72rem) 72rem, 100vw";

/* O "reduzir movimento" lido como loja externa: muda sozinho se a pessoa mexer
   na definição com a página aberta, e no servidor conta como reduzido — o
   relógio só arranca no browser, de qualquer forma. */
const consultaReduzir = "(prefers-reduced-motion: reduce)";
function subscreverReduzir(aviso: () => void) {
  const mq = window.matchMedia(consultaReduzir);
  mq.addEventListener("change", aviso);
  return () => mq.removeEventListener("change", aviso);
}

function Legenda({ fotografia, rotulo }: { fotografia: FotoDoCarrossel; rotulo: string }) {
  if (fotografia.legenda.length === 0) return null;
  return (
    <figcaption className="em-abertura__legenda">
      <span>{rotulo}</span>
      {fotografia.legenda.map((linha) => (
        <span key={linha}>{linha}</span>
      ))}
    </figcaption>
  );
}

export function Carrossel({
  fotos,
  titulo,
  textos,
  prioridade = false,
}: {
  fotos: FotoDoCarrossel[];
  /** O número e o `<h2>` do capítulo — fica por cima de todas as fotografias. */
  titulo: ReactNode;
  textos: TextosDoCarrossel;
  /** O primeiro capítulo carrega a primeira fotografia logo; os outros esperam. */
  prioridade?: boolean;
}) {
  const faixa = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [tomouConta, setTomouConta] = useState(false);
  const [emCima, setEmCima] = useState(false);
  const [noEcra, setNoEcra] = useState(false);
  const reduzir = useSyncExternalStore(
    subscreverReduzir,
    () => window.matchMedia(consultaReduzir).matches,
    () => true,
  );

  const total = fotos.length;
  const varias = total > 1;

  /* No ecrã e com o separador visível — as duas coisas, numa só. */
  useEffect(() => {
    const el = faixa.current;
    if (!varias || !el) return;

    let visivel = false;
    const atualizar = () => setNoEcra(visivel && document.visibilityState === "visible");
    const observador = new IntersectionObserver(
      ([entrada]) => {
        visivel = entrada.isIntersecting;
        atualizar();
      },
      { threshold: 0.5 },
    );
    observador.observe(el);
    document.addEventListener("visibilitychange", atualizar);
    return () => {
      observador.disconnect();
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [varias]);

  function irPara(indice: number) {
    const el = faixa.current;
    if (!el) return;
    el.scrollTo({ left: indice * el.clientWidth, behavior: reduzir ? "auto" : "smooth" });
  }

  /* O relógio. Depende do `atual`, por isso volta a contar os 5 s a cada troca —
     incluindo as feitas à mão, antes de a pessoa tomar conta. */
  useEffect(() => {
    if (!varias || pausado || tomouConta || emCima || !noEcra || reduzir) return;
    const relogio = window.setTimeout(() => irPara((atual + 1) % total), INTERVALO_MS);
    return () => window.clearTimeout(relogio);
    // `irPara` só lê a ref e o `reduzir`, que já estão nas dependências.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [varias, pausado, tomouConta, emCima, noEcra, reduzir, atual, total]);

  const imagem = (f: FotoDoCarrossel, i: number) => (
    <img
      src={f.src}
      srcSet={f.srcSet}
      sizes={SIZES}
      width={1080}
      height={1440}
      alt={f.alt}
      loading={prioridade && i === 0 ? undefined : "lazy"}
      decoding="async"
    />
  );

  if (!varias) {
    const [f] = fotos;
    return (
      <figure className="em-abertura__foto">
        {imagem(f, 0)}
        <Legenda fotografia={f} rotulo={textos.naFotografia} />
        {titulo}
      </figure>
    );
  }

  const tomar = () => setTomouConta(true);

  return (
    <div
      className="em-abertura__foto em-carrossel"
      role="region"
      aria-roledescription="carrossel"
      aria-label={textos.nome}
      onPointerEnter={(e) => e.pointerType === "mouse" && setEmCima(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setEmCima(false)}
      onFocus={() => setEmCima(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEmCima(false);
      }}
    >
      <div
        ref={faixa}
        className="em-carrossel__faixa"
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtual(Math.min(total - 1, Math.round(el.scrollLeft / el.clientWidth)));
        }}
        /* O que só uma pessoa faz: tocar, arrastar, rodar a roda do rato. O
           `scrollTo` do relógio não dispara nenhum destes. */
        onTouchStart={tomar}
        onWheel={(e) => Math.abs(e.deltaX) > Math.abs(e.deltaY) && tomar()}
        onKeyDown={tomar}
      >
        {fotos.map((f, i) => (
          <figure
            key={f.src}
            className="em-carrossel__foto"
            role="group"
            aria-roledescription="fotografia"
            aria-label={textos.rotuloDaFoto
              .replace("{n}", String(i + 1))
              .replace("{total}", String(total))}
          >
            {imagem(f, i)}
            <Legenda fotografia={f} rotulo={textos.naFotografia} />
          </figure>
        ))}
      </div>

      {titulo}

      <div className="em-carrossel__controlos">
        <div className="em-carrossel__pontos">
          {fotos.map((f, i) => (
            <button
              key={f.src}
              type="button"
              className="em-carrossel__ponto"
              aria-label={textos.rotuloDaFoto
                .replace("{n}", String(i + 1))
                .replace("{total}", String(total))}
              aria-current={i === atual || undefined}
              onClick={() => {
                tomar();
                irPara(i);
              }}
            />
          ))}
        </div>
        {!reduzir && !tomouConta && (
          <button
            type="button"
            className="em-carrossel__pausa"
            aria-label={pausado ? textos.continuar : textos.pausar}
            onClick={() => setPausado((p) => !p)}
          >
            <span aria-hidden="true">{pausado ? "▶" : "❚❚"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
