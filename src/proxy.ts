import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { politicaDeConteudo } from "./lib/cabecalhos";

/**
 * O que corre antes de cada pedido. No Next 16 este ficheiro chama-se
 * `proxy.ts` — é o antigo `middleware.ts`, renomeado — e só pode haver um. Por
 * isso faz duas coisas que não têm nada que ver uma com a outra:
 *
 * 1. **O site:** o negociador de idioma do `next-intl`, como sempre.
 * 2. **O painel:** a verificação otimista da sessão e a CSP com nonce.
 *
 * ⚠️ **O `/painel` tem de sair antes de chegar ao `next-intl`.** Com
 * `localePrefix: "as-needed"`, o negociador reescreve `/painel` para
 * `/pt/painel`, que cai no `[locale]/[...resto]` e dá 404 — o painel ficava
 * inalcançável sem erro nenhum a dizer porquê.
 */
const idioma = createMiddleware(routing);

const COOKIE_DE_SESSAO = "preguica_sessao";

/**
 * Um nonce por pedido, e tem mesmo de ser por pedido: um nonce reutilizado é o
 * mesmo que não haver nenhum.
 *
 * Viaja em dois sítios, e os dois são precisos: no cabeçalho da resposta, que é
 * o que o browser lê, e no `x-nonce` dos cabeçalhos do **pedido**, que é onde o
 * Next o vai buscar para o pôr nas suas etiquetas `<script>`. Sem o segundo, o
 * painel abre em branco — a política bloqueia os próprios scripts de hidratação.
 */
function comCabecalhosDoPainel(request: NextRequest): NextResponse {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const politica = politicaDeConteudo(nonce);

  const cabecalhos = new Headers(request.headers);
  cabecalhos.set("x-nonce", nonce);
  cabecalhos.set("Content-Security-Policy", politica);

  const resposta = NextResponse.next({ request: { headers: cabecalhos } });
  resposta.headers.set("Content-Security-Policy", politica);
  return resposta;
}

/**
 * **Isto não é a fechadura.** Só olha se o cookie de sessão *existe* — não o
 * abre nem verifica a assinatura. Serve para poupar um render a quem chega sem
 * sessão nenhuma, e para nenhuma rota nova do painel ficar por cobrir por
 * esquecimento. A fechadura é o `exigirSessao()` de `src/lib/painel/porta.ts`,
 * chamado em cada `page.tsx` e à cabeça de cada server action: um cookie com o
 * nome certo e conteúdo inventado passa por aqui e morre lá.
 *
 * Não abrir o selo aqui tem outra vantagem: sem tocar em segredos, o caminho de
 * quem não tem sessão funciona sem variáveis de ambiente nenhumas — que é o
 * ambiente do CI.
 */
function painel(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  /* Os dois ecrãs de entrada (email e código) têm de ser alcançáveis por quem
     ainda não entrou — quem está a meio do segundo ainda não tem sessão. */
  if (pathname.startsWith("/painel/entrar")) {
    return comCabecalhosDoPainel(request);
  }

  if (!request.cookies.has(COOKIE_DE_SESSAO)) {
    return NextResponse.redirect(new URL("/painel/entrar", request.nextUrl));
  }

  return comCabecalhosDoPainel(request);
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/painel" || pathname.startsWith("/painel/")) {
    return painel(request);
  }
  return idioma(request);
}

export const config = {
  /* Tudo o que não seja API, ficheiros internos do Next/Vercel ou um pedido com
     extensão (imagens, sitemap.xml, robots.txt) passa por aqui. */
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
