"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone, type NomeDoIcone } from "./Icone";
import { porGravar, PERGUNTA } from "@/lib/painel/por-gravar";

/**
 * Os separadores do topo — as secções do painel, sempre à vista.
 *
 * Vivem no layout de `(dentro)`, que não se desenha outra vez ao mudar de
 * secção: o topo fica onde está e só o conteúdo de baixo muda. É de cliente
 * para saber em que secção se está (`usePathname`) e para perguntar antes de
 * deixar para trás alterações por gravar (`lib/painel/por-gravar.ts`).
 */
export const SECCOES: { href: string; nome: string; icone: NomeDoIcone }[] = [
  { href: "/painel", nome: "Painel", icone: "painel" },
  { href: "/painel/ementa", nome: "Ementa", icone: "ementa" },
  { href: "/painel/casa", nome: "Casa", icone: "casa" },
  { href: "/painel/newsletter", nome: "Newsletter", icone: "newsletter" },
  { href: "/painel/mesas", nome: "Mesas", icone: "mesas" },
  { href: "/painel/sessoes", nome: "Sessões", icone: "sessoes" },
];

/* `/painel/newsletter/enviada/…` ainda é a Newsletter; `/painel` só é o
   Painel quando é mesmo `/painel`, senão acendia em todas. */
function ativa(caminho: string, href: string): boolean {
  return href === "/painel" ? caminho === href : caminho === href || caminho.startsWith(`${href}/`);
}

/** Para qualquer ligação que saia da secção: pergunta se houver trabalho por gravar. */
export function seHouverPorGravar(evento: MouseEvent) {
  if (porGravar.ativo && !window.confirm(PERGUNTA)) evento.preventDefault();
}

export function Separadores() {
  const caminho = usePathname();
  const fila = useRef<HTMLElement>(null);

  /* No telemóvel a fila rola de lado, e as Sessões ou as Mesas ficavam fora do
     ecrã, à direita, sem se ver onde se está. Centra-se o separador ativo —
     à mão, e não com `scrollIntoView`, que também rolava a página. */
  useEffect(() => {
    const nav = fila.current;
    const ativo = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !ativo) return;
    nav.scrollTo({ left: ativo.offsetLeft - (nav.clientWidth - ativo.offsetWidth) / 2, behavior: "smooth" });
  }, [caminho]);

  return (
    <nav ref={fila} className="pn-separadores" aria-label="Secções do painel">
      {SECCOES.map(({ href, nome, icone }) => (
        <Link
          key={href}
          href={href}
          className="pn-separadores__um"
          aria-current={ativa(caminho, href) ? "page" : undefined}
          onClick={seHouverPorGravar}
        >
          <Icone nome={icone} tamanho={17} />
          {nome}
        </Link>
      ))}
    </nav>
  );
}

/** O logótipo do topo, que volta ao quadro — com a mesma pergunta. */
export function LigacaoAoQuadro({ children }: { children: React.ReactNode }) {
  return (
    <Link href="/painel" className="pn-topo__casa" aria-label="Painel" onClick={seHouverPorGravar}>
      {children}
    </Link>
  );
}
