"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
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
 * ## Deslizar com o dedo é do browser; passar sozinho é nosso
 *
 * A faixa é um `overflow-x` com `scroll-snap`: o dedo, o trackpad e as setas do
 * teclado já sabem mexer nela, sem biblioteca e sem reimplementar a física de um
 * deslizar.
 *
 * Mas a passagem do relógio e dos pontos **não** é o `scrollTo` suave do
 * browser. Medido quadro a quadro (2026-10-08): no Safari a passagem inteira
 * durava 200 ms, com saltos de um quinto da fotografia por quadro; no Chrome
 * durava meio segundo, a arrancar aos solavancos e a arrastar-se no fim. Nenhum
 * dos dois se deixa afinar. Por isso a passagem é um `requestAnimationFrame`
 * nosso (`deslizar`): 0,9 s, a mesma curva à saída e à chegada, com o
 * `scroll-snap` desligado enquanto dura — senão o browser puxava a faixa para a
 * fotografia mais perto a cada quadro.
 *
 * ## Não tem fim
 *
 * Da última passa para a primeira **para a frente**, e com o dedo também se
 * passa da primeira para a última. Há uma cópia da última antes da primeira e
 * uma da primeira depois da última; quando a faixa assenta numa cópia, salta
 * sem se ver para a verdadeira. As cópias não têm botão nem entram no leitor de
 * ecrã (`inert`).
 *
 * ⚠️ As cópias só entram depois de montar: com a da última à cabeça no HTML do
 * servidor, a faixa abria nela até o JavaScript chegar. Ao entrarem, a faixa
 * anda uma fotografia para a frente no mesmo quadro (`useLayoutEffect`), antes
 * de se pintar.
 *
 * ## O relógio sabe quando se calar
 *
 * - Muda a cada 5 segundos (ou o `intervalo` de quem o usa), **só com o
 *   carrossel no ecrã** e o separador visível — uma fotografia a mudar onde
 *   ninguém a vê é trabalho para nada.
 * - Pára enquanto o rato está por cima ou o foco **do teclado** está lá dentro,
 *   e retoma a seguir. O foco de um clique não conta: o ponto em que se carregou
 *   ficava com ele e o carrossel nunca mais andava.
 * - **Um toque, um deslizar ou um ponto param-no 3 segundos**, contados do
 *   último gesto; depois volta a andar sozinho (pedido do Tomás, 2026-10-08 —
 *   já foi parar de vez).
 * - Com uma fotografia aberta no visor, espera.
 * - Tem um botão de pausa, que é o que as regras de acessibilidade pedem a
 *   qualquer coisa que mexe sozinha mais de cinco segundos. Essa pausa é de vez.
 * - Com "reduzir movimento" no sistema não arranca, e os pontos saltam em vez
 *   de deslizar.
 *
 * ## As fotografias carregam todas quando o carrossel chega perto
 *
 * Só a primeira está à vista; as outras estão fora da faixa, de lado, e com
 * `loading="lazy"` o browser só as ia buscar quando entrassem — **a meio da
 * passagem**. O que se via era o fundo castanho da moldura a deslizar até a
 * fotografia chegar. Agora, quando o carrossel está a um ecrã de distância,
 * passam todas a `eager`; e o relógio, antes de avançar, espera que a
 * seguinte esteja **descodificada** — carregada não chega, que a descodificação
 * a meio da passagem também encrava.
 *
 * Um toque numa fotografia abre-a inteira no `<Visor>`. Ao fechar, o carrossel
 * fica na fotografia que se estava a ver lá dentro.
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
/** Depois de alguém mexer, quanto tempo o relógio espera para voltar a andar. */
const RETOMAR_MS = 3000;
/** Uma passagem para a fotografia do lado. Os pontos mais longe levam um pouco mais. */
const PASSAGEM_MS = 900;

/**
 * Devagar a sair, devagar a chegar, e sem pressa no meio: um seno, que no meio
 * vai a 1,6 vezes a velocidade média. Já foi uma cúbica, que lá chegava a 3
 * vezes — media-se suave, mas via-se a fotografia a dar um puxão a meio.
 */
const suave = (k: number) => (1 - Math.cos(Math.PI * k)) / 2;

/* O "reduzir movimento" lido como loja externa: muda sozinho se a pessoa mexer
   na definição com a página aberta, e no servidor conta como reduzido — o
   relógio só arranca no browser, de qualquer forma. */
const consultaReduzir = "(prefers-reduced-motion: reduce)";
function subscreverReduzir(aviso: () => void) {
  const mq = window.matchMedia(consultaReduzir);
  mq.addEventListener("change", aviso);
  return () => mq.removeEventListener("change", aviso);
}

/* "Já está no browser": `false` no HTML do servidor e na hidratação, `true` a
   seguir. É o que deixa as cópias entrarem só depois de montar. */
const subscreverNada = () => () => {};

/**
 * A largura de uma fotografia na faixa, com as casas decimais. O `clientWidth`
 * arredonda: em "A casa", no telemóvel, dava 287 para 286,6 — e na oitava
 * fotografia o erro já eram 3 px, o que bastava para a faixa nunca se dar por
 * assente na cópia e para o `scroll-snap` corrigir o fim de cada passagem com
 * um estalo. O `scrollWidth` também arredonda, mas uma vez para a faixa toda.
 */
function larguraDaFoto(faixa: HTMLElement) {
  return faixa.scrollWidth / faixa.children.length;
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

  /* O que não precisa de voltar a desenhar a página: o quadro da passagem em
     curso, a hora do último gesto, o dedo pousado e o relógio do assentar. */
  const passagem = useRef<number | null>(null);
  const ultimoGesto = useRef(-Infinity);
  const dedoPousado = useRef(false);
  const assentar = useRef<number | undefined>(undefined);

  const total = fotos.length;
  const varias = total > 1;
  /* As cópias das pontas, só depois de montar (ver "Não tem fim"). Com elas, a
     primeira verdadeira é a segunda da faixa. */
  const montado = useSyncExternalStore(subscreverNada, () => true, () => false);
  const comCopias = varias && montado;
  const desvio = comCopias ? 1 : 0;

  /* A cópia da última entrou à cabeça: a faixa anda uma para a frente antes de
     se pintar. Pelo `atual`, e não pelo `scrollLeft` — o Chrome pode já ter
     reencaixado a faixa por conta própria, e somar outra vez passava uma à
     frente. */
  useLayoutEffect(() => {
    if (comCopias) saltar(atual + 1);
    // Só quando as cópias entram; depois, quem mexe na faixa são os gestos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comCopias]);

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

  /** A posição na faixa (contando com as cópias) em que está agora. */
  function posicaoAtual() {
    const el = faixa.current;
    return el ? Math.round(el.scrollLeft / larguraDaFoto(el)) : 0;
  }

  function saltar(posicao: number) {
    const el = faixa.current;
    if (el) el.scrollTo({ left: posicao * larguraDaFoto(el), behavior: "instant" });
  }

  /** Corta a passagem em curso; o `scroll-snap` leva a faixa ao sítio mais perto. */
  function cortar() {
    if (passagem.current === null) return;
    cancelAnimationFrame(passagem.current);
    passagem.current = null;
    faixa.current?.style.removeProperty("scroll-snap-type");
  }

  /** Assente numa cópia, a faixa salta para a verdadeira — é a mesma fotografia. */
  function endireitar() {
    const el = faixa.current;
    if (!el || !comCopias || dedoPousado.current || passagem.current !== null) return;
    const posicao = posicaoAtual();
    /* Ainda a meio do encaixe: espera pelo próximo `scroll`. */
    if (Math.abs(el.scrollLeft - posicao * larguraDaFoto(el)) > 1) return;
    if (posicao === 0) saltar(total);
    else if (posicao === total + 1) saltar(1);
  }

  function deslizar(destino: number) {
    const el = faixa.current;
    if (!el) return;
    cortar();
    if (reduzir) {
      saltar(destino);
      endireitar();
      return;
    }
    /* O ponto acende já, e não a meio: mudar o `atual` volta a desenhar o
       carrossel, e a meio é quando a fotografia vai mais depressa — o quadro
       que o React levava via-se como um soluço. Durante a passagem o `onScroll`
       não mexe no estado. */
    flushSync(() => setAtual((((destino - desvio) % total) + total) % total));
    const de = el.scrollLeft;
    const largura = larguraDaFoto(el);
    const para = destino * largura;
    const fotografias = Math.abs(para - de) / largura;
    const duracao = PASSAGEM_MS + 150 * Math.max(0, Math.min(fotografias, 4) - 1);
    el.style.setProperty("scroll-snap-type", "none");
    const inicio = performance.now();
    const quadro = (agora: number) => {
      const k = Math.min(1, Math.max(0, (agora - inicio) / duracao));
      el.scrollLeft = de + (para - de) * suave(k);
      if (k < 1) {
        passagem.current = requestAnimationFrame(quadro);
        return;
      }
      passagem.current = null;
      el.style.removeProperty("scroll-snap-type");
      endireitar();
    };
    passagem.current = requestAnimationFrame(quadro);
  }

  /** Um ponto: pelo lado mais curto, que numa faixa sem fim pode ser pela cópia. */
  function irPara(indice: number) {
    const aqui = posicaoAtual();
    const candidatas = [indice + desvio];
    if (comCopias && indice === 0) candidatas.push(total + 1);
    if (comCopias && indice === total - 1) candidatas.push(0);
    const destino = candidatas.reduce((a, b) => (Math.abs(b - aqui) < Math.abs(a - aqui) ? b : a));
    deslizar(destino);
  }

  /** Alguém mexeu: corta a passagem e o relógio espera `RETOMAR_MS` a contar daqui. */
  function gesto() {
    ultimoGesto.current = performance.now();
    cortar();
  }

  /* O relógio. Depende do `atual`, por isso volta a contar a cada troca. */
  useEffect(() => {
    if (!varias || pausado || emCima || comFoco || !noEcra || reduzir) return;
    let cancelado = false;
    let relogio: number | undefined;
    const agendar = (ms: number) => {
      relogio = window.setTimeout(tique, ms);
    };
    function tique() {
      const quieto = performance.now() - ultimoGesto.current;
      if (quieto < RETOMAR_MS) return agendar(RETOMAR_MS - quieto);
      /* Com uma fotografia aberta no visor, é lá que a pessoa está a olhar. */
      if (document.querySelector("dialog[open]")) return agendar(intervalo);
      let aqui = posicaoAtual();
      /* Numa cópia que ainda não se endireitou, endireita-se já. */
      if (comCopias && aqui > total) aqui = (saltar(1), 1);
      if (comCopias && aqui < 1) aqui = (saltar(total), total);
      const seguinte = comCopias ? aqui + 1 : (aqui + 1) % total;
      const img = faixa.current?.querySelectorAll("img")[seguinte];
      /* Só passa quando a seguinte está pronta a desenhar — senão o que
         deslizava para a vista era a moldura vazia, ou uma fotografia a ser
         descodificada a meio do caminho. */
      Promise.resolve(img?.decode().catch(() => {})).then(() => {
        if (!cancelado) deslizar(seguinte);
      });
    }
    const quieto = performance.now() - ultimoGesto.current;
    agendar(quieto < RETOMAR_MS ? RETOMAR_MS - quieto : intervalo);
    return () => {
      cancelado = true;
      window.clearTimeout(relogio);
    };
    // As funções só leem refs e o que já está nas dependências.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [varias, pausado, emCima, comFoco, noEcra, reduzir, atual, total, intervalo, comCopias]);

  /* Ao sair, nenhuma passagem fica a escrever numa faixa que já não existe. */
  useEffect(
    () => () => {
      if (passagem.current !== null) cancelAnimationFrame(passagem.current);
      window.clearTimeout(assentar.current);
    },
    [],
  );

  const grupo = { nome: textos.nome, fotos };

  /* Ao fechar o visor na fotografia `i`, a faixa salta para ela (sem
     deslizar — a transição já está a levar a fotografia para lá). */
  const origem = (i: number) => {
    const el = faixa.current;
    if (!el) return null;
    cortar();
    saltar(i + desvio);
    return el.querySelectorAll<HTMLImageElement>(".pg-carrossel__foto:not([data-copia]) img")[i] ?? null;
  };

  const img = (f: FotoDoCarrossel, i: number, alt = f.alt) => (
    <img
      src={f.src}
      srcSet={f.srcSet}
      sizes={sizes}
      width={dimensoes[0]}
      height={dimensoes[1]}
      alt={alt}
      loading={(prioridade && i === 0) || perto ? undefined : "lazy"}
      decoding="async"
    />
  );

  const imagem = (f: FotoDoCarrossel, i: number) => (
    <Ampliar
      grupo={grupo}
      indice={i}
      origem={varias ? origem : undefined}
      rotulo={`${textos.ampliar}: ${f.legenda[0] ?? textos.nome}`}
    >
      {img(f, i)}
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

  /* A cópia é só o desenho: o mesmo invólucro do botão (para ocupar o mesmo
     sítio), sem botão, sem texto alternativo e fora do leitor de ecrã. */
  const copia = (i: number) => (
    <figure key={`copia-${i}`} className="pg-carrossel__foto" data-copia="" aria-hidden="true" inert>
      <div className="visor-ampliar">{img(fotos[i], i, "")}</div>
      <Legenda fotografia={fotos[i]} rotulo={textos.naFotografia} />
    </figure>
  );

  return (
    <div
      className={`${moldura} pg-carrossel`}
      role="region"
      aria-roledescription="carrossel"
      aria-label={textos.nome}
      onPointerEnter={(e) => e.pointerType === "mouse" && setEmCima(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setEmCima(false)}
      onFocus={(e) => (e.target as Element).matches(":focus-visible") && setComFoco(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setComFoco(false);
      }}
    >
      <div
        ref={faixa}
        className="pg-carrossel__faixa"
        onScroll={(e) => {
          /* A passagem nossa já acendeu o ponto e endireita-se a si própria. */
          if (passagem.current !== null) return;
          const el = e.currentTarget;
          const posicao = Math.round(el.scrollLeft / larguraDaFoto(el));
          setAtual((((posicao - desvio) % total) + total) % total);
          /* Quando deixa de haver `scroll`, a faixa assentou. */
          window.clearTimeout(assentar.current);
          assentar.current = window.setTimeout(endireitar, 120);
        }}
        /* O que só uma pessoa faz: tocar, arrastar, rodar a roda do rato, as
           setas. A passagem do relógio não dispara nenhum destes. */
        onPointerDown={gesto}
        onTouchStart={() => {
          dedoPousado.current = true;
          gesto();
        }}
        onTouchEnd={() => {
          dedoPousado.current = false;
          gesto();
          window.clearTimeout(assentar.current);
          assentar.current = window.setTimeout(endireitar, 120);
        }}
        onTouchCancel={() => {
          dedoPousado.current = false;
        }}
        onWheel={(e) => Math.abs(e.deltaX) > Math.abs(e.deltaY) && gesto()}
        onKeyDown={gesto}
      >
        {comCopias && copia(total - 1)}
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
        {comCopias && copia(0)}
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
                gesto();
                irPara(i);
              }}
            />
          ))}
        </div>
        {!reduzir && (
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
