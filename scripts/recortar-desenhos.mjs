/**
 * Recorta os desenhos do menu impresso para a página da ementa.
 *
 *   node scripts/recortar-desenhos.mjs <imagem-do-menu>
 *
 * ⚠️ **É uma experiência, e sabe-o.** Os desenhos só existem dentro da
 * fotografia do menu que a casa mandou (1600 × 1140), por isso cada um sai com
 * 100–200 px — chega para os mostrar pequenos, não mais. Quando a casa mandar
 * os ficheiros originais, é trocar a origem e as caixas aqui, e correr outra vez.
 *
 * ## Como sai o fundo
 *
 * O menu é uma ardósia cinzenta-escura; a página é quase preta. Uma máscara de
 * luminância chega: o que é escuro fica transparente, o que é claro fica, e a
 * passagem entre os dois é suave para não haver serrilhado. Os contornos pretos
 * dos desenhos também se vão — mas por cima do fundo quase preto do site o
 * resultado é o mesmo que se lá estivessem.
 *
 * ## Ampliados para o dobro
 *
 * A página mostra-os maiores do que o recorte, e o browser a esticar 150 px
 * serrilha. Ampliam-se aqui, uma vez, com `lanczos3` e um realce leve — ficam
 * macios, mas limpos. Como vivem sobretudo por trás do texto e esbatidos (ver
 * `components/ementa/Desenhos.tsx`), a moleza não se nota. Com os originais,
 * esta ampliação deixa de ser precisa: tira-se o `AMPLIAR`.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const origem = process.argv[2];
if (!origem) {
  console.error("uso: node scripts/recortar-desenhos.mjs <imagem-do-menu>");
  process.exit(1);
}

/* [esquerda, topo, largura, altura] na fotografia de 1600 × 1140 da face de
   fora do menu (a que tem o "Preguiça · MENU" e os desenhos). */
const CAIXAS = {
  "cocktail-alto": [1118, 70, 90, 202],
  "cocktail-laranja": [1232, 70, 106, 182],
  "cocktail-vermelho": [1348, 62, 98, 188],
  "cocktail-caneca": [1440, 112, 125, 162],
  "comida-tabua": [1105, 762, 212, 132],
  "comida-tostinhas": [1385, 720, 178, 180],
  "comida-pao": [1115, 888, 195, 182],
  "comida-tosta": [1385, 900, 178, 170],
};

/* Abaixo de ESCURO é fundo; acima de CLARO é desenho; entre os dois, a borda. */
const ESCURO = 58;
const CLARO = 96;

const AMPLIAR = 2;

mkdirSync("public/desenhos", { recursive: true });

for (const [nome, [left, top, width, height]] of Object.entries(CAIXAS)) {
  const { data, info } = await sharp(origem)
    .extract({ left, top, width, height })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const luz = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const t = Math.min(1, Math.max(0, (luz - ESCURO) / (CLARO - ESCURO)));
    rgba[j] = r;
    rgba[j + 1] = g;
    rgba[j + 2] = b;
    rgba[j + 3] = Math.round(t * t * (3 - 2 * t) * 255);
  }

  /* Primeiro aparar o transparente à volta, depois ampliar — duas passagens,
     porque o `sharp` corta antes de redimensionar dentro da mesma cadeia. */
  const aparado = await sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 1 })
    .png()
    .toBuffer({ resolveWithObject: true });

  const final = await sharp(aparado.data)
    .resize(aparado.info.width * AMPLIAR, aparado.info.height * AMPLIAR, { kernel: "lanczos3" })
    .sharpen({ sigma: 0.7 })
    .webp({ quality: 90, alphaQuality: 90 })
    .toFile(`public/desenhos/${nome}.webp`);
  console.log(`✓ public/desenhos/${nome}.webp — ${final.width} × ${final.height}`);
}
