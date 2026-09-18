# Segurança

O que o site faz, o que deliberadamente não faz, e o que é verificado
automaticamente. É a página para entregar a quem pedir contas.

## O ponto de partida

Este é um site de montra: **não tem base de dados, não tem contas, não tem
formulários e não recebe texto de ninguém**. Nada do que é renderizado vem de
fora — vem de `src/data/`, que são ficheiros nossos, versionados no git e
validados por `zod` antes de o build passar.

Isso muda a conta toda. A maior parte das vulnerabilidades de um site vive na
fronteira entre o que o visitante escreve e o que o servidor faz com isso. Aqui
essa fronteira não existe, e o esforço vai para as duas que restam: **o que o
browser é autorizado a carregar** e **o que entra no repositório**.

## Cabeçalhos

Definidos em `next.config.ts`, aplicados a todas as rotas.

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
conteúdo de terceiros nem entrada de utilizador a chegar ao HTML. O único
`dangerouslySetInnerHTML` é o JSON-LD em `src/components/DadosEstruturados.tsx`,
alimentado por ficheiros que o `zod` valida no build.

**Se um dia entrar um CMS, comentários ou testemunhos submetidos, esta conta
muda e volta-se a fazê-la.**

O que a CSP dá a sério, mesmo com o `'unsafe-inline'`:

- `default-src 'self'` e `connect-src 'self'` — nada é carregado de outro
  domínio e nada sai deste site para terceiros.
- `frame-ancestors 'none'` — ninguém embebe o site para lhe roubar cliques.
- `form-action 'self'` — nenhum formulário pode ser reapontado para outro
  servidor por conteúdo injetado.
- `object-src 'none'` e `base-uri 'self'` — fecham dois vetores clássicos:
  plugins e sequestro de URLs relativos.

O `'unsafe-eval'` existe **só em desenvolvimento**, dentro de um `if` de
`NODE_ENV`: o React usa `eval` para reconstruir as pilhas de erro do servidor no
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

**A consequência é que o site não põe um único cookie**, e por isso não tem
banner de consentimento — não haveria nada para consentir. É o que a página
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
  de JavaScript. O `allowScripts` no `package.json` mantém os três pacotes que o
  pediriam a `false` — confirmado que o build passa sem eles.
- `npm audit --audit-level=high` no CI, em cada PR.
- Dependabot semanal (`.github/dependabot.yml`). É a peça que faz par com o
  `audit`: sem ela, um audit a zero é a fotografia do dia em que alguém o pôs a
  zero.
- Cinco dependências de produção: `next`, `react`, `react-dom`, `next-intl`,
  `zod`. Cada uma que não existe é uma que não precisa de ser auditada.
- O token do CI corre com `permissions: contents: read`. Nenhum dos passos
  escreve no repositório.

## Dados pessoais

Nenhuns são recolhidos pelo site: não há formulários, contas nem cookies. O
alojamento (Vercel) regista pedidos ao servidor para o poder servir e proteger;
esses registos são da plataforma e não são usados por nós.

⚠️ Isto muda no dia em que houver formulário. Ver `docs/decisoes-pendentes.md`.

## Segredos

O `.gitignore` deixa `.env`, `.env.local` e `.env*.local` de fora do
repositório. O `.env.example` documenta a lista completa de variáveis — hoje é
uma só, `NEXT_PUBLIC_SITE_URL`, que não é segredo nenhum: é o domínio público, e
o prefixo `NEXT_PUBLIC_` significa precisamente que vai para o browser.

**Não há neste repositório nenhuma credencial**, e não deve passar a haver sem
que a caixa onde ela é guardada seja discutida primeiro.

## O que o CI verifica, em cada PR

1. `npm ci` — lock coerente, scripts de instalação bloqueados
2. `lint`
3. `tsc --noEmit`
4. As duas línguas têm as mesmas chaves de tradução
5. `npm audit --audit-level=high`
6. `build` — e com ele a validação `zod` de `src/data/`
7. O site arranca e as 12 rotas respondem com o código certo
8. Os seis cabeçalhos de segurança estão na resposta
9. A CSP de produção não traz `'unsafe-eval'`
10. O HTML não carrega nenhum recurso de terceiros

Configuração parte-se sem ninguém dar por isso. Aqui, parte-se com o CI
vermelho.
