import { routing } from "@/i18n/routing";

/**
 * Endereço público do site — fonte única.
 *
 * É preciso em sítios que têm de concordar entre si: o `metadataBase` (que
 * transforma os caminhos relativos das imagens de partilha em absolutos), o
 * `sitemap.ts`, o `robots.ts` e os dados estruturados.
 *
 * ⚠️ O valor por defeito é um subdomínio de demonstração da Vercel, porque **o
 * domínio final ainda não está decidido**. Quando estiver, define-se
 * `NEXT_PUBLIC_SITE_URL` no painel da Vercel e faz-se *redeploy* — sem isso, o
 * `sitemap.xml` anuncia ao Google o endereço da demonstração.
 */
export const URL_SITE = validarUrlSite(
  /* `||` e não `??`: a variável definida mas vazia (o que fica ao importar o
     `.env.example` para a Vercel tal como está) conta como não definida. Com
     `??` a string vazia passava e o `new URL("")` do `metadataBase` partia o
     build em todas as páginas. */
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://cafe-preguica.vercel.app",
);

/** Falha no build com uma mensagem que diz o que corrigir, em vez do
    `TypeError: Invalid URL` sem contexto que o Next mostra a meio do prerender. */
function validarUrlSite(valor: string): string {
  if (!URL.canParse(valor)) {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL inválido: "${valor}". Tem de ser um endereço completo, com https:// (ex.: https://cafepreguica.pt).`,
    );
  }
  return valor.replace(/\/+$/, "");
}

/** Estúdio que desenhou e desenvolveu o site, creditado no rodapé. */
export const URL_ESTUDIO = "https://devplus.pt";

/**
 * As páginas fixas do site, sem prefixo de idioma. Uma página nova entra aqui e
 * aparece sozinha no sitemap, nas duas línguas.
 *
 * **Só entram aqui rotas que existam mesmo.** Anunciar ao Google um caminho que
 * dá 404 custa mais do que uma página que ainda não foi prometida.
 */
export const ROTAS_FIXAS = [
  "/",
  "/ementa",
  "/contactos",
  "/sobre",
  "/privacidade",
  "/cookies",
] as const;

export type RotaFixa = (typeof ROTAS_FIXAS)[number];

/** Todas as rotas públicas. Hoje só as fixas; fica preparado para crescer. */
export function rotasPublicas(): string[] {
  return [...ROTAS_FIXAS];
}

/**
 * O caminho absoluto de uma rota numa língua, já com o prefixo certo.
 *
 * Existe porque a regra do `localePrefix: "as-needed"` — português sem prefixo,
 * inglês com — está em três sítios que têm de concordar (o sitemap, os
 * `alternates` das metadata e o seletor de idioma), e escrevê-la à mão nos três
 * é garantir que um deles fica para trás.
 */
export function caminhoLocalizado(rota: string, locale: string): string {
  const prefixo = locale === routing.defaultLocale ? "" : `/${locale}`;
  return rota === "/" ? prefixo || "/" : `${prefixo}${rota}`;
}

/** O mesmo, mas absoluto — que é o que o sitemap e as metadata precisam. */
export const urlLocalizado = (rota: string, locale: string) =>
  `${URL_SITE}${caminhoLocalizado(rota, locale)}`;
