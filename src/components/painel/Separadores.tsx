"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone, type NomeDoIcone } from "./Icone";

/**
 * Os separadores do topo — as secções do painel, sempre à vista.
 *
 * Antes, cada secção tinha uma seta para voltar ao ecrã inicial e mais nada:
 * para ir da Ementa à Casa eram dois toques e um ecrã pelo meio. Assim é um.
 *
 * É de cliente só para saber em que secção se está (`usePathname`); as
 * ligações são as de sempre.
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
    nav.scrollLeft = ativo.offsetLeft - (nav.clientWidth - ativo.offsetWidth) / 2;
  }, [caminho]);

  return (
    <nav ref={fila} className="pn-separadores" aria-label="Secções do painel">
      {SECCOES.map(({ href, nome, icone }) => (
        <Link
          key={href}
          href={href}
          className="pn-separadores__um"
          aria-current={ativa(caminho, href) ? "page" : undefined}
        >
          <Icone nome={icone} tamanho={17} />
          {nome}
        </Link>
      ))}
    </nav>
  );
}
