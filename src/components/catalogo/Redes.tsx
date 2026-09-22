import { marca, perfis, utilizador, type Rede } from "@/data/marca";
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
 * `marca.json`. Usado nos reels e em "onde estamos".
 *
 * Ao passar o rato, o círculo **abre** e passa a dizer "Seguir @cafepreguica",
 * como o botão do Instagram que esteve nos reels antes disto, e enche-se de
 * dourado como o `.pg-botao`.
 *
 * O nome da rede não se vê, porque o logótipo já o diz, mas vai para o leitor
 * de ecrã: "Seguir @cafepreguica" repetido quatro vezes não diz para onde vai
 * cada link. O texto recolhido também fica no HTML, e não com `display: none`,
 * para ser lido.
 *
 * São `<a>` normais, e os ícones são desenhados em `Icones.tsx`. Nada aqui
 * carrega o que quer que seja das redes.
 */
export function Redes({
  rotulo,
  seguir,
  className = "",
}: {
  /** Nome da lista para leitores de ecrã ("Redes da casa"). */
  rotulo: string;
  /** "Seguir", antes do nome de utilizador. */
  seguir: string;
  className?: string;
}) {
  if (perfis.length === 0) return null;

  return (
    <ul className={`pg-redes ${className}`} aria-label={rotulo}>
      {perfis.map(({ rede, url }) => {
        const Icone = ICONES[rede];
        return (
          <li key={rede}>
            <a className="pg-rede" href={url} target="_blank" rel="noopener noreferrer">
              <Icone className="pg-icone" />
              <span className="sr-only">{NOMES[rede]}: </span>
              <span className="pg-rede__texto">
                {seguir}{" "}
                {/* Sem nome de utilizador (o Facebook), fica o nome da casa. */}
                <span className="pg-rede__conta">{utilizador(rede, url) ?? marca.nome}</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
