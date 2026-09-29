import { getTranslations } from "next-intl/server";
import type { FotoDoVisor, TextosDoVisor } from "@/components/Visor";

/**
 * Os textos do visor (`components/Visor.tsx`), e o começo do nome do botão que
 * o abre — "Ampliar a fotografia", a que cada fotografia junta o que se vê
 * nela. Em `comum.visor` porque o visor é o mesmo na ementa e na inicial.
 */
export async function textosDoVisor(): Promise<{ textos: TextosDoVisor; ampliar: string }> {
  const t = await getTranslations("comum.visor");
  return {
    textos: {
      naFotografia: t("naFotografia"),
      fechar: t("fechar"),
      anterior: t("anterior"),
      seguinte: t("seguinte"),
      /* Os números são trocados no visor, fotografia a fotografia. */
      rotuloDaFoto: t("foto", { n: "{n}", total: "{total}" }),
    },
    ampliar: t("ampliar"),
  };
}

/**
 * Uma fotografia para o visor, a partir do caminho sem extensão e das duas
 * larguras em que existe (`nome-640.webp` e `nome.webp`, pelo `npm run fotos`).
 */
export function fotoDoVisor(
  base: string,
  alt: string,
  legenda: string[] = [],
  pequena = 640,
  grande = 1080,
): FotoDoVisor {
  return {
    src: `${base}.webp`,
    srcSet: `${base}-${pequena}.webp ${pequena}w, ${base}.webp ${grande}w`,
    alt,
    legenda,
  };
}
