import { z } from "zod";
import { erroDeFicheiro } from "./erros";
import dados from "./reels.json";

/**
 * Os seis reels da casa, pela ordem em que o Instagram os mostra — o mais
 * recente primeiro.
 *
 * ## O `codigo` é a chave de tudo
 *
 * É o código do vídeo no Instagram: `instagram.com/reel/<codigo>/`. **É também o
 * nome do ficheiro da capa** em `public/reels/`, e é isso que emparelha a
 * imagem com o vídeo.
 *
 * ⚠️ **Não emparelhar por ordem.** Os códigos foram calculados a partir do `pk`
 * de cada media do Instagram e a capa foi descarregada do mesmo nó, de propósito:
 * emparelhar pela ordem dos ficheiros dava capas trocadas, e uma capa trocada
 * **não se vê** — só se descobre quando alguém carrega e abre outro vídeo.
 *
 * Renomear um ficheiro em `public/reels/` parte a ligação em silêncio. O
 * `npm run fotos` escreve-os com o nome certo; não se lhes mexe à mão.
 *
 * ## Porque é que não há aqui legendas
 *
 * A `chave` aponta para `inicio.reels.legendas.<chave>` nas mensagens, e o que
 * lá está **descreve o que se vê na capa** — não é a legenda que a casa escreveu
 * no Instagram. Copiar a legenda de lá era pô-la a envelhecer em dois sítios, e
 * as que eles escrevem são para o feed, não para um site.
 *
 * ## O que acontece quando um reel é apagado
 *
 * O link passa a dar 404 no Instagram. **A capa continua a aparecer**, porque
 * vive em `public/`. Não há forma de o site saber; se um dia isso interessar, a
 * verificação é correr os seis endereços e ver quais deixaram de responder 200.
 */
const Esquema = z.array(
  z.object({
    /* O alfabeto dos códigos do Instagram é base64 com `-` e `_`. Um espaço ou
       uma barra aqui é um ficheiro que não existe e um link partido. */
    codigo: z.string().regex(/^[A-Za-z0-9_-]{8,16}$/, "código de reel inválido"),
    chave: z.string().regex(/^[a-z-]+$/, "só minúsculas e hífenes"),
  }),
).length(6, "são seis celas; mudar isto é mudar também a grelha em catalogo.css");

export type Reel = z.infer<typeof Esquema>[number];

const validado = Esquema.safeParse(dados);
if (!validado.success) {
  throw erroDeFicheiro("reels.json", validado.error, dados);
}

export const reels: Reel[] = validado.data;

/** O endereço do vídeo no Instagram. */
export const urlDoReel = (codigo: string) =>
  `https://www.instagram.com/reel/${codigo}/`;
