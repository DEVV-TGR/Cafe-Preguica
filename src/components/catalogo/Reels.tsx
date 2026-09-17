import { reels, urlDoReel } from "@/data/reels";
import { Rotulo } from "./Objeto";

/**
 * # Os reels: seis vídeos da casa
 *
 * A casa publica vídeo no Instagram, sempre em formato reel, e tem dez mil
 * seguidores lá. Esta secção é a ponte.
 *
 * ## O formato é o do vídeo, não o da página
 *
 * As celas são **9:16**, que é como foram filmados. Recortá-los para paisagem
 * para encaixarem melhor numa grelha é deitar fora metade de cada plano — e
 * estas capas são, por larga margem, **o material com mais resolução que este
 * projeto tem**: quase quatro mil píxeis de largura, contra os mil e oitenta das
 * fotografias do feed.
 *
 * ## É um `pin`, e não um `pan`
 *
 * O carril dos cocktails já anda de lado, e um segundo carril logo a seguir
 * seria a mesma ideia duas vezes. Aqui o quadro **prende-se** e as seis celas
 * entram em sequência com a rolagem — outro dispositivo, outro ritmo.
 *
 * ## Cada cela abre o vídeo certo
 *
 * ⚠️ O emparelhamento capa↔vídeo faz-se pelo **código** do reel, que é ao mesmo
 * tempo o nome do ficheiro da capa. Ver `src/data/reels.ts` para a razão de não
 * ser pela ordem.
 *
 * São `<a>` normais para o Instagram — **não é o incorporador deles**. O
 * incorporador carrega script e cookies da Meta em cada visita, obrigava a abrir
 * a CSP, e fazia a página `/cookies` passar a mentir. Assim, o terceiro só vê
 * quem carregar.
 */
export function Reels({
  nome,
  facto,
  dado,
  legendas,
  noInstagram,
}: {
  nome: string;
  facto: string;
  dado: string;
  /** O texto de cada cela, por `chave`. Descreve a capa, não copia a legenda. */
  legendas: Record<string, string>;
  /** Dito em cada ligação, para quem navega por teclado saber para onde vai. */
  noInstagram: string;
}) {
  return (
    <section
      id="reels"
      data-sc-act="pin"
      data-sc-span="2.6"
      data-sc-drift="#0d0907"
    >
      <div data-sc-stage className="pg-reels">
        {/* O terceiro número a `0` é o "greet": está no ecrã mal o acto entra,
            sem esperar pela rolagem. E **não leva valor de saída** — tinha um, e
            fazia o título desaparecer quando as celas ainda estavam a entrar. */}
        <div className="pg-reels__intro" data-sc-cue="0 1 0">
          <Rotulo nome={nome} facto={facto} dado={dado} />
        </div>

        <ul className="pg-reels__grelha">
          {reels.map((reel, i) => (
            <li
              key={reel.codigo}
              /**
               * ⚠️ **Um valor só, e é o da entrada.**
               *
               * O segundo número de um `data-sc-cue` é quando a cela **sai** —
               * e estiveram aqui dois números, o que as fazia aparecer e
               * desvanecer logo a seguir. O resultado era uma secção quase
               * vazia: em qualquer ponto da rolagem viam-se duas ou três das
               * seis, e nunca as seis juntas.
               *
               * Com um valor só, entram em sequência e **ficam**.
               */
              data-sc-cue={`${0.04 + i * 0.07}`}
            >
              <a
                href={urlDoReel(reel.codigo)}
                target="_blank"
                rel="noopener noreferrer"
                className="pg-reel"
              >
                <img
                  src={`/reels/${reel.codigo}.webp`}
                  srcSet={`/reels/${reel.codigo}-420.webp 420w, /reels/${reel.codigo}.webp 720w`}
                  sizes="(min-width: 60rem) 15vw, 38vw"
                  width={720}
                  height={1280}
                  alt={legendas[reel.chave] ?? ""}
                  loading="lazy"
                  decoding="async"
                />
                <span className="pg-reel__legenda">
                  {legendas[reel.chave]}
                  {/* Só para leitores de ecrã: a seta visual não diz que abre
                      noutro sítio, e um link que muda de site tem de o dizer. */}
                  <span className="sr-only"> — {noInstagram}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
