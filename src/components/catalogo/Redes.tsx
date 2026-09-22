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
 * Ao passar o rato, o círculo enche-se de dourado e por baixo da fila aparece
 * "Seguir @cafepreguica", o texto do botão do Instagram que esteve nos reels.
 *
 * ⚠️ **Os círculos nunca se mexem, e é de propósito.** Esteve feito com o
 * círculo a abrir para dentro da fila, com o texto lá dentro, e medido frame a
 * frame: ao passar de um para o do lado, os ícones deslizavam 150 a 170px, e em
 * metade das direções era o próprio ícone apontado que fugia do cursor. Não há
 * curva de animação que resolva isto: se um círculo cresce dentro da fila,
 * empurra os outros. Por isso a legenda vive **fora** da fila, num lugar fixo
 * (`position: absolute`), e só troca de texto.
 *
 * A legenda está dentro do link: é ela que lhe dá nome, junto com o nome da
 * rede, que não se vê porque o logótipo já o diz, mas vai para o leitor de
 * ecrã. "Seguir @cafepreguica" repetido quatro vezes não diria para onde vai
 * cada link. Escondida com `opacity`, e não com `display: none`, para ser lida.
 *
 * São `<a>` normais, e os ícones são desenhados em `Icones.tsx`. Nada aqui
 * carrega o que quer que seja das redes.
 */
export function Redes({
  rotulo,
  seguir,
  alinhar,
  className = "",
}: {
  /** Nome da lista para leitores de ecrã ("Redes da casa"). */
  rotulo: string;
  /** "Seguir", antes do nome de utilizador. */
  seguir: string;
  /** De que lado da fila a legenda se encosta: o da borda mais próxima. */
  alinhar: "esquerda" | "direita";
  className?: string;
}) {
  if (perfis.length === 0) return null;

  return (
    <ul className={`pg-redes pg-redes--${alinhar} ${className}`} aria-label={rotulo}>
      {perfis.map(({ rede, url }) => {
        const Icone = ICONES[rede];
        return (
          <li key={rede}>
            <a className="pg-rede" href={url} target="_blank" rel="noopener noreferrer">
              <Icone className="pg-icone" />
              <span className="pg-rede__legenda">
                <span className="sr-only">{NOMES[rede]}: </span>
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
