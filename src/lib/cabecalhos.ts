/**
 * # Os cabeçalhos de segurança, num sítio só
 *
 * Vivem aqui, e não no `next.config.ts`, porque passaram a ter dois leitores: o
 * `next.config.ts`, que os põe nas páginas do site, e o `src/proxy.ts`, que
 * emite a variante do painel — a única que leva nonce. Ter a lista escrita duas
 * vezes era a forma garantida de uma das duas ficar para trás.
 *
 * Este ficheiro não importa `server-only`, e não é esquecimento: o
 * `next.config.ts` é carregado pelo Next fora do grafo da aplicação, e um
 * `server-only` aqui rebentava o arranque. Também não lê nada de fora além do
 * `NODE_ENV` — não há segredos nenhuns nestas linhas.
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
 * ## Porquê duas políticas e não uma
 *
 * ### As páginas públicas ficam com `'unsafe-inline'`
 *
 * ⚠️ **O `'unsafe-inline'` no `script-src` tira à CSP quase toda a proteção
 * contra XSS**, e é preciso porque o Next injeta os scripts de arranque e o
 * payload de hidratação inline. Não vale a pena fingir o contrário: apertá-lo a
 * sério exigia gerar um *nonce* por pedido, e isso tornava dinâmicas todas as
 * páginas, que hoje saem do CDN. Para um site de montra é trocar a coisa
 * errada: não há texto de visitante a chegar ao HTML. O único
 * `dangerouslySetInnerHTML` é o JSON-LD, alimentado por `src/data/`, que o `zod`
 * valida no build.
 *
 * O painel escreve em `src/data/`, mas não muda esta conta: quem lá escreve
 * entrou com um código de email, o que escreve passa pelo mesmo `zod`, e o React
 * escapa o texto — um nome de cocktail com `<script>` sai como texto.
 *
 * ### O painel leva nonce
 *
 * E leva-o de graça: o `/painel` já é dinâmico — tem sessão em cookie, portanto
 * nunca foi estático — e já passa pelo `proxy.ts` a cada pedido. O custo que
 * torna o nonce má ideia nas páginas públicas não existe lá, e é lá que há uma
 * sessão autenticada do outro lado.
 *
 * Com `'nonce-…'` presente, o `'unsafe-inline'` é **ignorado** pelo browser —
 * daí não vir nessa variante. O `'strict-dynamic'` é o que deixa os scripts com
 * nonce carregar os pedaços que o Next vai buscando à medida que se navega.
 *
 * ## O que estes cabeçalhos dão a sério
 *
 * - `frame-ancestors 'none'` — ninguém põe o site dentro de um iframe para lhe
 *   roubar cliques. Com um painel autenticado, isto vale mais do que valia.
 * - `form-action 'self'` — nenhum formulário pode ser reapontado para outro
 *   servidor por conteúdo injetado.
 * - `connect-src 'self'` — nada sai deste site para terceiros. O painel fala
 *   com o GitHub, o Resend e o Upstash, mas **no servidor**: o browser nunca os
 *   vê. Se alguém alguma vez precisar de acrescentar um destes domínios aqui, é
 *   sinal de que um segredo está a passar pelo cliente. Não acrescentar —
 *   corrigir.
 * - `object-src 'none'` e `base-uri 'self'` — fecham dois vetores clássicos
 *   (plugins e sequestro de URLs relativos).
 *
 * `img-src` precisa de `data:` e `blob:` por causa do otimizador de imagens do
 * Next, e `style-src` de `'unsafe-inline'` por causa dos estilos que o React
 * injeta em atributos `style` — um nonce não os cobre, nem no painel.
 *
 * ## `'unsafe-eval'` só em desenvolvimento
 *
 * Estes cabeçalhos aplicam-se **também ao `npm run dev`**, e aí o cliente RSC do
 * React usa `eval()` para reconstruir as pilhas de chamadas que vêm do servidor
 * — é o que faz um erro num componente de servidor aparecer no overlay com a
 * linha certa. Sem a diretiva, escreve `eval() is not supported in this
 * environment` na consola a cada carregamento. Em produção o React **nunca** usa
 * `eval`, e por isso a diretiva não vai lá parar. O `ws:` é o HMR, pela mesma
 * razão.
 *
 * ⚠️ **Não tirar isto de dentro do `NODE_ENV`.** Um `'unsafe-eval'` constante
 * era uma perda de segurança a sério — é o que transforma uma string injetada em
 * código executável — para calar um aviso que em produção nem existe. O CI
 * verifica que a CSP de produção não o traz, na página inicial e no painel, e
 * fica vermelho se alguém o fizer.
 */
const DESENVOLVIMENTO = process.env.NODE_ENV !== "production";

export function politicaDeConteudo(nonce?: string): string {
  const scripts = nonce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : "'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    `script-src ${scripts}${DESENVOLVIMENTO ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${DESENVOLVIMENTO ? " ws:" : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * Os que não dependem do caminho nem do pedido, e por isso são iguais no site e
 * no painel.
 */
export const cabecalhosComuns = [
  /* O `frame-ancestors 'none'` da CSP já cobre isto nos browsers modernos; este
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
 * Os dois que só o painel precisa.
 *
 * `no-store` porque um painel autenticado não se guarda em lado nenhum: nem no
 * CDN da Vercel, nem no disco do browser, nem no botão "voltar" — que é o caso
 * que se esquece, e o que faria aparecer a carta a meio de editar depois de
 * sair.
 *
 * `X-Robots-Tag` é a terceira camada do "isto não se indexa", ao lado do
 * `src/app/robots.ts` e da metadata do `src/app/painel/layout.tsx`. É a única
 * das três que vale numa resposta que não é HTML.
 */
export const cabecalhosDoPainel = [
  { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];
