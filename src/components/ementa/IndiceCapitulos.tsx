"use client";

import { useEffect, useRef, useState } from "react";

/**
 * O índice dos capítulos, preso ao topo por baixo da barra.
 *
 * **Funciona sem JavaScript**: são âncoras normais, e carregar numa leva ao
 * capítulo. O que o JS acrescenta é só saber **onde se está** — o capítulo
 * visível fica marcado — e, no telemóvel, arrastar o índice para o botão
 * marcado ficar à vista quando a fila não cabe no ecrã.
 *
 * ## Porque é que a linha de observação está a meio do ecrã
 *
 * O `rootMargin` corta a janela até sobrar uma faixa fina à altura de ~45%. Um
 * capítulo conta como "o actual" quando atravessa essa faixa — que é onde os
 * olhos estão a ler. Com a janela inteira, dois capítulos estariam visíveis ao
 * mesmo tempo na passagem de um para o outro e a marca saltava entre os dois.
 */
export function IndiceCapitulos({
  itens,
  etiqueta,
}: {
  itens: { id: string; nome: string }[];
  etiqueta: string;
}) {
  const [ativo, setAtivo] = useState<string | null>(null);
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    const alvos = itens
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) setAtivo(entrada.target.id);
        }
      },
      { rootMargin: "-45% 0px -54% 0px" },
    );
    alvos.forEach((alvo) => observador.observe(alvo));
    return () => observador.disconnect();
  }, [itens]);

  useEffect(() => {
    const navEl = nav.current;
    const botao = navEl?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!navEl || !botao) return;
    /* `scrollTo` no próprio índice e não `scrollIntoView` no botão: este
       último também rola a página na vertical, e puxava o leitor para trás a
       meio da leitura. */
    navEl.scrollTo({
      left: botao.offsetLeft - (navEl.clientWidth - botao.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [ativo]);

  return (
    <nav ref={nav} className="em-indice" aria-label={etiqueta}>
      {itens.map(({ id, nome }, i) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={ativo === id ? "true" : undefined}
        >
          <span className="em-indice__numero" aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
          {nome}
        </a>
      ))}
    </nav>
  );
}
