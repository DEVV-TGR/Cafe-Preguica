# Segurança

O que o site faz, o que deliberadamente não faz, e o que é verificado
automaticamente. É a página para entregar a quem pedir contas.

## O ponto de partida

Este é um site de montra: **não tem base de dados nem contas para quem o
visita**, e nada do que é renderizado nas páginas vem de fora — vem de
`src/data/`, que são ficheiros versionados no git e validados por `zod` antes
de o build passar.

Há duas exceções, e são as duas fronteiras que importam:

- **O painel da casa** (`/painel`, ver [`PAINEL.md`](PAINEL.md)): quem trabalha
  lá entra com um código enviado por email e muda a carta e o horário. O painel
  escreve nos mesmos ficheiros de `src/data/`, com um commit, e passa pelos
  mesmos esquemas `zod`.
- **A newsletter e a carta secreta** (ver [`NEWSLETTER.md`](NEWSLETTER.md)):
  um formulário público que recebe **um email** — e só um email, validado no
  servidor (`src/lib/email.ts`), com limites por endereço, por ligação e por
  dia. O email nunca volta ao HTML; vai para o Resend.

As páginas públicas continuam estáticas e nenhuma mostra texto escrito por
visitantes. O esforço vai para três sítios: **o que o browser é autorizado a
carregar**, **o que entra no repositório** e **o que os dois formulários
deixam fazer**.

## Cabeçalhos

Definidos em `src/lib/cabecalhos.ts` e aplicados pelo `next.config.ts` a todas
as rotas. A exceção é a CSP do painel, que é outra e vem do `src/proxy.ts` (ver
abaixo).

| Cabeçalho | O que faz |
|---|---|
| `Content-Security-Policy` | Diz ao browser o que pode carregar. Ver abaixo. |
| `X-Frame-Options: DENY` | O site não pode ser posto dentro de um iframe. |
| `X-Content-Type-Options: nosniff` | O browser acredita no `Content-Type` em vez de adivinhar pelo conteúdo — é o que transforma um ficheiro inócuo em script executável. |
| `Referrer-Policy: strict-origin-when-cross-origin` | Um link para fora leva o domínio, nunca o caminho nem a query. |
| `Permissions-Policy` | Câmara, microfone, localização, pagamentos e USB negados à cabeça. O site não usa nenhum. |
| `Strict-Transport-Security` | Dois anos de HTTPS obrigatório. |

O `X-Frame-Options` diz o mesmo que o `frame-ancestors 'none'` da CSP. Está lá
para os browsers que ainda não leem CSP; não são dois controlos, é o mesmo
controlo em duas gerações de browser.

O HSTS está **sem `preload`** de propósito: entrar na lista dos browsers é fácil,
sair demora meses, e o domínio final ainda não está decidido.

## A CSP, com o alcance dito sem exagero

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'
'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src
'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
object-src 'none'; upgrade-insecure-requests
```

**O `'unsafe-inline'` no `script-src` tira à CSP quase toda a proteção contra
XSS.** Não vale a pena fingir o contrário. Está lá porque o Next injeta os
scripts de arranque e o payload de hidratação inline, e apertá-lo a sério exigia
gerar um *nonce* por pedido no `src/proxy.ts` — o que tornava dinâmicas todas as
páginas, que hoje saem do CDN estáticas.

Para este site é a troca certa, e a razão é a da primeira secção: não há
conteúdo de terceiros nem entrada de visitantes a chegar ao HTML. O único
`dangerouslySetInnerHTML` é o JSON-LD em `src/components/DadosEstruturados.tsx`,
alimentado por `cafe.json` e `marca.json` — que **o painel escreve**. Por isso
passa pelo `jsonParaScript()` (`src/lib/json-em-script.ts`), que escapa `<`,
`>` e `&`: um telefone ou um link de rede com `</script>` não fecha a etiqueta.
O esquema do telefone também só aceita os caracteres de um número.

**Se um dia entrar um CMS, comentários ou testemunhos submetidos, esta conta
muda e volta-se a fazê-la.** O painel não a muda: quem lá escreve entrou com um
código, o que escreve passa pelo `zod`, e o React escapa o texto.

### A CSP do painel

O `/painel` é dinâmico de qualquer forma, porque tem sessão, e por isso leva a
CSP que as páginas públicas não podem ter sem perder o CDN: **um nonce por
pedido, `'strict-dynamic'`, e nada de `'unsafe-inline'` nos scripts**. Leva
também `Cache-Control: no-store` e `X-Robots-Tag: noindex`. O `next.config.ts`
não põe a CSP pública no painel: duas CSP na mesma resposta somavam-se e ninguém
percebia porquê.

O que a CSP dá a sério, mesmo com o `'unsafe-inline'`:

- `default-src 'self'` e `connect-src 'self'` — nada é carregado de outro
  domínio e nada sai deste site para terceiros.
- `frame-ancestors 'none'` — ninguém embebe o site para lhe roubar cliques.
- `form-action 'self'` — nenhum formulário pode ser reapontado para outro
  servidor por conteúdo injetado.
- `object-src 'none'` e `base-uri 'self'` — fecham dois vetores clássicos:
  plugins e sequestro de URLs relativos.

O `'unsafe-eval'` existe **só em desenvolvimento**, dentro de um `NODE_ENV` em
`src/lib/cabecalhos.ts`: o React usa `eval` para reconstruir as pilhas de erro do servidor no
overlay do `npm run dev`. Em produção nunca é usado, e o CI fica vermelho se lá
aparecer.

## Zero terceiros — e porque é que isso importa mais do que parece

O site não carrega **nada** de fora:

- As fontes são descarregadas no build pelo `next/font` e servidas por este
  domínio. Um `<link>` para o Google Fonts faria um pedido à Google com o IP de
  cada visitante, a cada visita.
- Não há mapa embebido. O mapa da página inicial é um SVG desenhado a partir
  do OpenStreetMap no momento de o gerar (`npm run mapa`) e servido deste
  domínio. O botão de direções é um `<a>` normal para o Google Maps: o
  terceiro só vê quem carregar nele.
- Não há botões de redes sociais que carreguem código, não há vídeo embebido e
  não há ferramenta de estatísticas.

**A consequência é que o site não põe um único cookie a quem o visita**, e por
isso não tem banner de consentimento — não haveria nada para consentir. É o que a página
`/cookies` diz, e é verificável em dez segundos nas ferramentas de programador.

Isto não se mantém sozinho. Mantém-se com duas peças:

1. A CSP bloqueia no browser um script de terceiros acrescentado por distração.
2. O CI tem um passo que lê o HTML da página e **falha** se encontrar um `src`
   ou um `<link rel="stylesheet|preload|…">` apontado para fora.

⚠️ No dia em que um mapa, um vídeo ou estatísticas entrarem, as páginas
`/cookies` e `/privacidade` deixam de estar corretas. Está anotado em
`docs/decisoes-pendentes.md`.

## Cadeia de dependências

- `npm ci` em vez de `npm install`: instala exactamente o que está no lock e
  falha se o `package.json` e o lock divergirem, em vez de os reconciliar em
  silêncio.
- **Scripts de instalação bloqueados.** Um pacote pode correr código arbitrário
  durante o `npm install`, e é o vetor mais usado contra cadeias de dependências
  de JavaScript. Quem os bloqueia é o `.npmrc` (`ignore-scripts=true`), que todas
  as versões do npm respeitam. O `allowScripts` do `package.json` regista a mesma
  decisão para os três pacotes que o pediriam, mas só é lido a partir do npm 11
  — e o Node 22 do CI traz o npm 10, que o ignorava e corria os três (auditoria
  de 2026-10). O CI confirma que o bloqueio está ligado.
- `npm audit --audit-level=high --omit=dev` no CI, em cada PR: uma
  vulnerabilidade alta numa dependência que chega ao site pára o PR. As das
  ferramentas de desenvolvimento (ESLint, Tailwind, TypeScript) aparecem num
  passo à parte que avisa sem parar — em 2026-10 o `braces`, via
  `eslint-config-next`, ficou sem versão corrigida e punha todos os PRs a
  vermelho.
- Dependabot semanal (`.github/dependabot.yml`). É a peça que faz par com o
  `audit`: sem ela, um audit a zero é a fotografia do dia em que alguém o pôs a
  zero.
- Seis dependências de produção: `next`, `react`, `react-dom`, `next-intl`,
  `zod` e `server-only`. Este último não tem código a correr; serve para o
  build falhar se um módulo com segredos do painel for parar ao browser. Cada
  dependência que não existe é uma que não precisa de ser auditada. O painel
  fala com o GitHub, o Resend e o Upstash por `fetch`, sem SDKs.
- O token do CI corre com `permissions: contents: read`. Nenhum dos passos
  escreve no repositório.

## A entrada do painel, e o que foi apertado na auditoria de 2026-09

- **O ecrã de entrada não diz quem tem acesso.** Um email da lista e um de fora
  seguem os dois para o ecrã do código. O de fora fica com um desafio-isco que
  nenhum código de seis algarismos abre, e o "reenviar" não lhe manda nada.
  Até aqui, o de dentro saltava e o de fora ficava — bastava olhar.
  - O que sobra é o **tempo de resposta**: quem está na lista espera pelo envio
    do email. É uma diferença de centenas de milissegundos, com os limites por
    IP e por dia por cima.
- **A sessão confere o `PAINEL_EMAILS` a cada pedido.** Tirar alguém da lista
  põe-no fora já, e não quando o cookie caducar.
- **20 tentativas de código por email em 24 h**, certas ou erradas, contadas
  antes de comparar. A partir daí esse email deixa de receber códigos e o que
  tiver a meio deixa de ser conferido, até ao dia seguinte. Antes eram até 200
  palpites por dia, todos os dias.
- **O aparelho lembrado entra antes dos limites.** Quem enchesse o ecrã com o
  email do dono trancava-o também a ele.
- **Os limites por IP contam o IPv6 por /64** (`src/lib/rede.ts`): cada ligação
  IPv6 tem 2⁶⁴ endereços, e contar por endereço dava um limite novo a cada
  pedido.
- **As rotas públicas leem o JSON com teto de 4 KB** e só aceitam
  `application/json` (`src/lib/pedido.ts`).

## Dados pessoais

Sobre quem só visita, nenhuns: não há contas, cookies nem estatísticas. O
alojamento (Vercel) regista pedidos ao servidor para o poder servir e
proteger; esses registos são da plataforma e não são usados por nós.

**Quem usa o convite da newsletter ou a carta secreta** deixa um email. Até
confirmar, o endereço não entra na lista: vai dentro do link assinado, fica o
registo do envio na Resend e, no Upstash, um contador com o email em hash (24 h)
e outro com a ligação (1 h). Depois de confirmar, o contacto vive no Resend.
Quando um limite é excedido, o registo da Vercel guarda o IP e o email
mascarado. Está tudo dito em `/privacidade`.

O painel usa os emails da equipa autorizada, e só esses. Servem para enviar o
código (Resend), e no Upstash ficam em hash, com prazo de 30 dias no máximo. Nos
registos da Vercel aparecem mascarados (`m•••a@…`), e nos commits do repositório,
que é público, também: o autor de cada commit do painel é fixo e nunca é o email
de quem gravou. As páginas `/cookies` e `/privacidade` dizem-no numa secção
própria.

⚠️ Isto muda no dia em que houver formulário. Ver `docs/decisoes-pendentes.md`.

## Segredos

O `.gitignore` deixa `.env`, `.env.local` e `.env*.local` de fora do
repositório. O `.env.example` documenta a lista completa de variáveis.

- `NEXT_PUBLIC_SITE_URL` não é segredo: é o domínio público.
- As do painel são segredos e vivem só nas Environment Variables da Vercel,
  marcadas como *Sensitive*: `PAINEL_GITHUB_TOKEN`, `RESEND_API_KEY` e as do
  Upstash.
  - O token do GitHub é *fine-grained*, só neste repositório e só com
    `Contents: Read and write`.
  - O `build` corre sem nenhuma delas.

**Não há neste repositório nenhuma credencial.** Todas as chamadas que usam
segredos são feitas no servidor, e a CSP do browser continua com
`connect-src 'self'`. Se alguém precisar de lá acrescentar `api.github.com`, é
sinal de que um segredo está a passar pelo cliente.

## O que o CI verifica, em cada PR

1. `npm ci` — lock coerente, scripts de instalação bloqueados
2. `lint`
3. `tsc --noEmit`
4. As duas línguas têm as mesmas chaves de tradução
5. `npm audit --audit-level=high --omit=dev` (e o audit inteiro, só como aviso)
6. `build` — e com ele a validação `zod` de `src/data/`
7. O site arranca e as páginas respondem com o código certo, nas duas línguas,
   incluindo o 404 e o 308 da `/sobre`
8. Os seis cabeçalhos de segurança estão na resposta — na inicial, em inglês,
   num 404, no sitemap e numa rota da API
9. A CSP de produção não traz `'unsafe-eval'` em nenhuma delas
10. O painel está fechado:
    - `/painel` sem sessão, ou com um cookie inventado, vai para a entrada;
    - a CSP do painel tem nonce, e nem `'unsafe-inline'` nem `'unsafe-eval'`
      nos scripts;
    - traz `no-store` e `noindex`;
    - nenhuma rota dele é estática;
    - `/painel/versao` com um cookie inventado é 401, e um caminho com ponto
      (`/painel/x.y`) também vai para a entrada;
    - as server actions chamadas à mão, com um cookie inventado, não respondem
      sucesso nem detalhe.
11. O HTML de todas as páginas, nas duas línguas, não carrega nenhum recurso de
    terceiros
12. Nenhuma página pública grava cookies (todas, mais o 404, o sitemap e o
    robots)
13. Os testes unitários de segurança (`npm run testes`, em `testes/`)
14. O build corre com valores sentinela nas variáveis sensíveis, e
    `npm run segredos` procura-os no que vai para o browser — as chaves, os
    endereços do `PAINEL_EMAILS`, o segmento e os remetentes do Resend, os
    endereços das APIs que usam chaves e os nomes da carta secreta
15. Sem `X-Powered-By`; `/painelx` e afins com os cabeçalhos do site
16. As três rotas públicas recusam o que não é JSON (415), corpos acima de
    4 KB (413), GET (405) e emails inválidos (400)
17. Os scripts de instalação estão bloqueados (`ignore-scripts`)
18. O sitemap não anuncia rotas privadas e traz `x-default`; o `robots.txt`
    continua a bloquear o `/painel`

Configuração parte-se sem ninguém dar por isso. Aqui, parte-se com o CI
vermelho.
