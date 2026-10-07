"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Ampliar, type FotoDoVisor } from "@/components/Visor";

/**
 * # Um carrossel de fotografias que passam sozinhas
 *
 * Nasceu para abrir os capítulos da carta e serve também "A casa", na inicial.
 * Com uma fotografia só, é o que sempre foi: a fotografia, a legenda e o título
 * por cima. Com várias, passam sozinhas.
 *
 * A moldura (a caixa, o recorte, o canto arredondado) é de quem o usa, pela
 * `moldura`; o que está em `catalogo.css` (`.pg-carrossel*`) é só a mecânica: a
 * faixa, os pontos e a pausa.
 *
 * ## Deslizar é do browser
 *
 * A faixa é um `overflow-x` com `scroll-snap`: o dedo, o trackpad e as setas do
 * teclado já sabem mexer nela, sem biblioteca e sem reimplementar a física de um
 * deslizar. Este componente só acrescenta o relógio e os pontos.
 *
 * ## O relógio sabe quando se calar
 *
 * - Muda a cada 5 segundos (ou o `intervalo` de quem o usa), **só com o
 *   carrossel no ecrã** e o separador visível — uma fotografia a mudar onde
 *   ninguém a vê é trabalho para nada.
 * - Pára enquanto o rato está por cima ou o foco está lá dentro, e retoma a
 *   seguir.
 * - **Um toque, um deslizar ou um ponto param-no de vez**: a pessoa tomou conta,
 *   e uma fotografia a fugir-lhe da mão a seguir é irritante.
 * - Tem um botão de pausa, que é o que as regras de acessibilidade pedem a
 *   qualquer coisa que mexe sozinha mais de cinco segundos.
 *
 * ## As fotografias carregam todas quando o carrossel chega perto
 *
 * Só a primeira está à vista; as outras estão fora da faixa, de lado, e com
 * `loading="lazy"` o browser só as ia buscar quando entrassem — **a meio da
 * passagem**. O que se via era o fundo castanho da moldura a deslizar até a
 * fotografia chegar. Agora, quando o carrossel está a um ecrã de distância,
 * passam todas a `eager`; e o relógio, antes de avançar, espera que a
 * seguinte esteja descodificada.
 * - Com "reduzir movimento" no sistema não arranca.
 *
 * Um toque numa fotografia abre-a inteira no `<Visor>` — e também conta como
 * a pessoa ter tomado conta. Ao fechar, o carrossel fica na fotografia que se
 * estava a ver lá dentro.
 */

export type FotoDoCarrossel = FotoDoVisor;

export type TextosDoCarrossel = {
  naFotografia: string;
  /** O nome do capítulo, para o leitor de ecrã saber de que carrossel se trata. */
  nome: string;
  /** "Fotografia {n} de {total}" — os números são trocados aqui, por fotografia. */
  rotuloDaFoto: string;
  pausar: string;
  continuar: string;
  /** "Ampliar a fotografia" — o nome do botão, seguido do que se vê nela. */
  ampliar: string;
};

const INTERVALO_MS = 5000;

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
  titulo = null,
  textos,
  prioridade = false,
  moldura = "em-abertura__foto",
  sizes = "(min-width: 72rem) 72rem, 100vw",
  dimensoes = [1080, 1440],
  intervalo = INTERVALO_MS,
}: {
  fotos: FotoDoCarrossel[];
  /** O número e o `<h2>` do capítulo — fica por cima de todas as fotografias. */
  titulo?: ReactNode;
  textos: TextosDoCarrossel;
  /** O primeiro capítulo carrega a primeira fotografia logo; os outros esperam. */
  prioridade?: boolean;
  /** A classe da caixa de fora, que dá o tamanho e o recorte. */
  moldura?: string;
  sizes?: string;
  /** Largura e altura do ficheiro maior, para o browser reservar o lugar. */
  dimensoes?: [number, number];
  /** Milissegundos entre fotografias, quando passam sozinhas. */
  intervalo?: number;
}) {
  const faixa = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [tomouConta, setTomouConta] = useState(false);
  /* O rato por cima e o foco lá dentro são duas razões para parar, e cada uma
     com o seu estado. Já foram um só: com o foco num ponto, o rato passava por
     cima e saía, e o `pointerleave` punha o relógio a andar com o foco ainda
     lá dentro. */
  const [emCima, setEmCima] = useState(false);
  const [comFoco, setComFoco] = useState(false);
  const [noEcra, setNoEcra] = useState(false);
  /* Uma vez perto, fica: voltar a `lazy` não descarrega nada. */
  const [perto, setPerto] = useState(false);
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

    /* A um ecrã de distância: tempo para as fotografias chegarem antes da
       primeira passagem. */
    const aproximar = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        setPerto(true);
        aproximar.disconnect();
      },
      { rootMargin: "100% 0px" },
    );
    aproximar.observe(el);

    return () => {
      observador.disconnect();
      aproximar.disconnect();
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
    if (!varias || pausado || tomouConta || emCima || comFoco || !noEcra || reduzir) return;
    let cancelado = false;
    const relogio = window.setTimeout(() => {
      const seguinte = (atual + 1) % total;
      const img = faixa.current?.querySelectorAll("img")[seguinte];
      /* Só passa quando a seguinte está pronta a desenhar — senão o que
         deslizava para a vista era a moldura vazia. */
      const pronta = img && !(img.complete && img.naturalWidth) ? img.decode().catch(() => {}) : null;
      Promise.resolve(pronta).then(() => {
        if (!cancelado) irPara(seguinte);
      });
    }, intervalo);
    return () => {
      cancelado = true;
      window.clearTimeout(relogio);
    };
    // `irPara` só lê a ref e o `reduzir`, que já estão nas dependências.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [varias, pausado, tomouConta, emCima, comFoco, noEcra, reduzir, atual, total, intervalo]);

  const grupo = { nome: textos.nome, fotos };

  /* Ao fechar o visor na fotografia `i`, a faixa salta para ela (sem
     deslizar — a transição já está a levar a fotografia para lá). */
  const origem = (i: number) => {
    const el = faixa.current;
    if (!el) return null;
    el.scrollTo({ left: i * el.clientWidth, behavior: "instant" });
    return el.querySelectorAll("img")[i] ?? null;
  };

  const imagem = (f: FotoDoCarrossel, i: number) => (
    <Ampliar
      grupo={grupo}
      indice={i}
      origem={varias ? origem : undefined}
      rotulo={`${textos.ampliar}: ${f.legenda[0] ?? textos.nome}`}
    >
      <img
        src={f.src}
        srcSet={f.srcSet}
        sizes={sizes}
        width={dimensoes[0]}
        height={dimensoes[1]}
        alt={f.alt}
        loading={(prioridade && i === 0) || perto ? undefined : "lazy"}
        decoding="async"
      />
    </Ampliar>
  );

  if (!varias) {
    const [f] = fotos;
    return (
      <figure className={moldura}>
        {imagem(f, 0)}
        <Legenda fotografia={f} rotulo={textos.naFotografia} />
        {titulo}
      </figure>
    );
  }

  const tomar = () => setTomouConta(true);

  return (
    <div
      className={`${moldura} pg-carrossel`}
      role="region"
      aria-roledescription="carrossel"
      aria-label={textos.nome}
      onPointerEnter={(e) => e.pointerType === "mouse" && setEmCima(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setEmCima(false)}
      onFocus={() => setComFoco(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setComFoco(false);
      }}
    >
      <div
        ref={faixa}
        className="pg-carrossel__faixa"
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtual(Math.min(total - 1, Math.round(el.scrollLeft / el.clientWidth)));
        }}
        /* O que só uma pessoa faz: tocar, arrastar, rodar a roda do rato. O
           `scrollTo` do relógio não dispara nenhum destes. */
        onTouchStart={tomar}
        onClick={tomar}
        onWheel={(e) => Math.abs(e.deltaX) > Math.abs(e.deltaY) && tomar()}
        onKeyDown={tomar}
      >
        {fotos.map((f, i) => (
          <figure
            key={f.src}
            className="pg-carrossel__foto"
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

      <div className="pg-carrossel__controlos">
        <div className="pg-carrossel__pontos">
          {fotos.map((f, i) => (
            <button
              key={f.src}
              type="button"
              className="pg-carrossel__ponto"
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
            className="pg-carrossel__pausa"
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
