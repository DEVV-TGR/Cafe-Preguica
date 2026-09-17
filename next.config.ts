import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/**
 * # Os cabeçalhos de segurança
 *
 * Sem eles o site ia para o ar a responder sem nenhum: qualquer domínio o podia
 * embeber num `<iframe>` e sobrepor-lhe a sua interface por cima do botão de
 * ligar, e o endereço completo de cada página seguia nos pedidos a terceiros.
 *
 * **A CSP consegue ser tão apertada porque o site não carrega nada de fora.** As
 * fontes são servidas pelo próprio domínio (`next/font` descarrega-as no build),
 * as fotografias vivem em `public/` e não há mapa embebido, script de análise
 * nem widget de redes sociais. Nada disto é acidente — é o que torna verdadeira
 * a página de cookies, que diz que o site não põe nenhum.
 *
 * ⚠️ **O dia em que alguém quiser embeber o mapa do Google.** Um `<iframe>` do
 * Maps exige abrir `frame-src` e `img-src` a domínios da Google, e passa a haver
 * um terceiro a ver quem visita o site — o que arrasta consentimento de cookies
 * atrás, e a página de cookies deixa de poder dizer o que diz. Enquanto o botão
 * de direções for um link normal para o Maps, nada disto é preciso, e é de
 * propósito. Ver `docs/seguranca.md`.
 *
 * ⚠️ **O `'unsafe-inline'` no `script-src` tira à CSP quase toda a proteção
 * contra XSS**, e é preciso porque o Next injeta os scripts de arranque e o
 * payload de hidratação inline. Não vale a pena fingir o contrário: apertá-lo a
 * sério exigia gerar um *nonce* por pedido no `src/proxy.ts` — a peça que faz o
 * encaminhamento PT/EN — e isso tornava dinâmicas todas as páginas, que hoje
 * saem do CDN. Para um site de montra é trocar a coisa errada: não há base de
 * dados, não há utilizadores e não há texto de visitante a chegar ao HTML. O
 * único `dangerouslySetInnerHTML` é o JSON-LD, alimentado por `src/data/`, que
 * o `zod` valida no build.
 *
 * Se um dia entrar conteúdo vindo de fora — um CMS, comentários, testemunhos
 * submetidos — esta conta muda e volta-se a fazê-la.
 *
 * O que estes cabeçalhos dão a sério:
 *
 * - `frame-ancestors 'none'` — ninguém põe o site dentro de um iframe para lhe
 *   roubar cliques.
 * - `form-action 'self'` — nenhum formulário pode ser reapontado para outro
 *   servidor por conteúdo injetado.
 * - `connect-src 'self'` — nada sai deste site para terceiros.
 * - `object-src 'none'` e `base-uri 'self'` — fecham dois vetores clássicos
 *   (plugins e sequestro de URLs relativos).
 *
 * `img-src` precisa de `data:` e `blob:` por causa do otimizador de imagens do
 * Next, e `style-src` de `'unsafe-inline'` por causa dos estilos que o React
 * injeta em atributos `style`.
 *
 * ## `'unsafe-eval'` só em desenvolvimento
 *
 * Estes cabeçalhos aplicam-se **também ao `npm run dev`**, e aí o cliente RSC do
 * React usa `eval()` para reconstruir as pilhas de chamadas que vêm do servidor
 * — é o que faz um erro num componente de servidor aparecer no overlay com a
 * linha certa. Sem a diretiva, escreve `eval() is not supported in this
 * environment` na consola a cada carregamento. Em produção o React **nunca** usa
 * `eval`, e por isso a diretiva não vai lá parar.
 *
 * ⚠️ **Não tirar isto de dentro do `NODE_ENV`.** Um `'unsafe-eval'` constante
 * era uma perda de segurança a sério — é o que transforma uma string injetada em
 * código executável — para calar um aviso que em produção nem existe. O CI
 * verifica que a CSP de produção não o traz, e fica vermelho se alguém o fizer.
 */
const DESENVOLVIMENTO = process.env.NODE_ENV !== "production";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DESENVOLVIMENTO ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const CABECALHOS = [
  { key: "Content-Security-Policy", value: CSP },
  /* O `frame-ancestors 'none'` acima já cobre isto nos browsers modernos; este
     fica para os que ainda não leem CSP. Dizem os dois o mesmo. */
  { key: "X-Frame-Options", value: "DENY" },
  /* Impede o browser de adivinhar o tipo de um ficheiro em vez de acreditar no
     `Content-Type` — é o que transforma um upload inócuo em script executável. */
  { key: "X-Content-Type-Options", value: "nosniff" },
  /* Um link para fora (Maps, Instagram) leva o domínio, nunca o caminho nem a
     query. */
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /* O site não usa nenhuma destas APIs; negá-las à cabeça evita que um script
     futuro (ou injetado) as peça em nome dele. */
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  /* Dois anos de HTTPS obrigatório. A Vercel já serve o site só em HTTPS, mas
     sem este cabeçalho o primeiro pedido de um visitante novo ainda pode sair
     em claro e ser desviado.

     ⚠️ O `preload` é uma decisão sem marcha-atrás rápida: entrar na lista dos
     browsers é fácil, sair demora meses. Só ligar quando o domínio final
     estiver decidido e todos os subdomínios servirem HTTPS. Ver o README. */
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

/**
 * Sem `images.remotePatterns`, e é de propósito: **todas as fotografias vivem em
 * `public/`**. A tentação é apontar às imagens do Instagram e poupar o trabalho
 * de as descarregar — mas essas mudam de URL sem aviso e desaparecem quando um
 * post é apagado, e o site ficava com buracos que ninguém dá por eles. Um
 * domínio a mais aqui é também um domínio a mais na CSP.
 */
const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:caminho*", headers: CABECALHOS }];
  },
};

export default withNextIntl(nextConfig);
