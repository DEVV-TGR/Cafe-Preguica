/**
 * Processa o material em bruto de `fotos/` para `public/`.
 *
 * O que entra em `fotos/` é o que o cliente mandou e o que se recolheu: JPEG
 * grandes, do Instagram ou da máquina de quem os tirou. O que sai para
 * `public/` é WebP no tamanho em que a página os usa, e mais nada.
 *
 * **A pasta `fotos/` fica fora do git** (ver `.gitignore`): é material em bruto,
 * pesa dezenas de MB, e reprocessa-se com este comando. O que se versiona é o
 * resultado.
 *
 *   npm run fotos
 *
 * ⚠️ **As fotografias de hoje são derivadas do Instagram, a 1080 px de
 * largura.** É o tecto do que o Instagram serve a quem não tem sessão iniciada.
 * Chegam para os cartões do carril e para os blocos de meia página; **não
 * chegam para um herói de ecrã inteiro** num monitor grande, e é por isso que o
 * primeiro acto da página é tipográfico. Quando chegarem os originais, este
 * script volta a correr e os tamanhos abaixo passam a ter matéria-prima a
 * sério.
 */
import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import { join, parse } from "node:path";

const ORIGEM = "fotos/instagram";
const DESTINO = "public/casa";
const ORIGEM_REELS = "fotos/reels";
const DESTINO_REELS = "public/reels";

/**
 * O nome do ficheiro é o que a página escreve no `src`, por isso diz **o que a
 * fotografia é** e não em que ordem foi descarregada. `post-13.jpg` obriga a
 * abrir a pasta para saber o que lá está; `cocktail-coco.webp` não.
 *
 * A ordem aqui não importa; a ordem da página vive nos componentes.
 */
const NOMES = {
  "post-01": "cartaz-masterclass",
  "post-02": "masterclass-mesa",
  "post-03": "canecas-ardosia",
  "post-04": "telemovel-cocktail",
  "post-05": "menu-granito",
  "post-06": "mesa-tres",
  "post-07": "tosta-chocolate",
  "post-08": "boas-historias",
  "post-09": "negroni-salpico",
  "post-10": "balao-coracao",
  "post-11": "tabua-partilha",
  "post-12": "menu-mesa",
  "post-13": "cocktail-coco",
  "post-14": "cocktail-rosa",
  "post-15": "cocktail-amarelo",
  "post-16": "cocktail-turquesa",
  "post-17": "cocktail-azul",
  "post-18": "lima-espremida",
  "post-19": "negroni-fumo",
  /* A fachada, que o cliente mandou à parte. É a única fotografia de dia do
     site inteiro, e é de propósito: é a primeira coisa que se vê. */
  image: "fachada",
};

/**
 * Duas larguras e não uma escada de seis: a página usa estas fotografias em
 * dois sítios só — cartões de carril e blocos. Gerar tamanhos que ninguém pede
 * é encher o repositório para nada.
 *
 * `1080` é o original tal e qual; não se amplia nada, porque ampliar um JPEG do
 * Instagram só produz um ficheiro maior igualmente desfocado.
 */
const LARGURAS = [640, 1080];

/**
 * A fachada é o herói e ocupa o ecrã inteiro, portanto precisa de mais largura
 * do que os cartões — e o original tem 2204 px, ao contrário das do Instagram.
 */
const LARGURAS_FACHADA = [640, 1280, 2000];

/**
 * As capas dos reels vêm em 9:16 e a **três mil e novecentos píxeis de largura**,
 * muito acima de tudo o resto — são o material com mais qualidade que este
 * projeto tem. As celas mostram-nas a menos de um terço da largura do ecrã, por
 * isso 720 px chegam e sobram; guardar o original era arrastar 1,4 MB por cela.
 *
 * ⚠️ **O nome do ficheiro é o código do reel no Instagram**, e é isso que
 * emparelha a capa com o vídeo em `src/data/reels.ts`. Renomear um destes
 * ficheiros parte a ligação em silêncio: a cela passa a abrir o vídeo de outro.
 */
const LARGURAS_REELS = [420, 720];

await mkdir(DESTINO, { recursive: true });

/* PNG além de JPEG: a fachada veio em PNG e ficava de fora em silêncio. */
const ficheiros = (await readdir(ORIGEM)).filter((f) => /\.(jpe?g|png)$/i.test(f));
if (ficheiros.length === 0) {
  console.error(`✖ nada em ${ORIGEM}/ — é lá que entra o material em bruto.`);
  process.exit(1);
}

let escritos = 0;
for (const ficheiro of ficheiros.sort()) {
  const base = parse(ficheiro).name;
  const nome = NOMES[base];
  if (!nome) {
    /* Um ficheiro novo sem nome atribuído não passa em silêncio: sairia para
       `public/` com o nome do Instagram e ninguém saberia o que é. */
    console.warn(`⚠ ${ficheiro} não tem nome em NOMES — ignorado.`);
    continue;
  }

  const entrada = sharp(join(ORIGEM, ficheiro));
  const { width } = await entrada.metadata();

  for (const largura of nome === "fachada" ? LARGURAS_FACHADA : LARGURAS) {
    if (width < largura) continue;
    /* O maior tamanho fica sem sufixo, que é o que a página escreve no `src`;
       os outros levam a largura e entram no `srcset`. */
    const maior = nome === "fachada" ? 2000 : 1080;
    const saida = join(DESTINO, `${nome}${largura === maior ? "" : `-${largura}`}.webp`);
    await entrada
      .clone()
      .resize({ width: largura, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(saida);
    escritos++;
  }
}

console.log(`✓ ${escritos} ficheiros em ${DESTINO}/`);

/* ------------------------------------------------------ as capas dos reels -- */

await mkdir(DESTINO_REELS, { recursive: true });

let capas = 0;
for (const ficheiro of (await readdir(ORIGEM_REELS)).filter((f) => /\.jpe?g$/i.test(f)).sort()) {
  const codigo = parse(ficheiro).name;
  const entrada = sharp(join(ORIGEM_REELS, ficheiro));

  for (const largura of LARGURAS_REELS) {
    const saida = join(
      DESTINO_REELS,
      `${codigo}${largura === 720 ? "" : `-${largura}`}.webp`,
    );
    await entrada
      .clone()
      .resize({ width: largura, withoutEnlargement: true })
      .webp({ quality: 76 })
      .toFile(saida);
    capas++;
  }
}

console.log(`✓ ${capas} ficheiros em ${DESTINO_REELS}/`);
