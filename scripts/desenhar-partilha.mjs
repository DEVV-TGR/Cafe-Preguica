/**
 * A imagem de partilha: o que aparece quando alguém cola o endereço do site no
 * WhatsApp, no Facebook ou numa mensagem.
 *
 *   node scripts/desenhar-partilha.mjs
 *
 * Sai de `public/casa/fachada.webp`, a mesma fachada do herói, recortada a
 * 1200 × 630 (a proporção que as redes mostram sem cortar) e em JPEG, porque
 * há pré-visualizadores que ainda não leem WebP. O `sharp` não copia metadados
 * para a saída, por isso nada da máquina ou do sítio onde a fotografia foi
 * tirada vai junto.
 *
 * Sem ela, o site era partilhado sem imagem nenhuma: não havia `og:image` em
 * página nenhuma. Refazer se a fachada do herói mudar.
 */
import sharp from "sharp";

const ORIGEM = "public/casa/fachada.webp";
const DESTINO = "public/partilha.jpg";

await sharp(ORIGEM)
  .resize({ width: 1200, height: 630, fit: "cover", position: "centre" })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(DESTINO);

console.log(`✓ ${DESTINO}`);
