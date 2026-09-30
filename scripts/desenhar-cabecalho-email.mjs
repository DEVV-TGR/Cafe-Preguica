/**
 * Desenha a faixa do topo dos emails da newsletter.
 *
 *   node scripts/desenhar-cabecalho-email.mjs
 *
 * ## Porque é uma imagem, e não uma célula com fundo escuro
 *
 * Já foi uma célula `background:#0b0806` com o logótipo lá dentro. No Gmail do
 * telemóvel, em modo escuro, o fundo da célula era invertido para quase branco
 * e só o PNG do logótipo ficava escuro — um rectângulo preto no meio de uma
 * faixa branca. **Os clientes de email invertem cores, mas nunca imagens**, e
 * por isso a faixa inteira (fundo, logótipo e o fio de ouro por baixo) é agora
 * um PNG só, de ponta a ponta.
 *
 * Sai com o dobro da largura a que se mostra (1120 para 560), para os ecrãs de
 * alta densidade.
 */
import sharp from "sharp";

const LARGURA = 1120;
const ALTURA_DA_FAIXA = 360;
/* 3 px a 1×, a espessura do fio da barra do site. */
const FIO = 6;
const LARGURA_DO_LOGO = 460;
/* As mesmas cores de `src/lib/newsletter/corpo.ts`. */
const ESCURO = "#0b0806";
const OURO = "#c9a227";

const logo = await sharp("public/marca/marca.webp")
  .resize({ width: LARGURA_DO_LOGO })
  .png()
  .toBuffer();
const { height: alturaDoLogo } = await sharp(logo).metadata();

const fio = await sharp({
  create: { width: LARGURA, height: FIO, channels: 3, background: OURO },
})
  .png()
  .toBuffer();

await sharp({
  create: { width: LARGURA, height: ALTURA_DA_FAIXA + FIO, channels: 3, background: ESCURO },
})
  .composite([
    {
      input: logo,
      left: Math.round((LARGURA - LARGURA_DO_LOGO) / 2),
      top: Math.round((ALTURA_DA_FAIXA - alturaDoLogo) / 2),
    },
    { input: fio, left: 0, top: ALTURA_DA_FAIXA },
  ])
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toFile("public/marca/email-cabecalho.png");

console.log(`public/marca/email-cabecalho.png — ${LARGURA} × ${ALTURA_DA_FAIXA + FIO}`);
