"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * # O jogo dos sabores
 *
 * O Cocktail Preguiça e o Unicórnio vendem-se num sabor à escolha, e cada um tem o seu jogo — o Cocktail nos cocktails, o Unicórnio nas
 * águas (ver `COM_SABORES` em `data/ementa.ts`). Na mesa, com a carta no telemóvel, **escolher é a parte difícil** —
 * e é aí que a preguiça ajuda: roda pelos sabores, cada vez mais devagar, e
 * pára num. O abrandar não é enfeite; é o nome da casa outra vez.
 *
 * Não faz pedido nenhum, e a nota por baixo di-lo. O site é estático e não
 * recebe nada de ninguém (ver `docs/decisoes-pendentes.md`).
 *
 * ## ⚠️ As cores são decoração, não informação
 *
 * O copo enche-se de uma cor por sabor — amarelo para o limão, verde para a
 * menta. **Não é a cor da bebida que chega à mesa**: ninguém a mediu, e as
 * fotografias da casa não dizem que sabor é qual. É a cor do nome da fruta, e
 * por isso o copo é um desenho e não uma fotografia.
 *
 * ## Movimento reduzido
 *
 * Com `prefers-reduced-motion` a roleta não roda: o sabor aparece logo. O CSS
 * global já corta as transições; isto corta a sequência de passos, que é JS.
 */

/**
 * Um sabor já na língua da página. Os sabores vêm do `ementa.json` (o painel
 * muda-os), mas chegam aqui por props, já traduzidos: importar o módulo da carta
 * metia o ficheiro inteiro no JavaScript da `/ementa`, incluindo os artigos da
 * carta secreta.
 *
 * `cor` a `null` é o arco-íris da "Surpresa" — um gradiente do SVG, cujo
 * endereço depende do id de cada copo (ver `Copo`).
 */
export type SaborDoJogo = { id: string; nome: string; cor: string | null };

/** Quantas trocas a roleta dá antes de parar. */
const PASSOS = 16;

export function Sabores({
  sabores,
  textos,
}: {
  sabores: SaborDoJogo[];
  textos: {
    titulo: string;
    sortear: string;
    aRodar: string;
    escolheu: string;
    escolhido: string;
    nenhum: string;
    nota: string;
  };
}) {
  const [sabor, setSabor] = useState<SaborDoJogo | null>(null);
  const [aRodar, setARodar] = useState(false);
  const [quem, setQuem] = useState<"preguica" | "pessoa">("pessoa");
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  function escolher(s: SaborDoJogo) {
    clearTimeout(temporizador.current);
    setARodar(false);
    setQuem("pessoa");
    setSabor(s);
  }

  function sortear() {
    if (aRodar) return;
    const final = sabores[Math.floor(Math.random() * sabores.length)];
    setQuem("preguica");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSabor(final);
      return;
    }

    setARodar(true);
    let passo = 0;
    const seguinte = () => {
      passo += 1;
      if (passo >= PASSOS) {
        setSabor(final);
        setARodar(false);
        return;
      }
      /* Nunca o mesmo duas vezes seguidas: parecia que a roleta encravou. */
      setSabor((anterior) => {
        const outros = sabores.filter((s) => s.id !== anterior?.id);
        /* Com um sabor só não há outro para onde saltar. */
        return outros.length > 0 ? outros[Math.floor(Math.random() * outros.length)] : anterior;
      });
      /* O intervalo cresce com o quadrado do passo: começa a 40 ms e acaba
         perto de meio segundo, ~2,5 s ao todo. Linear parecia um relógio. */
      temporizador.current = setTimeout(seguinte, 40 + passo * passo * 1.8);
    };
    seguinte();
  }

  /* Um id por jogo: com dois na mesma página (Cocktail e Unicórnio), ids fixos
     no SVG repetiam-se, e o gradiente de um copo podia vir do outro. */
  const id = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const gradiente = `em-surpresa-${id}`;
  const cor = !sabor ? "transparent" : (sabor.cor ?? `url(#${gradiente})`);
  const olho = aRodar
    ? textos.aRodar
    : sabor
      ? quem === "preguica"
        ? textos.escolheu
        : textos.escolhido
      : textos.nenhum;

  return (
    <div className="em-sabores" data-a-rodar={aRodar || undefined}>
      <div className="em-sabores__palco">
        <Copo id={id} gradiente={gradiente} cor={cor} cheio={sabor !== null} />
        <div className="em-sabores__leitura">
          <p className="em-sabores__olho">{olho}</p>
          <p className="em-sabores__nome" aria-hidden="true">
            {sabor ? sabor.nome : "?"}
          </p>
          {/* Só o resultado final é anunciado — anunciar os dezasseis passos
              da roleta a um leitor de ecrã era uma lista de frutas a metralhar. */}
          <p className="sr-only" aria-live="polite">
            {!aRodar && sabor ? `${olho}: ${sabor.nome}` : ""}
          </p>
        </div>
      </div>

      <p className="em-sabores__titulo">{textos.titulo}</p>
      <div className="pg-sabores" role="group" aria-label={textos.titulo}>
        {sabores.map((s) => (
          <button
            key={s.id}
            type="button"
            className="pg-sabor"
            aria-pressed={sabor?.id === s.id && !aRodar}
            onClick={() => escolher(s)}
          >
            <span
              className="em-sabor__ponto"
              style={{ background: s.cor ?? undefined }}
              data-surpresa={s.cor === null || undefined}
              aria-hidden="true"
            />
            {s.nome}
          </button>
        ))}
      </div>

      <p className="em-sabores__acao">
        <button
          type="button"
          className="pg-botao pg-botao--cheio"
          onClick={sortear}
          /* `aria-disabled` e não `disabled`: desligado, o botão perdia o
             foco a meio da roleta e quem sorteou pelo teclado ficava no
             `<body>`. O `sortear` já não faz nada enquanto roda. */
          aria-disabled={aRodar}
        >
          <img
            className="em-sabores__preguica"
            src="/marca/preguica.webp"
            alt=""
            width={325}
            height={286}
          />
          {textos.sortear}
        </button>
      </p>
      <p className="pg-nota">{textos.nota}</p>
    </div>
  );
}

/**
 * O copo balão das fotografias, em traço. O líquido é um rectângulo recortado
 * pela forma da taça, e é só a cor dele que muda — a forma nunca mexe, para a
 * roleta ler como "o copo a mudar de sabor" e não como uma animação.
 */
function Copo({
  id,
  gradiente,
  cor,
  cheio,
}: {
  id: string;
  gradiente: string;
  cor: string;
  cheio: boolean;
}) {
  const taca = `em-taca-${id}`;
  return (
    <svg className="em-copo" viewBox="0 0 140 220" aria-hidden="true">
      <defs>
        <linearGradient id={gradiente} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0455c" />
          <stop offset="0.35" stopColor="#efc53d" />
          <stop offset="0.65" stopColor="#5cc49a" />
          <stop offset="1" stopColor="#3f8fd8" />
        </linearGradient>
        <clipPath id={taca}>
          <path d="M34 34 C12 64 14 124 70 128 C126 124 128 64 106 34 Z" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${taca})`}>
        <rect
          className="em-copo__liquido"
          x="0"
          y="58"
          width="140"
          height="80"
          style={{ fill: cor }}
          data-cheio={cheio || undefined}
        />
        {/* Dois cubos de gelo, meio afundados. */}
        <rect x="46" y="62" width="20" height="18" rx="4" className="em-copo__gelo" />
        <rect x="70" y="70" width="18" height="17" rx="4" className="em-copo__gelo" />
      </g>

      {/* A palhinha às riscas, como nas fotografias. */}
      <line x1="82" y1="112" x2="118" y2="6" className="em-copo__palhinha" />
      <line x1="82" y1="112" x2="118" y2="6" className="em-copo__riscas" />

      <path
        d="M34 34 C12 64 14 124 70 128 C126 124 128 64 106 34"
        className="em-copo__vidro"
      />
      <path d="M70 128 L70 190" className="em-copo__vidro" />
      <ellipse cx="70" cy="194" rx="30" ry="5" className="em-copo__vidro" />
    </svg>
  );
}
