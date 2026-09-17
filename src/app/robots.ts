import type { MetadataRoute } from "next";
import { URL_SITE } from "@/lib/site";

/**
 * ⚠️ **Deixa indexar tudo.** Enquanto o site estiver num domínio de
 * demonstração, é a demonstração que o Google indexa — e depois é preciso pedir
 * a remoção, que demora. Se a primeira publicação for para mostrar ao cliente e
 * não para o público, bloquear aqui e só abrir no dia do lançamento. Ver a lista
 * *Antes de publicar* no README.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${URL_SITE}/sitemap.xml`,
  };
}
