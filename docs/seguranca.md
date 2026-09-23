# Segurança

O que o site faz, o que deliberadamente não faz, e o que é verificado
automaticamente. É a página para entregar a quem pedir contas.

## O ponto de partida

Este é um site de montra: **não tem base de dados, e para quem o visita não tem
contas, não tem formulários e não recebe texto de ninguém**. Nada do que é
renderizado vem de fora — vem de `src/data/`, que são ficheiros versionados no
git e validados por `zod` antes de o build passar.

A única exceção é o **painel da casa** (`/painel`, ver [`PAINEL.md`](PAINEL.md)):
quem trabalha lá entra com um código enviado por email e muda a carta e o
horário. O painel escreve nos mesmos ficheiros de `src/data/`, com um commit, e
passa pelos mesmos esquemas `zod`. O site público continua estático e continua
sem receber texto de visitantes.

Isso muda a conta toda. A maior parte das vulnerabilidades de um site vive na
fronteira entre o que o visitante escreve e o que o servidor faz com isso. Aqui
essa fronteira não existe, e o esforço vai para as duas que restam: **o que o
browser é autorizado a carregar** e **o que entra no repositório**.

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
conteúdo de terceiros nem entrada de utilizador a chegar ao HTML. O único
`dangerouslySetInnerHTML` é o JSON-LD em `src/components/DadosEstruturados.tsx`,
alimentado por ficheiros que o `zod` valida no build.

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
  de JavaScript. O `allowScripts` no `package.json` mantém os três pacotes que o
  pediriam a `false` — confirmado que o build passa sem eles.
- `npm audit --audit-level=high` no CI, em cada PR.
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

## Dados pessoais

Nenhuns são recolhidos sobre quem visita o site: não há formulários, contas nem
cookies. O alojamento (Vercel) regista pedidos ao servidor para o poder servir e
proteger; esses registos são da plataforma e não são usados por nós.

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
5. `npm audit --audit-level=high`
6. `build` — e com ele a validação `zod` de `src/data/`
7. O site arranca e as 13 rotas respondem com o código certo
8. Os seis cabeçalhos de segurança estão na resposta
9. A CSP de produção não traz `'unsafe-eval'`
10. O painel está fechado:
    - `/painel` sem sessão, ou com um cookie inventado, vai para a entrada;
    - a CSP do painel tem nonce, e nem `'unsafe-inline'` nem `'unsafe-eval'`
      nos scripts;
    - traz `no-store` e `noindex`;
    - nenhuma rota dele é estática.
11. O HTML não carrega nenhum recurso de terceiros
12. Nenhuma página pública grava cookies

Configuração parte-se sem ninguém dar por isso. Aqui, parte-se com o CI
vermelho.
