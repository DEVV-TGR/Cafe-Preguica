import { perfis, type Rede } from "@/data/marca";
import { IconeFacebook, IconeInstagram, IconeSpotify, IconeTiktok } from "./Icones";

const ICONES: Record<Rede, typeof IconeInstagram> = {
  instagram: IconeInstagram,
  facebook: IconeFacebook,
  tiktok: IconeTiktok,
  spotify: IconeSpotify,
};

/* Nomes de marca: são iguais nas duas línguas, por isso não vão para
   `messages/`. */
const NOMES: Record<Rede, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  spotify: "Spotify",
};

/**
 * Os perfis da casa, um círculo por rede. Aparecem só as que têm link em
 * `marca.json`.
 *
 * - `abre` (os reels): ao passar o rato, o círculo **abre** para mostrar o nome
 *   e enche-se de dourado, como o `.pg-botao`.
 * - `icones` ("onde estamos"): só se enche, sem abrir. Aí o cartão é estreito e
 *   o botão das direções já tem texto que chegue.
 *
 * O nome está sempre no HTML, só recolhido. É ele que dá nome ao link para
 * quem usa um leitor de ecrã, e por isso não se esconde com `display: none`.
 *
 * São `<a>` normais, e os ícones são desenhados em `Icones.tsx`. Nada aqui
 * carrega o que quer que seja das redes.
 */
export function Redes({
  rotulo,
  variante,
  className = "",
}: {
  /** Nome da lista para leitores de ecrã ("Redes da casa"). */
  rotulo: string;
  variante: "abre" | "icones";
  className?: string;
}) {
  if (perfis.length === 0) return null;

  return (
    <ul className={`pg-redes pg-redes--${variante} ${className}`} aria-label={rotulo}>
      {perfis.map(({ rede, url }) => {
        const Icone = ICONES[rede];
        return (
          <li key={rede}>
            <a className="pg-rede" href={url} target="_blank" rel="noopener noreferrer">
              <Icone className="pg-icone" />
              <span className="pg-rede__nome">{NOMES[rede]}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
