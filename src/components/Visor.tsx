"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import "../app/visor.css";

/**
 * # A fotografia inteira
 *
 * Comum à ementa e à página inicial. Nas duas as fotografias aparecem
 * cortadas: em faixa na abertura de cada capítulo da carta, num círculo ao
 * lado do artigo, nos cartões do carril, nos painéis dos pratos. São todas retratos, e o copo inteiro
 * só se vê aqui. Um toque abre-a como uma ficha do catálogo — a fotografia sem
 * cortes, o capítulo e a contagem em cima, "Na fotografia" e o preço por baixo,
 * com as mesmas letras das legendas da página.
 *
 * ## Um visor para a página toda
 *
 * O `<Visor>` embrulha a página e tem o único `<dialog>`; cada fotografia só leva
 * um `<Ampliar>` à volta. Assim a página continua a ser do servidor, e duas
 * fotografias abertas ao mesmo tempo não são uma possibilidade.
 *
 * ## Fechar é voltar atrás
 *
 * No telemóvel, o gesto de voltar atrás com uma fotografia aberta tem de a
 * fechar — não sair da carta que o QR abriu. Abrir acrescenta uma entrada ao
 * histórico (o Next aceita o `pushState` nativo), e **todos os caminhos de
 * fecho passam por ela**: o botão, o Esc e o toque fora da fotografia fazem
 * `history.back()`, e é o `popstate` que fecha. Um caminho só, para o histórico
 * nunca ficar com uma entrada a mais.
 *
 * ## A fotografia cresce do sítio onde estava
 *
 * Com View Transitions (Chrome, Safari 18) a fotografia sai do recorte e
 * desdobra-se até ao tamanho inteiro, e ao fechar volta para o recorte da
 * fotografia que se estiver a ver — o carrossel anda até ela antes. Sem elas, ou
 * com "reduzir movimento", o visor aparece por cima com um desvanecer.
 *
 * ⚠️ **A transição só começa com a fotografia pronta e com a forma certa.** O
 * browser fotografa o destino no instante em que o visor abre. Antes, nesse
 * instante a fotografia grande ainda vinha a caminho e a caixa dela tinha a
 * forma do `width`/`height` escrito à mão (3:4): numa fotografia deitada, a
 * imagem crescia esticada para um retrato e só depois saltava para a moldura
 * certa. Agora a forma vem da fotografia da página (é o mesmo ficheiro noutro
 * tamanho), e a grande é pedida e descodificada antes — com um tecto, para um
 * toque nunca ficar à espera de uma rede lenta.
 *
 * ## A preguiça em cima da fotografia
 *
 * Deitada na borda de cima da fotografia, como num ramo: a barriga assente
 * nela e as patas a cair por cima. Chega depois da fotografia — desce devagar, como
 * é dela — e fica a respirar, com uns "z" a subir. Cada fotografia tem a sua, e
 * a da fotografia que se está a ver volta a chegar quando se desliza para ela:
 * é o `data-atual` da `<figure>` que dispara as animações (ver `visor.css`).
 * O desenho é um recorte da preguiça da casa (`public/marca/preguica-deitada.webp`).
 *
 * ## A moldura e a cor
 *
 * A fotografia fica numa moldura de madeira com um filete dourado — a
 * preguiça dorme em cima dela, como em cima de um quadro. Por trás, a própria
 * fotografia muito desfocada dá a cor ao fundo: rosa no Cocktail Preguiça, azul
 * no Blue Lagoon. Cada fotografia leva a sua, e deslizar muda a cor com ela.
 */

export type FotoDoVisor = {
  src: string;
  srcSet: string;
  alt: string;
  /** "Negroni · 7,00 €" — já escrito no servidor, com os escondidos de fora. */
  legenda: string[];
};

export type GrupoDoVisor = {
  /** O capítulo, ou o artigo — aparece em cima e dá nome ao diálogo. */
  nome: string;
  fotos: FotoDoVisor[];
};

export type TextosDoVisor = {
  naFotografia: string;
  fechar: string;
  anterior: string;
  seguinte: string;
  /** "Fotografia {n} de {total}" */
  rotuloDaFoto: string;
};

/**
 * Onde a fotografia `indice` está na página, para o visor voltar para lá ao
 * fechar. O carrossel aproveita para andar até ela.
 */
type Origem = (indice: number) => HTMLElement | null;

type Abrir = (grupo: GrupoDoVisor, indice: number, origem: Origem) => void;

const ContextoDoVisor = createContext<Abrir | null>(null);

const NOME_DA_TRANSICAO = "visor-foto";

/* O mesmo `sizes` no `<img>` do visor e na fotografia pedida antes de abrir:
   assim o browser escolhe o mesmo ficheiro nos dois e o segundo já está em
   cache. */
const SIZES_DO_VISOR = "(min-width: 48rem) 60vh, 100vw";

/* Quanto um toque espera pela fotografia grande antes de abrir na mesma. Numa
   rede normal chega bem antes; numa lenta, abre e a fotografia aparece quando
   chegar — mas já na moldura com a forma certa. */
const ESPERA_MAXIMA_MS = 500;

/** Pede e descodifica a fotografia que o visor vai mostrar, com tecto. */
function preparar(foto: FotoDoVisor): Promise<void> {
  const img = new Image();
  img.sizes = SIZES_DO_VISOR;
  img.srcset = foto.srcSet;
  img.src = foto.src;
  return Promise.race([
    img.decode().catch(() => {}),
    new Promise<void>((resolver) => window.setTimeout(resolver, ESPERA_MAXIMA_MS)),
  ]);
}

/** Largura e altura da fotografia da página — a mesma, noutro tamanho. */
function proporcaoDe(recorte: HTMLElement | null): [number, number] | null {
  const img = recorte instanceof HTMLImageElement ? recorte : recorte?.querySelector("img");
  return img?.naturalWidth ? [img.naturalWidth, img.naturalHeight] : null;
}

/* Com o separador escondido o browser aborta a transição logo à cabeça — e
   rejeita o `ready`. Não vale a pena pedi-la. */
function comTransicao(): boolean {
  return (
    typeof document.startViewTransition === "function" &&
    document.visibilityState === "visible" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Uma transição que, se for abortada, não deixa erro nenhum na consola. */
function transicao(mudar: () => void, depois: () => void) {
  const t = document.startViewTransition(mudar);
  t.ready.catch(() => {});
  t.finished.finally(depois);
}

/** A imagem `i` do visor aberto. */
function fotoNoVisor(faixa: HTMLDivElement | null, i: number) {
  return faixa?.querySelectorAll<HTMLElement>(".visor__imagem")[i] ?? null;
}

/**
 * Onde está a fotografia dentro da moldura, em variáveis de CSS, para a
 * preguiça se deitar em cima dela. A fotografia cabe sem cortes e fica ao
 * centro, por isso a caixa dela só se sabe depois de carregar — e muda com o
 * ecrã. Até haver medida, a preguiça não aparece.
 */
function medirMoldura(moldura: HTMLDivElement | null) {
  const foto = moldura?.querySelector<HTMLImageElement>(".visor__imagem");
  if (!moldura || !foto) return;
  const medir = () => {
    if (!foto.offsetWidth) return;
    moldura.style.setProperty("--foto-x", `${foto.offsetLeft}px`);
    moldura.style.setProperty("--foto-y", `${foto.offsetTop}px`);
    moldura.style.setProperty("--foto-l", `${foto.offsetWidth}px`);
    moldura.dataset.medida = "";
  };
  const observador = new ResizeObserver(medir);
  observador.observe(moldura);
  observador.observe(foto);
  return () => observador.disconnect();
}

function nomear(el: HTMLElement | null | undefined, nome: string) {
  if (el) el.style.viewTransitionName = nome;
}

export function Visor({ textos, children }: { textos: TextosDoVisor; children: ReactNode }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const faixa = useRef<HTMLDivElement>(null);
  const origem = useRef<Origem>(() => null);
  /* `true` enquanto a entrada que o visor pôs no histórico lá estiver. */
  const noHistorico = useRef(false);
  const [grupo, setGrupo] = useState<GrupoDoVisor | null>(null);
  const [atual, setAtual] = useState(0);
  /* A forma de cada fotografia já vista na página, por `src`. Sem ela, a caixa
     da imagem tinha 3:4 até a fotografia chegar. */
  const [proporcoes, setProporcoes] = useState<Record<string, [number, number]>>({});
  /* Um segundo toque enquanto a fotografia ainda vem a caminho não abre outra. */
  const aAbrir = useRef(false);

  /* O `<dialog>` abre e fecha com o estado, e só aqui. Com o `showModal()` e o
     `close()` espalhados pelos caminhos de abrir e fechar, uma transição
     abortada a meio deixou uma vez o diálogo aberto e vazio. Um efeito de
     layout corre dentro do `flushSync`, a tempo de a transição o ver. */
  useLayoutEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (grupo && !d.open) {
      d.showModal();
      /* O foco fica no diálogo e não no "Fechar": aberto com o dedo, o Safari
         desenhava o anel de foco à volta do botão. O Tab leva lá a seguir. */
      d.focus();
    } else if (!grupo && d.open) d.close();
  }, [grupo]);

  const abrir = useCallback<Abrir>((novo, indice, deOnde) => {
    if (aAbrir.current) return;
    aAbrir.current = true;
    origem.current = deOnde;
    const foto = novo.fotos[indice];
    const proporcao = proporcaoDe(deOnde(indice));

    const mostrar = () => {
      flushSync(() => {
        if (proporcao) setProporcoes((p) => ({ ...p, [foto.src]: proporcao }));
        setGrupo(novo);
        setAtual(indice);
      });
      const el = faixa.current;
      /* Já aberto e com a largura certa: salta sem deslizar até à fotografia. */
      if (el) el.scrollTo({ left: indice * el.clientWidth, behavior: "instant" });
    };

    void preparar(foto).then(() => {
      aAbrir.current = false;
      if (comTransicao()) {
        /* Outra vez, e não o de cima: a página pode ter mexido enquanto a
           fotografia chegava. */
        const recorte = deOnde(indice);
        nomear(recorte, NOME_DA_TRANSICAO);
        transicao(
          () => {
            nomear(recorte, "");
            mostrar();
            nomear(fotoNoVisor(faixa.current, indice), NOME_DA_TRANSICAO);
          },
          () => nomear(fotoNoVisor(faixa.current, indice), ""),
        );
      } else {
        mostrar();
      }

      window.history.pushState(null, "", window.location.href);
      noHistorico.current = true;
    });
  }, []);

  /* O único sítio que fecha — chamado pelo `popstate`. */
  const recolher = useCallback(() => {
    /* Lida da faixa e não do estado: o `popstate` chega fora do React, e a
       posição da faixa é a verdade sobre a fotografia que se está a ver. */
    const el = faixa.current;
    const i = el && el.clientWidth ? Math.round(el.scrollLeft / el.clientWidth) : 0;
    const esconder = () => flushSync(() => setGrupo(null));

    if (comTransicao()) {
      nomear(fotoNoVisor(faixa.current, i), NOME_DA_TRANSICAO);
      let recorte: HTMLElement | null = null;
      transicao(
        () => {
          nomear(fotoNoVisor(faixa.current, i), "");
          esconder();
          recorte = origem.current(i);
          nomear(recorte, NOME_DA_TRANSICAO);
        },
        () => nomear(recorte, ""),
      );
    } else {
      origem.current(i);
      esconder();
    }
  }, []);

  const pedirFecho = useCallback(() => {
    if (noHistorico.current) window.history.back();
    else recolher();
  }, [recolher]);

  useEffect(() => {
    const aoVoltar = () => {
      if (!noHistorico.current) return;
      noHistorico.current = false;
      recolher();
    };
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, [recolher]);

  function irPara(i: number) {
    const el = faixa.current;
    if (!el || !grupo) return;
    const alvo = Math.max(0, Math.min(grupo.fotos.length - 1, i));
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: alvo * el.clientWidth, behavior: reduzir ? "instant" : "smooth" });
  }

  const total = grupo?.fotos.length ?? 0;
  const contagem = (i: number) => String(i).padStart(2, "0");

  return (
    <ContextoDoVisor.Provider value={abrir}>
      {children}

      <dialog
        ref={dialogo}
        className="visor"
        aria-label={grupo?.nome}
        tabIndex={-1}
        /* O Esc do browser fecharia o diálogo sem passar pelo histórico, e a
           entrada ficava lá — o voltar seguinte não fazia nada. */
        onCancel={(e) => {
          e.preventDefault();
          pedirFecho();
        }}
        /* Rede de segurança: se o browser o fechar por conta própria (há
           browsers que ignoram o `preventDefault` num segundo Esc), o
           histórico acerta-se na mesma. */
        onClose={() => {
          setGrupo(null);
          if (noHistorico.current) {
            noHistorico.current = false;
            window.history.back();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") irPara(atual + 1);
          else if (e.key === "ArrowLeft") irPara(atual - 1);
          else return;
          e.preventDefault();
        }}
        /* Um toque em qualquer sítio que não seja a fotografia, a legenda ou
           um botão fecha — é o que a mão faz primeiro. */
        onClick={(e) => {
          const alvo = e.target as HTMLElement;
          if (!alvo.closest("img, figcaption, button")) pedirFecho();
        }}
      >
        {grupo && (
          <>
            <div className="visor__topo">
              <p className="visor__onde">
                <span>{grupo.nome}</span>
                {total > 1 && (
                  <span className="visor__contagem" aria-hidden="true">
                    {contagem(atual + 1)} / {contagem(total)}
                  </span>
                )}
              </p>
              <button
                type="button"
                className="visor__fechar"
                onClick={pedirFecho}
              >
                {textos.fechar}
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            <div
              ref={faixa}
              className="visor__faixa"
              onScroll={(e) => {
                const el = e.currentTarget;
                setAtual(Math.min(total - 1, Math.round(el.scrollLeft / el.clientWidth)));
              }}
            >
              {grupo.fotos.map((f, i) => (
                <figure
                  key={f.src}
                  className="visor__foto"
                  data-atual={i === atual || undefined}
                  /* A versão pequena chega para um fundo desfocado, e é a que
                     a página já descarregou para o recorte. */
                  style={
                    { "--fundo": `url(${f.srcSet.split(" ")[0]})` } as React.CSSProperties
                  }
                  role="group"
                  aria-roledescription="fotografia"
                  aria-label={textos.rotuloDaFoto
                    .replace("{n}", String(i + 1))
                    .replace("{total}", String(total))}
                >
                  <div className="visor__moldura" ref={medirMoldura}>
                    <img
                      className="visor__imagem"
                      src={f.src}
                      srcSet={f.srcSet}
                      sizes={SIZES_DO_VISOR}
                      width={(proporcoes[f.src] ?? [1080, 1440])[0]}
                      height={(proporcoes[f.src] ?? [1080, 1440])[1]}
                      alt={f.alt}
                      loading={i === atual ? undefined : "lazy"}
                      decoding="async"
                    />
                    <span className="visor__preguica" aria-hidden="true">
                      <img
                        src="/marca/preguica-deitada.webp"
                        width={720}
                        height={564}
                        alt=""
                        decoding="async"
                      />
                      <span className="visor__zzz">
                        <span>z</span>
                        <span>z</span>
                        <span>z</span>
                      </span>
                    </span>
                  </div>
                  {f.legenda.length > 0 && (
                    <figcaption className="visor__legenda">
                      <span>{textos.naFotografia}</span>
                      {f.legenda.map((linha) => (
                        <span key={linha}>{linha}</span>
                      ))}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>

            {total > 1 && (
              <div className="visor__setas">
                <button
                  type="button"
                  aria-label={textos.anterior}
                  disabled={atual === 0}
                  onClick={() => irPara(atual - 1)}
                >
                  <span aria-hidden="true">←</span>
                </button>
                <button
                  type="button"
                  aria-label={textos.seguinte}
                  disabled={atual === total - 1}
                  onClick={() => irPara(atual + 1)}
                >
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </>
        )}
      </dialog>
    </ContextoDoVisor.Provider>
  );
}

/**
 * O botão à volta de uma fotografia da carta. Sem `<Visor>` por cima (ou sem
 * JavaScript) é só a fotografia, como antes.
 */
export function Ampliar({
  grupo,
  indice,
  rotulo,
  origem,
  className,
  children,
}: {
  grupo: GrupoDoVisor;
  indice: number;
  /** O nome acessível do botão: "Ampliar a fotografia: Negroni". */
  rotulo: string;
  /** Por omissão, a própria imagem de dentro do botão. */
  origem?: Origem;
  className?: string;
  children: ReactNode;
}) {
  const abrir = useContext(ContextoDoVisor);
  const botao = useRef<HTMLButtonElement>(null);
  if (!abrir) return <>{children}</>;

  return (
    <button
      ref={botao}
      type="button"
      className={className ? `visor-ampliar ${className}` : "visor-ampliar"}
      aria-label={rotulo}
      aria-haspopup="dialog"
      onClick={() =>
        abrir(grupo, indice, origem ?? (() => botao.current?.querySelector("img") ?? null))
      }
    >
      {children}
    </button>
  );
}
