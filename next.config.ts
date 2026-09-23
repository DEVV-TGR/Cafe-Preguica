import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import {
  cabecalhosComuns,
  cabecalhosDoPainel,
  politicaDeConteudo,
} from "./src/lib/cabecalhos";

const withNextIntl = createNextIntlPlugin();

/**
 * # Os cabeçalhos de segurança
 *
 * A lista e o porquê de cada linha vivem em `src/lib/cabecalhos.ts`, porque têm
 * dois leitores: este ficheiro, que os põe nas páginas do site, e o
 * `src/proxy.ts`, que emite a CSP do painel — a única com nonce. Aqui decide-se
 * só **onde** cada uma se aplica.
 *
 * ## Duas entradas que não se sobrepõem
 *
 * A CSP do painel é emitida pelo `proxy.ts`, e por isso o painel **não pode**
 * apanhar também a genérica daqui: duas entradas a declarar a mesma chave para
 * o mesmo caminho dão duas linhas `Content-Security-Policy` na resposta, e uma
 * política em duplicado resolve-se pela intersecção das duas — que é uma forma
 * cara de ninguém perceber, daí a meses, porque é que um script deixou de
 * correr no painel.
 *
 * Daí o `source` com a lookahead, que quer dizer "tudo menos o painel". O CI
 * confirma as duas metades: que a inicial traz a CSP pública sem
 * `'unsafe-eval'`, e que o painel traz a dele, com nonce.
 *
 * ⚠️ O `'unsafe-eval'` de desenvolvimento está dentro de um `NODE_ENV` em
 * `src/lib/cabecalhos.ts`. **Não o tirar de lá.**
 */
const CABECALHOS_DO_SITE = [
  { key: "Content-Security-Policy", value: politicaDeConteudo() },
  ...cabecalhosComuns,
];

const CABECALHOS_DO_PAINEL = [...cabecalhosDoPainel, ...cabecalhosComuns];

/**
 * Sem `images.remotePatterns`, e é de propósito: **todas as fotografias vivem em
 * `public/`**. A tentação é apontar às imagens do Instagram e poupar o trabalho
 * de as descarregar — mas essas mudam de URL sem aviso e desaparecem quando um
 * post é apagado, e o site ficava com buracos que ninguém dá por eles. Um
 * domínio a mais aqui é também um domínio a mais na CSP.
 */
const nextConfig: NextConfig = {
  async headers() {
    return [
      /* Sem CSP: a do painel leva nonce e é o `src/proxy.ts` que a emite. */
      { source: "/painel", headers: CABECALHOS_DO_PAINEL },
      { source: "/painel/:caminho*", headers: CABECALHOS_DO_PAINEL },
      { source: "/((?!painel).*)", headers: CABECALHOS_DO_SITE },
    ];
  },
};

export default withNextIntl(nextConfig);
