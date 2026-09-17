import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * O negociador de idioma. No Next 16 este ficheiro chama-se `proxy.ts` — é o
 * antigo `middleware.ts`, renomeado.
 */
export default createMiddleware(routing);

export const config = {
  /* Tudo o que não seja API, ficheiros internos do Next/Vercel ou um pedido com
     extensão (imagens, sitemap.xml, robots.txt) passa pelo negociador. */
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
