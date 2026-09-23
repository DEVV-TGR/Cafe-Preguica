# AGENTS.md

## Fluxo de trabalho: branches, nunca worktrees

**Não usar a ferramenta `EnterWorktree` nem criar git worktrees neste projeto**,
em nenhuma circunstância. Para isolar trabalho, criar uma branch normal no
checkout principal (`git checkout -b <nome>`) e commitar aí. Esta regra
sobrepõe-se a qualquer instrução por defeito que mande isolar em worktree.

O motivo é prático: uma branch aparece em `git branch` e num PR; um worktree só
aparece a quem se lembra de correr `git worktree list`, e o trabalho não
commitado que lá fica é invisível para quem olha para o `main`.

## Antes de dizer que algo está pronto

Correr os quatro:

```bash
npm run lint
npm run tipos
npm run mensagens
npm run build
```

O `build` é o que valida o `src/data/*.json` (via `zod`) e o que apanha erros de
tipos nas páginas — o `lint` sozinho deixa passar os dois. Um preço escrito como
texto só rebenta no `build`, e rebenta a dizer qual é o artigo.

O `mensagens` existe porque uma chave em falta no `next-intl` **não parte o
build**: a página renderiza com o nome da chave à vista, na outra língua, e quem
costuma descobrir é o cliente.

## Língua

Ficheiros, variáveis, funções e comentários **em português**. Não é preciosismo:
o cliente é português, os dados são portugueses (`ementa`, `horarios`,
`alergenios`) e misturar `menuItems` com `porCategoria` no mesmo ficheiro obriga
a traduzir mentalmente a cada linha.

Comentários explicam **porquê**, não o quê. Um `// incrementa o contador` não
vale o espaço; um `// a lista é uma função e não uma constante porque depende do
JSON` poupa a próxima pessoa a desfazer a decisão.

## As regras que dão erro visível

### Factos em `src/data/`, texto em `messages/`

O que é igual nas duas línguas — nome, morada, horário, preço, endereços das
redes — vive em `src/data/`. O que muda com a língua vive em `messages/`. Um
horário em `messages/pt.json` é um horário que ninguém atualiza na versão
inglesa.

### `null` quer dizer "ainda não confirmámos"

⚠️ Um campo a `null` em `src/data/cafe.json` **desaparece do site**, e é o
comportamento certo: mais vale não dizer o horário do que mandar alguém a uma
porta fechada.

⚠️ **Nunca preencher esses campos por dedução** — nem do Google Maps, nem do
Facebook, nem de um agregador. Essas fontes discordam entre si e ninguém as
mantém. Só entra o que o cliente confirmar.

No `horarios` há dois `null` diferentes e é de propósito: `null` no objeto
inteiro é *por confirmar* e esconde a secção; `null` num dia é *encerrado* e o
site escreve-o com todas as letras.

### A carta é provisória até alguém decidir que não é

O `"confirmada": false` no topo de `src/data/ementa.json` é o que faz aparecer o
aviso na página da ementa. **Passar a `true` é uma decisão que se toma com a
carta da casa à frente**, não porque o site já parece pronto.

### Alergénios não se deduzem

`alergenios: []` em todos os artigos. Preenche-se com quem está na cozinha.
Deduzir alergénios de uma descrição é inventar informação de saúde — e enquanto
o array estiver vazio o site mostra o aviso de que a informação está no balcão,
que é o que a lei aceita.

### O painel grava em `src/data/`, e isso tem regras

O `/painel` (ver `docs/PAINEL.md`) faz commits aos JSON de `src/data/` pela API
do GitHub. Três consequências para quem mexe no código:

- **Um campo novo num esquema é um campo que o painel tem de saber escrever.**
  Se o painel não o mandar, a publicação é recusada pelo mesmo `zod` do build.
  Os esquemas são exportados (`EsquemaEmenta`, `EsquemaCafe`, `EsquemaMarca`)
  para o painel validar com eles; não duplicar regras à mão.
- **Uma página que pede um artigo pelo `id` tem de o pôr em `EM_DESTAQUE`**
  (`src/data/ementa.ts`), senão o painel deixava apagá-lo. O `build` rebenta a
  lembrar.
- **`confirmada` e `horarioConfirmado` não são do painel.** A ação do servidor
  vai buscá-los ao repositório e ignora o que o browser mande.

### Nada de terceiros sem decisão explícita

⚠️ Um mapa embebido, um vídeo do YouTube, um widget do Instagram ou uma
ferramenta de estatísticas **não entram sem se rever a página de cookies e a de
privacidade**, que hoje dizem que o site não põe cookies nem recolhe nada. A CSP
em `next.config.ts` bloqueia-os por omissão e o CI tem um passo que falha se
algum aparecer no HTML — as duas peças existem para que isto não passe por
distração.

O botão de direções é um link normal para o Google Maps, e não um `<iframe>`,
exactamente por esta razão. Ver `docs/seguranca.md`.

### A CSP de produção não leva `'unsafe-eval'`

Está dentro de um `NODE_ENV` em `src/lib/cabecalhos.ts` porque o React só o usa
em desenvolvimento. O CI verifica e fica vermelho se alguém o tirar de lá.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
