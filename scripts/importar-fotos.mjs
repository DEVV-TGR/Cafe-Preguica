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

await mkdir(DESTINO, { recursive: true });

const ficheiros = (await readdir(ORIGEM)).filter((f) => /\.jpe?g$/i.test(f));
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

  for (const largura of LARGURAS) {
    if (width < largura) continue;
    const saida = join(DESTINO, `${nome}${largura === 1080 ? "" : `-${largura}`}.webp`);
    await entrada
      .clone()
      .resize({ width: largura, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(saida);
    escritos++;
  }
}

console.log(`✓ ${escritos} ficheiros em ${DESTINO}/`);
