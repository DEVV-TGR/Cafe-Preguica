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
/* As fotografias que o cliente mandou já tratadas para o sítio onde ficam
   (o herói e a secção da casa). Entram pela mesma tabela de nomes. */
const ORIGEM_SITE = "fotos/fotos_terminar_site";
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
     site inteiro, e é de propósito: é a primeira coisa que se vê.
     ⚠️ `hero` substituiu a antiga `image.png` (a da árvore em flor), que ainda
     está em `fotos/instagram/` mas já não tem nome: as duas a sair como
     `fachada` era a última a correr a ganhar, sem aviso. */
  hero: "fachada",
  /* A mesma fachada tirada ao alto, para o herói em ecrãs verticais: a de cima
     cortada para um telemóvel ficava com um terço da casa, esticado. */
  foto_hero_telemovel: "fachada-vertical",
  foto_seccao_casa: "sala-madeira",
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
 * As que pedem mais largura do que os cartões. O último número é um **tecto**:
 * se o original for mais estreito, o maior tamanho sai com a largura do
 * original. Os `srcSet` em `Heroi.tsx` e em `page.tsx` escrevem essas larguras
 * à mão, por isso uma fotografia nova pede que se olhe para lá também.
 *
 * - A fachada é o herói e ocupa o ecrã inteiro. A vertical fica abaixo dos
 *   2000 px de propósito: o herói é o que o telemóvel espera para pintar o
 *   primeiro ecrã, e 1600 já passa dos 2× de um ecrã de telemóvel.
 * - A sala fica em meia página no PC, que num ecrã retina são uns 1800 px, e
 *   abre-se inteira no visor.
 */
const LARGURAS_ESPECIAIS = {
  fachada: [640, 1280, 2560],
  "fachada-vertical": [640, 1080, 1600],
  "sala-madeira": [640, 1080, 2400],
};

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
const imagens = async (pasta) =>
  (await readdir(pasta))
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .map((f) => ({ pasta, ficheiro: f }));
const ficheiros = [...(await imagens(ORIGEM)), ...(await imagens(ORIGEM_SITE))];
if (ficheiros.length === 0) {
  console.error(`✖ nada em ${ORIGEM}/ — é lá que entra o material em bruto.`);
  process.exit(1);
}

let escritos = 0;
for (const { pasta, ficheiro } of ficheiros) {
  const base = parse(ficheiro).name;
  const nome = NOMES[base];
  if (!nome) {
    /* Um ficheiro novo sem nome atribuído não passa em silêncio: sairia para
       `public/` com o nome do Instagram e ninguém saberia o que é. */
    console.warn(`⚠ ${ficheiro} não tem nome em NOMES — ignorado.`);
    continue;
  }

  const entrada = sharp(join(pasta, ficheiro));
  const { width } = await entrada.metadata();

  /* Nunca acima do original: ampliar só produz um ficheiro maior igualmente
     desfocado. O `Set` junta o tecto com o tamanho do meio quando calham no
     mesmo número. */
  const larguras = [
    ...new Set((LARGURAS_ESPECIAIS[nome] ?? LARGURAS).map((l) => Math.min(l, width))),
  ];
  /* O maior tamanho fica sem sufixo, que é o que a página escreve no `src`;
     os outros levam a largura e entram no `srcset`. */
  const maior = Math.max(...larguras);

  for (const largura of larguras) {
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
