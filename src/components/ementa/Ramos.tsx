"use client";

import { useEffect, useRef } from "react";

/**
 * # Os ramos da carta secreta, e a preguiça que anda neles
 *
 * Um fundo de paus cruzados por trás da carta secreta, de ponta a ponta da
 * página, e a preguiça a andar por **todos** eles: segue um ramo e, quando ele
 * cruza outro, às vezes muda. Quem visita pode pegar nela (rato ou dedo),
 * arrastá-la — balança como um pêndulo, conforme a mexem — e largá-la: salta
 * para o ramo mais perto e continua. Um toque sem arrastar dá-lhe um empurrão.
 *
 * ## As camadas, de trás para a frente
 *
 * 1. **o fundo** — paus compridos e apagados, do tamanho da secção inteira; a
 *    moldura (`z-index: 1`) é translúcida e deixa-os ver por trás;
 * 2. **atrás** — os paus do topo, e o ramo do meio;
 * 3. **a preguiça** (`z-index: 2`);
 * 4. **à frente** (`z-index: 3`) — os paus por trás dos quais ela passa.
 *
 * Todos da mesma cor; a grossura (`data-grossura`) varia de galho para galho e
 * está espalhada pelas três camadas, para não serem grossos só em cima.
 *
 * ## Como ela sabe onde estão os ramos
 *
 * Cada `path` com `data-andavel` é lido do próprio desenho: pontos a cada
 * `PASSO` px, já em coordenadas do ecrã (`getScreenCTM`, que conta com o
 * `slice` de uns e o `none` do fundo). Os cruzamentos são os sítios onde pontos
 * de dois ramos quase coincidem. Tudo volta a ser medido quando a secção muda
 * de tamanho — rodar o telemóvel, ou abrir a carta, que a faz crescer.
 *
 * **Um ponto só é "livre" se a preguiça, pendurada nele, não tapar a carta nem
 * sair da secção.** Ao chegar a um que não é, dá meia volta. É isto que a
 * mantém à volta da carta e nunca por cima do formulário.
 *
 * Com "reduzir movimento" não anda nem balança sozinha; continua a poder ser
 * arrastada, que é movimento pedido por quem está a ver. Fora do ecrã, pára.
 */

/** Distância entre pontos de um ramo, em px. */
const PASSO = 5;
/** Devagar — é uma preguiça. Em px por segundo. */
const VELOCIDADE = 38;
/** Só muda de ramo num cruzamento se o outro tiver este caminho livre à frente (em pontos, ~150 px). */
const MUDAR = 30;
/** Onde a mão está na imagem, em fração da largura: é esse ponto que vai no ramo. */
const AGARRA = 0.3;
/** Altura da imagem sobre a largura (325 × 286). */
const PROPORCAO = 286 / 325;

type Sitio = { ramo: number; i: number };
type Ponto = { x: number; y: number; livre: boolean };
type Ramo = { pontos: Ponto[]; cruza: Map<number, Sitio[]> };
type Passeio = { ramo: number; s: number; dir: 1 | -1; pausa: number };

export function Ramos() {
  const cena = useRef<HTMLDivElement>(null);
  const preguica = useRef<HTMLSpanElement>(null);
  const pendulo = useRef<HTMLSpanElement>(null);
  const virar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = cena.current;
    const bicho = preguica.current;
    const pend = pendulo.current;
    const vira = virar.current;
    const moldura = el?.parentElement?.querySelector<HTMLElement>(".em-secreta__moldura");
    if (!el || !bicho || !pend || !vira || !moldura) return;

    const quieta = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let ramos: Ramo[] = [];
    let passeio: Passeio | null = null;
    /* Onde está a mão dela, em px dentro da cena. */
    let pos = { x: 0, y: 0 };
    let lado: 1 | -1 = 1;
    /* O pêndulo: ângulo (graus) e velocidade angular. */
    let angulo = 0;
    let rodar = 0;
    let velX = 0;
    let salto: (Sitio & { de: { x: number; y: number }; t: number }) | null = null;
    let arrasto: { id: number; dx: number; dy: number; x0: number; y0: number; mexeu: boolean } | null =
      null;
    let visivel = false;
    let pedido = 0;
    let antes = 0;

    const largura = () => bicho.offsetWidth;
    const livreEm = (ramo: number, i: number) => ramos[ramo]?.pontos[i]?.livre ?? false;
    /** Quantos pontos livres seguidos há a partir de `i`, para o lado `dir`. */
    const caminho = (ramo: number, i: number, dir: number) => {
      let n = 0;
      while (n < MUDAR && livreEm(ramo, i + dir * (n + 1))) n++;
      return n;
    };

    /* ------------------------------------------------------------ medir */

    function medir() {
      const caixa = el!.getBoundingClientRect();
      const m = moldura!.getBoundingClientRect();
      const w = largura();
      const h = w * PROPORCAO;
      const carta = {
        esq: m.left - caixa.left - 8,
        dir: m.right - caixa.left + 8,
        cima: m.top - caixa.top - 8,
        baixo: m.bottom - caixa.top + 8,
      };
      const livre = (x: number, y: number) => {
        const a = x - 0.75 * w;
        const b = x + 0.75 * w;
        if (a < 0 || b > caixa.width || y < 6 || y + h > caixa.height) return false;
        return !(b > carta.esq && a < carta.dir && y + h > carta.cima && y < carta.baixo);
      };

      ramos = [...el!.querySelectorAll<SVGPathElement>("[data-andavel]")].map((caminho) => ({
        pontos: amostrar(caminho, caixa).map((p) => ({ ...p, livre: livre(p.x, p.y) })),
        cruza: new Map(),
      }));
      cruzamentos(ramos);
    }

    /** O ponto livre mais perto de (x, y), com folga para andar dos dois lados. */
    function maisPerto(x: number, y: number): Sitio | null {
      let melhor: Sitio | null = null;
      let d = Infinity;
      ramos.forEach((r, ramo) =>
        r.pontos.forEach((p, i) => {
          if (!p.livre || !livreEm(ramo, i - 4) || !livreEm(ramo, i + 4)) return;
          const dd = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (dd < d) {
            d = dd;
            melhor = { ramo, i };
          }
        }),
      );
      return melhor;
    }

    function pousar({ ramo, i }: Sitio) {
      const p = ramos[ramo].pontos[i];
      pos = { x: p.x, y: p.y };
      if (!livreEm(ramo, i + lado)) lado = -lado as 1 | -1;
      passeio = { ramo, s: i, dir: lado, pausa: 0.4 };
    }

    /* A primeira vez: no ramo do meio, a meio do ecrã. Depois de medir outra
       vez: no ponto livre mais perto de onde estava. */
    function recolocar(primeira: boolean) {
      const trilho = ramos.length - 1 - el!.querySelectorAll(".em-ramos__paus--frente [data-andavel]").length;
      const sitio = primeira
        ? (ramos[trilho]?.pontos
            .map((p, i) => ({ ramo: trilho, i, d: Math.abs(p.x - el!.clientWidth / 2) }))
            .filter((c) => livreEm(trilho, c.i))
            .sort((a, b) => a.d - b.d)[0] ?? maisPerto(el!.clientWidth / 2, 0))
        : maisPerto(pos.x, pos.y);
      if (sitio) pousar(sitio);
    }

    /* ----------------------------------------------------------- andar */

    function andar(dt: number) {
      const p = passeio;
      if (!p) return;
      if (p.pausa > 0) {
        p.pausa -= dt;
        return;
      }
      const alvo = p.s + (p.dir * VELOCIDADE * dt) / PASSO;
      let k = p.dir > 0 ? Math.floor(p.s) + 1 : Math.ceil(p.s) - 1;

      while (p.dir > 0 ? k <= alvo : k >= alvo) {
        if (!livreEm(p.ramo, k)) {
          /* A ponta do ramo, ou a carta à frente: meia volta, e um descanso. */
          p.s = k - p.dir;
          p.dir = -p.dir as 1 | -1;
          p.pausa = 0.6 + Math.random() * 1.2;
          return;
        }
        const cruza = ramos[p.ramo].cruza.get(k);
        if (cruza && Math.random() < 0.4) {
          /* Só muda para um ramo com caminho à frente: um pau que acaba logo
             na carta deixava-a a ir e vir sempre no mesmo palmo. */
          const c = cruza[Math.floor(Math.random() * cruza.length)];
          const dir = Math.random() < 0.5 ? 1 : -1;
          const vai =
            caminho(c.ramo, c.i, dir) >= MUDAR ? dir : caminho(c.ramo, c.i, -dir) >= MUDAR ? -dir : 0;
          if (vai) {
            passeio = { ramo: c.ramo, s: c.i, dir: vai as 1 | -1, pausa: 0.25 };
            return;
          }
        }
        k += p.dir;
      }
      p.s = alvo;
    }

    /** Onde fica a mão, com o passeio no índice `s` (entre dois pontos). */
    function noRamo(p: Passeio) {
      const pts = ramos[p.ramo].pontos;
      const i = Math.max(0, Math.min(pts.length - 1, Math.floor(p.s)));
      const j = Math.min(pts.length - 1, i + 1);
      const t = p.s - i;
      return { x: pts[i].x + (pts[j].x - pts[i].x) * t, y: pts[i].y + (pts[j].y - pts[i].y) * t };
    }

    /* ----------------------------------------------------------- pintar */

    function quadro(agora: number) {
      const dt = Math.min(0.05, Math.max(0, (agora - antes) / 1000));
      antes = agora;
      const anterior = pos;

      if (salto && !arrasto) {
        salto.t = Math.min(1, salto.t + dt / 0.35);
        const alvo = ramos[salto.ramo]?.pontos[salto.i];
        if (!alvo) salto = null;
        else {
          const e = 1 - (1 - salto.t) ** 3;
          pos = {
            x: salto.de.x + (alvo.x - salto.de.x) * e,
            y: salto.de.y + (alvo.y - salto.de.y) * e,
          };
          if (salto.t >= 1) {
            pousar(salto);
            salto = null;
          }
        }
      } else if (passeio && !arrasto && !quieta) {
        andar(dt);
        if (passeio) pos = noRamo(passeio);
      }
      /* A arrastar, a posição vem do ponteiro (ver `mover`). */

      if (dt > 0) {
        /* Para que lado olha — com folga, para não se virar a cada tremor num
           ramo quase vertical. */
        const dx = pos.x - anterior.x;
        if (dx > 0.15) lado = 1;
        else if (dx < -0.15) lado = -1;

        /* O pêndulo: puxa para o centro, perde força, e a aceleração de quem a
           arrasta empurra-o para o lado contrário. */
        const nova = dx / dt;
        const acel = (nova - velX) / dt;
        velX += (nova - velX) * 0.5;
        if (!quieta) {
          rodar += (-40 * angulo - 3.2 * rodar - 0.05 * acel) * dt;
          angulo = Math.max(-70, Math.min(70, angulo + rodar * dt));
        }
      }

      pintar();
      pedido = visivel || arrasto || salto ? requestAnimationFrame(quadro) : 0;
    }

    function pintar() {
      bicho!.style.translate = `${pos.x - AGARRA * largura()}px ${pos.y - 4}px`;
      pend!.style.rotate = `${angulo}deg`;
      vira!.style.scale = `${lado} 1`;
    }

    function acordar() {
      if (pedido) return;
      antes = performance.now();
      pedido = requestAnimationFrame(quadro);
    }

    /* --------------------------------------------------------- arrastar */

    function agarrar(e: PointerEvent) {
      const caixa = el!.getBoundingClientRect();
      arrasto = {
        id: e.pointerId,
        dx: e.clientX - caixa.left - pos.x,
        dy: e.clientY - caixa.top - pos.y,
        x0: e.clientX,
        y0: e.clientY,
        mexeu: false,
      };
      salto = null;
      bicho!.setPointerCapture(e.pointerId);
      bicho!.setAttribute("data-agarrada", "");
      acordar();
    }

    function mover(e: PointerEvent) {
      if (!arrasto || e.pointerId !== arrasto.id) return;
      const caixa = el!.getBoundingClientRect();
      if (Math.hypot(e.clientX - arrasto.x0, e.clientY - arrasto.y0) > 4) arrasto.mexeu = true;
      pos = {
        x: Math.max(0, Math.min(caixa.width, e.clientX - caixa.left - arrasto.dx)),
        y: Math.max(-40, Math.min(caixa.height, e.clientY - caixa.top - arrasto.dy)),
      };
      if (quieta) pintar();
    }

    function largar(e: PointerEvent) {
      if (!arrasto || e.pointerId !== arrasto.id) return;
      const { mexeu, x0 } = arrasto;
      arrasto = null;
      bicho!.removeAttribute("data-agarrada");
      if (!mexeu) {
        /* Um toque: um empurrão, para longe do lado onde lhe tocaram. */
        const mao = el!.getBoundingClientRect().left + pos.x;
        rodar += (x0 < mao ? 1 : -1) * 260;
        acordar();
        return;
      }
      const sitio = maisPerto(pos.x, pos.y);
      if (!sitio) return;
      if (quieta) {
        pousar(sitio);
        pintar();
      } else {
        salto = { ...sitio, de: pos, t: 0 };
        acordar();
      }
    }

    /* ----------------------------------------------------------- ligar */

    medir();
    recolocar(true);
    pintar();
    bicho.setAttribute("data-pronta", "");

    let aMedir = 0;
    const tamanho = new ResizeObserver(() => {
      cancelAnimationFrame(aMedir);
      aMedir = requestAnimationFrame(() => {
        medir();
        if (!arrasto) {
          salto = null;
          recolocar(false);
        }
        pintar();
      });
    });
    tamanho.observe(el);
    tamanho.observe(moldura);

    const olho = new IntersectionObserver(([entrada]) => {
      visivel = entrada.isIntersecting;
      if (visivel) acordar();
    });
    olho.observe(el);

    bicho.addEventListener("pointerdown", agarrar);
    bicho.addEventListener("pointermove", mover);
    bicho.addEventListener("pointerup", largar);
    bicho.addEventListener("pointercancel", largar);

    return () => {
      cancelAnimationFrame(pedido);
      cancelAnimationFrame(aMedir);
      tamanho.disconnect();
      olho.disconnect();
      bicho.removeEventListener("pointerdown", agarrar);
      bicho.removeEventListener("pointermove", mover);
      bicho.removeEventListener("pointerup", largar);
      bicho.removeEventListener("pointercancel", largar);
    };
  }, []);

  return (
    <div ref={cena} className="em-ramos">
      <svg className="em-ramos__fundo" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
        <path data-andavel data-grossura="grosso" d="M-20 140 Q 300 420 520 1020" />
        <path data-andavel data-grossura="fino" d="M1020 80 Q 700 380 380 1020" />
        <path data-andavel data-grossura="medio" d="M-20 620 Q 380 700 1020 980" />
        <path data-andavel data-grossura="grosso" d="M1020 520 Q 640 600 -20 900" />
        <path data-andavel data-grossura="fino" d="M180 -20 Q 120 400 260 1020" />
        <path data-andavel data-grossura="medio" d="M840 -20 Q 900 500 760 1020" />
        <path className="em-ramos__raminho" d="M150 330 q 60 -20 90 -70" />
        <path className="em-ramos__raminho" d="M870 330 q -60 10 -80 -50" />
        <path className="em-ramos__raminho" d="M300 760 q 40 -40 50 -100" />
        <path className="em-ramos__raminho" d="M700 790 q -30 -50 -20 -110" />
      </svg>

      <div className="em-ramos__cima" aria-hidden="true">
        <svg
          className="em-ramos__paus em-ramos__paus--atras"
          viewBox="0 0 2000 160"
          preserveAspectRatio="xMidYMin slice"
        >
          <path data-andavel data-grossura="medio" d="M650 196 Q 800 118 952 6" />
          <path data-andavel data-grossura="grosso" d="M1048 10 Q 1252 74 1405 196" />
          <path data-andavel data-grossura="fino" d="M520 30 Q 696 64 840 150" />
          <path data-andavel data-grossura="grosso" d="M60 196 Q 200 90 380 10" />
          <path data-andavel data-grossura="fino" d="M1620 8 Q 1780 60 1960 196" />
          <path data-andavel data-grossura="medio" d="M240 20 Q 380 70 470 170" />
          <path className="em-ramos__raminho" d="M1260 128 q 26 -4 44 -24" />
          <path className="em-ramos__raminho" d="M762 126 q -10 -22 -32 -34" />
          <path className="em-ramos__raminho" d="M1840 104 q 20 -8 30 -30" />
          <Folha x={736} y={92} rodar={-150} />
          <Folha x={1304} y={104} rodar={-40} />
          <Folha x={920} y={26} rodar={-70} />
          <Folha x={1870} y={74} rodar={-60} />
          <Folha x={300} y={52} rodar={160} />
          {/* O ramo do meio, de ponta a ponta: é o último de trás, e é nele que
              ela começa (ver `recolocar`). */}
          <path
            data-andavel
            data-grossura="grosso"
            d="M-40 60 C 400 52, 700 64, 1000 54 S 1600 46, 2040 40"
          />
        </svg>

        <svg
          className="em-ramos__paus em-ramos__paus--frente"
          viewBox="0 0 2000 160"
          preserveAspectRatio="xMidYMin slice"
        >
          <path data-andavel data-grossura="fino" d="M796 8 Q 932 52 1020 146" />
          <path data-andavel data-grossura="grosso" d="M1204 150 Q 1312 50 1452 8" />
          <path data-andavel data-grossura="medio" d="M1100 4 Q 1106 74 1162 122" />
          <path data-andavel data-grossura="fino" d="M360 150 Q 450 60 600 6" />
          <path data-andavel data-grossura="grosso" d="M1560 6 Q 1640 90 1700 150" />
          <path className="em-ramos__raminho" d="M940 91 q 18 -2 30 -18" />
          <path className="em-ramos__raminho" d="M1368 58 q -6 -20 -24 -30" />
          <path className="em-ramos__raminho" d="M470 88 q 20 4 34 -8" />
          <Folha x={970} y={73} rodar={-50} />
          <Folha x={1344} y={28} rodar={-150} />
          <Folha x={1130} y={62} rodar={20} />
          <Folha x={504} y={80} rodar={-20} />
        </svg>
      </div>

      {/* Três invólucros, cada um a rodar à volta da mão: onde está, o pêndulo
          e para que lado olha (os três pelo JS); e a imagem, com o balanço de
          sempre (CSS). Decorativa: quem não usa rato nem dedo não perde nada. */}
      <span ref={preguica} className="em-ramos__preguica" aria-hidden="true">
        <span ref={pendulo}>
          <span ref={virar}>
            <img
              src="/marca/preguica.webp"
              width={325}
              height={286}
              alt=""
              loading="lazy"
              draggable={false}
            />
          </span>
        </span>
      </span>
    </div>
  );
}

/** Uma folha em gota, na ponta de um raminho. */
function Folha({ x, y, rodar }: { x: number; y: number; rodar: number }) {
  return (
    <path
      className="em-ramos__folha"
      d="M0 0 q 9 -7 18 0 q -9 7 -18 0 Z"
      transform={`translate(${x} ${y}) rotate(${rodar})`}
    />
  );
}

/**
 * Os pontos de um ramo a cada `PASSO` px, em coordenadas da cena. Primeiro
 * muitos pontos ao longo do desenho, depois espaçados por igual no ecrã: num
 * desenho esticado (`none`), iguais no desenho não é iguais no ecrã, e ela
 * andava aos solavancos.
 */
function amostrar(caminho: SVGPathElement, caixa: DOMRect) {
  const m = caminho.getScreenCTM();
  if (!m) return [];
  const total = caminho.getTotalLength();
  const brutos = Array.from({ length: 401 }, (_, k) => {
    const p = caminho.getPointAtLength((total * k) / 400);
    return {
      x: m.a * p.x + m.c * p.y + m.e - caixa.left,
      y: m.b * p.x + m.d * p.y + m.f - caixa.top,
    };
  });

  const pontos = [brutos[0]];
  let resto = 0;
  for (let k = 1; k < brutos.length; k++) {
    let a = brutos[k - 1];
    const b = brutos[k];
    let d = Math.hypot(b.x - a.x, b.y - a.y);
    while (resto + d >= PASSO) {
      const t = (PASSO - resto) / d;
      a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      pontos.push(a);
      d = Math.hypot(b.x - a.x, b.y - a.y);
      resto = 0;
    }
    resto += d;
  }
  return pontos;
}

/**
 * Onde os ramos se cruzam: pontos de ramos diferentes a menos de 3,5 px. Uma
 * grelha de 10 px evita comparar cada ponto com todos os outros; e fica um só
 * cruzamento por par de ramos em cada sítio, senão ela via três seguidos.
 */
function cruzamentos(ramos: Ramo[]) {
  const grelha = new Map<string, Sitio[]>();
  const chave = (gx: number, gy: number) => `${gx},${gy}`;
  ramos.forEach((r, ramo) =>
    r.pontos.forEach((p, i) => {
      const c = chave(Math.floor(p.x / 10), Math.floor(p.y / 10));
      const lista = grelha.get(c);
      if (lista) lista.push({ ramo, i });
      else grelha.set(c, [{ ramo, i }]);
    }),
  );

  const junta = (r: Ramo, i: number, s: Sitio) => {
    const lista = r.cruza.get(i);
    if (lista) lista.push(s);
    else r.cruza.set(i, [s]);
  };

  ramos.forEach((r, ramo) =>
    r.pontos.forEach((p, i) => {
      const cx = Math.floor(p.x / 10);
      const cy = Math.floor(p.y / 10);
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          for (const o of grelha.get(chave(gx, gy)) ?? []) {
            if (o.ramo <= ramo) continue;
            const q = ramos[o.ramo].pontos[o.i];
            if (Math.hypot(q.x - p.x, q.y - p.y) > 3.5) continue;
            const repetido = [...r.cruza].some(
              ([j, lista]) => Math.abs(j - i) < 8 && lista.some((l) => l.ramo === o.ramo),
            );
            if (repetido) continue;
            junta(r, i, o);
            junta(ramos[o.ramo], o.i, { ramo, i });
          }
        }
      }
    }),
  );
}
