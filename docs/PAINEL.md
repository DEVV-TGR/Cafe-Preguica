# O painel

Aqui a casa muda a carta e o horário sem depender de nós: **`/painel`**.

- **Carta:**
  - mudar preços (os dois, nas tostas);
  - acrescentar artigos;
  - editar o nome e a descrição em português e inglês;
  - **esconder** um artigo sem o apagar (acabou, é da estação);
  - mudar a ordem dentro de cada categoria;
  - apagar.
- **Casa:** horário de cada dia (e a hora a que a cozinha fecha), telefone, email
  e as quatro redes.
- **Newsletter:** escrever e enviar a quem se inscreveu no site, e ver a lista
  de contactos. Não grava no repositório — fala com o Resend. Ver
  [`NEWSLETTER.md`](NEWSLETTER.md).

É o mesmo desenho do painel da Taskuinha (`DEVV-TGR/Taskuinha`, `docs/PAINEL.md`),
com as diferenças anotadas abaixo.

---

## Como funciona, em três linhas

O painel grava `src/data/ementa.json`, `cafe.json` e `marca.json` **no próprio
repositório**, pela API do GitHub. A Vercel vê o push e reconstrói o site. Não
há base de dados, e o histórico de quem mudou o quê é o `git log`.

O preço disto é o tempo: **1 a 2 minutos** entre carregar em Publicar e a
alteração estar no ar. O painel mostra-o no ecrã, com um contador, e avisa se
passarem cinco minutos sem a alteração aparecer — que é o que acontece se o build
falhar, porque a Vercel mantém no ar a versão anterior.

**O site continua estático.** As páginas públicas continuam a ser geradas no
build a partir dos JSON; só as rotas `/painel/*` são dinâmicas.

### O que o painel não decide

- **As regras.** O que o painel grava passa pelos mesmos esquemas `zod` que o
  build (`EsquemaEmenta`, `EsquemaCafe`, `EsquemaMarca`). Se passa no painel,
  passa no build.
- **Os dois avisos de "por confirmar".** `confirmada` (carta provisória) e
  `horarioConfirmado` **não são editáveis pelo painel**, por decisão: tiram-se
  no código, por nós, quando o cliente disser que está tudo certo. A ação do
  servidor vai buscá-los sempre ao repositório, seja o que for que o browser
  mande.
- **Os artigos com fotografia.** Os que a página inicial e a ementa pedem pelo
  `id` (`EM_DESTAQUE` em `src/data/ementa.ts`) não se podem apagar, só
  esconder. Se uma página passar a pedir um `id` novo e ninguém o puser na
  lista, o `build` rebenta a dizer qual.
- **Os links das redes.** Só são aceites endereços `https` da própria rede
  (`instagram.com`, `facebook.com`, `tiktok.com`, `open.spotify.com`).

### Esconder vs. apagar

Um artigo escondido (`"escondido": true`) sai da `/ementa`, mas fica no ficheiro
com o nome, a tradução e o lugar na lista, e volta com um toque. Nas legendas das
fotografias da página inicial **continua a aparecer**, porque essas pedem-no pelo
`id`. Esconder um cocktail esgotado não deve deixar um buraco no carril.

---

## Como se entra

Não há password. Escreve-se o email, chega um código de 6 algarismos (no
**assunto**, para se ler na notificação), e entra-se. O aparelho fica lembrado
durante 30 dias e deixa de pedir o código; o botão "Esquecer este aparelho", no
fundo do painel, desfaz isso.

**Só entra quem estiver em `PAINEL_EMAILS`.** Um email que lá não esteja não
recebe nada, e o ecrã responde exatamente o mesmo. Se respondesse outra coisa,
o formulário servia para descobrir quem tem acesso.

> **É autenticação de fator único: a caixa de correio é a chave mestra.** O email
> de quem entra tem de ter, ele próprio, verificação em dois passos. É uma
> pergunta de trinta segundos ao cliente.

Endereços individuais, nunca um `geral@`.

### O repositório é público, e isso mudou uma coisa

Na Taskuinha, o autor de cada commit do painel é o email de quem entrou. **Aqui
não:** este repositório é público, e isso publicava no GitHub o endereço pessoal
do cliente, para sempre. Autor e committer são fixos ("Painel do Preguiça"), e
quem gravou fica na mensagem do commit, mascarado:

```
Ementa: 2 preços, 1 escondido, pelo painel (m•••a@gmail.com)
```

---

## Montar: quatro passos

As variáveis vão nas Environment Variables da Vercel, marcadas como *Sensitive*.
**Mudar uma variável não afeta o deploy que já está no ar**, e por isso é preciso
um redeploy depois. A lista comentada está no `.env.example`.

### 1. Upstash (os contadores)

Vercel → Storage → Marketplace → **Upstash Redis**, plano gratuito. A integração
injeta `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` sozinha.

Guarda só o que tem prazo: códigos (10 min), contadores (15 min / 24 h), aparelhos
lembrados (30 dias) e o segredo que assina os cookies. **Sem ele, o painel
recusa-se a abrir em produção.**

### 2. Resend (o email)

A conta e o domínio da agência. O domínio verificado governa o *remetente*, não
o destinatário.

```
RESEND_API_KEY      re_…
RESEND_REMETENTE    Painel do Preguiça <noreply@send.devplus.pt>
```

> O domínio verificado é **`send.devplus.pt`**, e não `devplus.pt`. Um remetente
> em `@devplus.pt` é recusado com 403. Antes de mexer em seja o que for, abrir
> Resend → Domains e copiar à letra o que lá estiver como *Verified*.

### 3. Quem entra

```
PAINEL_EMAILS    email-do-cliente@…,tomas@devplus.pt
```

### 4. O token do GitHub

Um **fine-grained personal access token**:

| Campo | Valor |
|---|---|
| Resource owner | **DEVV-TGR** (com a conta pessoal, o token não vê o repositório e dá 404) |
| Repository access | Only select repositories → **Cafe-Preguica** |
| Permissions | **Contents: Read and write**, e mais nada |

```
PAINEL_GITHUB_TOKEN   github_pat_…
```

> **Caduca ao fim de um ano, no máximo.** O painel diz *"o token expirou ou
> perdeu permissões"* em vez de falhar em silêncio, mas alguém tem de o renovar.
> Vale um lembrete no calendário.

### Recomendado: a regra do firewall

Vercel → Projeto → Firewall → New Rule:

- **If:** `Request Path` starts with `/painel/entrar` **AND** `Request Method`
  equals `POST`
- **Then:** Rate Limit, 5 por 60 s, por IP Address, ação **Challenge**

O filtro `POST` é obrigatório, porque o login é uma server action (um POST para a
própria página). Sem ele, quem só abre o ecrã também gasta o limite.

### Os limites, todos juntos

| Regra | Limite | Janela | Onde |
|---|---|---|---|
| Tentativas por código | 5 | vida do código | Upstash |
| Pedidos de código por email | 3 | 15 min | Upstash |
| Pedidos por IP | 10 | 15 min | Upstash |
| Pedidos por IP, na borda | 5 | 60 s | Vercel Firewall |
| Envios ao todo | 40 | 24 h | Upstash |
| Validade do código | — | 10 min | Upstash |

O teto de 40 por dia protege a quota de 100 envios do plano gratuito do Resend.
Um ataque repartido por muitos IPs passaria por baixo dos outros limites e
gastava essa quota, fechando o painel a quem tem acesso a sério.

---

## Segurança, em resumo

- **Duas CSP.**
  - As páginas públicas mantêm a delas, estática, com `'unsafe-inline'`.
  - O painel leva uma com **nonce** por pedido e sem `'unsafe-inline'` nos
    scripts, emitida pelo `src/proxy.ts`.
  - O painel leva também `Cache-Control: no-store` e `X-Robots-Tag: noindex`.
  - Tudo em `src/lib/cabecalhos.ts`.
- **A fechadura não é o proxy.**
  - O proxy só olha se o cookie existe.
  - A verificação a sério é o `exigirSessao()` (`src/lib/painel/porta.ts`), em
    cada página e à cabeça de cada server action.
- **Os cookies só existem em `/painel`:**
  - `path=/painel`, `httpOnly`, `secure`, `sameSite=lax`;
  - nunca viajam nos pedidos às páginas públicas, e quem só visita o site nunca
    os recebe;
  - as páginas `/cookies` e `/privacidade` dizem-no numa secção própria.
- **O CI verifica sem segredos nenhuns:**
  - que `/painel` sem sessão, ou com um cookie inventado, vai para a entrada;
  - que a CSP do painel tem nonce;
  - que nenhuma rota do painel é estática.

---

## Os dados, e como se repõem

Cada gravação é um commit. Repor é git:

```sh
git log --oneline -- src/data/                  # qual foi o commit
git revert <commit>                             # desfazer inteiro
git checkout <commit>^ -- src/data/ementa.json  # ou só um ficheiro
git push
```

**Expulsar toda a gente:** apagar a chave `painel:segredo` no Upstash. Caem as
sessões, os códigos a meio e os aparelhos lembrados.

---

## Experimentar na própria máquina

Um `.env.local` com:

```
PAINEL_EMAILS=o-teu@email.pt
PAINEL_GITHUB_TOKEN=…            # o teu, ou `gh auth token`
PAINEL_GITHUB_RAMO=painel-ensaio # uma branch que já exista no GitHub
```

- **Sem `RESEND_API_KEY`, e só em desenvolvimento, o código sai no terminal**
  do `npm run dev`. O código continua a ser exigido; muda só por onde sai.
- **Sem Upstash, os contadores ficam na memória do processo**, com um aviso.
- **Com `PAINEL_GITHUB_RAMO`, o painel lê e grava nessa branch** e não no
  `main`. Sem ela, "Publicar" no `npm run dev` punha o preço de teste no site
  verdadeiro. Em produção a variável é ignorada: grava-se sempre no `main`.

---

## Quando alguma coisa corre mal

| O que se vê | O que é |
|---|---|
| O código não chega | Logs no Resend: domínio deixou de estar verificado, limite diário, ou spam |
| *"o domínio do remetente não está verificado"* | `RESEND_REMETENTE` não usa o domínio *Verified*. Ver o passo 2 |
| Escreveu o email e não recebeu nada, sem erro | O email não está em `PAINEL_EMAILS`. É de propósito que o ecrã não o diz |
| *"falta configurar o PAINEL_GITHUB_TOKEN"* | Ver o passo 4, e fazer redeploy |
| *"o token expirou ou perdeu permissões"* | O PAT caducou. Ver o passo 4 |
| *"não encontrou o ficheiro no repositório"* | O token tem a conta pessoal como Resource owner |
| *"Alguém gravou entretanto…"* | Outra pessoa (ou outro separador) publicou primeiro. Recarregar e refazer; nada foi gravado |
| *"Passaram cinco minutos…"* | O build falhou na Vercel. O commit está lá, e o site continua na versão anterior |
| Ninguém entra, e o painel fala em armazenamento | O Upstash caiu ou as variáveis desapareceram. Ver o passo 1 |

---

## O que fica de fora, e porquê

- **Alergénios.** Preenchem-se com quem está na cozinha. Podem entrar no painel
  mais tarde, e o campo já existe em cada artigo.
- **Os avisos de "por confirmar"** (ver acima), a morada, o `aceitaAnimais` e
  a entidade de litígios mudam-se no código.
- **Categorias novas.** Precisam de nome nas mensagens, de capítulo e de ordem.
  Mudam-se no código.
- **Fotografias.** Precisariam de armazenamento de ficheiros.

## Uma coisa a não fazer sem pensar

**Não ativar branch protection na `main`** sem abrir exceção para quem for dono
do token. Sem ela, o `PUT` do painel passa a ser recusado e o painel deixa de
gravar.
