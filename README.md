# Café Preguiça

Next.js 16 · React 19 · TypeScript · Tailwind v4 · next-intl (PT/EN)

Site do **Café Preguiça — Cocktails & Snacks**, em Ermesinde. A página inicial é
um catálogo que se percorre, com rolagem horizontal e um movimento de assinatura
próprio; as restantes são páginas de leitura, calmas e rápidas.

```bash
npm ci
npm run dev      # http://localhost:3000
```

## ⚠️ Antes de publicar

**O que falta são dados e ficheiros que só o cliente tem.** Por ordem de
gravidade:

- [x] **Confirmar os preços da carta.** Conferidos com o menu impresso
      atualizado da casa em 2026-09-24 (commit `9e202ad`), e `"confirmada": true`
      desde então. São 128 artigos em `src/data/ementa.json` (123 à vista). Daqui
      em diante a casa muda-os no painel; se a carta voltar a ser transcrita de
      outra fonte, volta a `false` até alguém a conferir ao balcão.
- [ ] **Os QR das mesas.** Apontam para `https://<domínio>/ementa`, **sem
      `/pt`**: com `localePrefix: "as-needed"` o português não leva prefixo. A
      carta abre sempre em português (a deteção da língua do telemóvel está
      desligada, ver `src/i18n/routing.ts`), com o botão "English" na barra.
      ⚠️ Só se imprimem
      depois de o domínio definitivo estar a servir HTTPS — hoje
      `cafepreguica.pt` está parqueado e com o certificado partido, e um QR
      impresso em vinte mesas não se corrige com um commit.
- [ ] **Alergénios.** `alergenios: []` nos 128 artigos. Preencher com quem está
      na cozinha, **sem deduzir das descrições**. Até lá o site mostra o aviso de
      que a informação está no balcão, que é o que o Regulamento (UE) 1169/2011
      aceita.
- [x] **Confirmar o horário.** Dado pela casa na reunião de 2026-09-23: 16:00–00:30
      de segunda a quinta, 16:00–01:30 à sexta e ao sábado, domingo encerrado, e a
      cozinha fecha meia hora antes. `horarioConfirmado: true`.
- [ ] **Confirmar que a casa está aberta.** Um agregador marca-a como
      *temporariamente encerrada*. Pode ser dado velho, mas convém perguntar.
- [ ] **Identificar o resto da sessão do Rafael.** Os Mules, os hurricane, os
      copos balão e os que não estão na carta (Pornstar Martini, Whiskey Sour)
      ficaram de fora da ementa por não se saber ao certo o que são. A lista está
      em `fotos/Fotografias/IDENTIFICACAO.md`; com a confirmação do Rafael,
      entram em `NOMES_SESSAO` e em `FOTOS_ARTIGO`.
- [ ] **Logótipo em vetor.** O de `public/marca/` foi recortado de um JPEG por
      luminância. Funciona, mas um SVG dava contornos limpos em qualquer tamanho
      — e a preguiça é o elemento que mais cresce na página.
- [x] **Redes sociais.** Instagram, Facebook, TikTok e Spotify em
      `src/data/marca.json`, e no `sameAs` dos dados estruturados. Mudam-se no
      painel.
- [ ] **O domínio.** Ver `docs/decisoes-pendentes.md` — `cafepreguica.pt` já
      existe, está parqueado, e o HTTPS está partido.
- [ ] **Rever a indexação.** O `robots.txt` deixa indexar tudo menos o painel
      e a API — incluindo a demonstração em `cafe-preguica.vercel.app`.
- [ ] **A política de privacidade.** Está marcada como rascunho à vista de quem
      a lê, e faltam dados que só o cliente tem: quem é o responsável pelo
      tratamento (nome e NIF), a data da versão, e a base das transferências para
      os EUA (Resend, Upstash, Vercel). Ver `docs/AUDITORIA-PUBLICACAO.md`.

## Como está organizado

| Onde | O quê |
|---|---|
| `src/data/` | Os factos: a casa, a carta, a marca. JSON validado por `zod` no build. |
| `messages/` | O texto, PT e EN. Tudo o que muda com a língua vive aqui. |
| `src/app/[locale]/page.tsx` | A página inicial — o catálogo. Sete objectos. |
| `src/components/catalogo/` | O que só a inicial usa: o motor, a preguiça, os rótulos, os sabores. |
| `src/components/` | Cabeçalho, rodapé, marca, dados estruturados, invólucro das páginas de leitura. |
| `public/scrollcraft/` | O motor de rolagem, **de terceiros e nunca editado**. |
| `scrollcraft/` | O `BRIEF.md` da página inicial e o registo de originalidade. |
| `src/app/painel/`, `src/lib/painel/` | O painel da casa. Ver `docs/PAINEL.md`. |
| `docs/` | As decisões e o porquê delas. |

A separação que interessa é **factos em `src/data/`, texto em `messages/`**.
Misturá-las é o erro que se paga meses depois, quando alguém traduz o site e
descobre metade do texto num ficheiro que não tem idioma.

## A página inicial

O raciocínio inteiro — a entrevista, a gramática escolhida, o movimento de
assinatura e o que mudou durante a construção — está em
[`scrollcraft/builds/preguica-inicio/BRIEF.md`](scrollcraft/builds/preguica-inicio/BRIEF.md).

Duas coisas que convém saber antes de lhe mexer:

- **O motor não arranca sozinho.** Quem o monta é
  `src/components/catalogo/Motor.tsx`. Sem essa chamada a página carrega inteira
  e correcta e **nada se mexe**, sem erro nenhum na consola.
- **O carril tem de ser mais largo que o ecrã.** O motor viaja exactamente o
  excesso, por isso um carril estreito viaja zero e transforma três alturas de
  rolagem numa imagem parada. É por isso que o cabeçalho e a nota de fecho são
  itens do carril. Medir assim, com o site a correr:

```js
// na consola do browser, com a página inicial aberta
const c = document.querySelector(".pg-carril");
c.scrollWidth - innerWidth;   // tem de ser um número positivo folgado
```

Meio ecrã de excesso é o mínimo saudável. Hoje sobra mais de 1400 px em todas as
larguras testadas — e isto **não é apanhado por nenhum teste automático**, porque
um carril parado parece uma fotografia e não um erro.

## Mudar a carta

**A casa muda-a no painel, em `/painel`** — preços, artigos, textos, esconder o
que acabou, a ordem, e também o horário, os contactos e as redes. O painel não
tem base de dados: grava `src/data/*.json` no repositório com um commit, e a
Vercel reconstrói o site em 1 a 2 minutos. Como se monta e o que pode e não pode
mudar está em [`docs/PAINEL.md`](docs/PAINEL.md).

À mão continua a ser editar `src/data/ementa.json` e mais nada. O `zod`
valida-o no `npm run build` — e o painel valida com o mesmo esquema antes de
gravar. Um
erro rebenta a compilação a dizer **qual é o artigo**:

```
ementa.json inválido:
  ✖ [3] "Galão" → preco: no máximo duas casas decimais
  ✖ [9] "Tosta mista" → preco: Invalid input: expected number, received string
```

## Reprocessar as imagens

O material em bruto vive em `fotos/`, **fora do git**:

| Pasta | O que tem |
|---|---|
| `fotos/site/` | As fotografias que o cliente mandou para um sítio certo (a fachada do herói, horizontal e vertical, a sala e o carrossel de "A casa"). O nome do ficheiro é o nome com que sai. Em `originais/`, a versão de antes de um retoque (a palavra-passe do Wi-Fi tapada). |
| `fotos/instagram/` | Derivadas do Instagram, a 1080 px. Os nomes estão em `scripts/importar-fotos.mjs`. |
| `fotos/instagram/nao-usadas/` | As que o site deixou de usar. O script não entra lá. |
| `fotos/Fotografias/` | A sessão fotográfica do Rafael, originais da máquina. Só sai o que está em `NOMES_SESSAO`; o resto espera confirmação (ver `IDENTIFICACAO.md` na pasta). |
| `fotos/reels/` | As capas dos reels. |
| `fotos/ementa/` | O PDF da carta e as duas páginas extraídas dele. |
| `fotos/marca/` | Os logótipos originais e a preguiça deitada. |
| `fotos/osm/` | O recorte do OpenStreetMap para o `npm run mapa`. |

```bash
npm run fotos     # fotos/site/ e fotos/instagram/ → public/casa/, fotos/reels/ → public/reels/
node scripts/desenhar-partilha.mjs   # a imagem de partilha (og:image), a partir da fachada
```

O `npm run fotos` gera também três ficheiros que hoje nenhuma página pede
(`sala-madeira-1080.webp`, `cocktail-amarelo.webp` e `cocktail-coco.webp`, em
`public/casa/`). Ficam: apagá-los à mão não dura até à próxima corrida.

## Antes de dizer que algo está pronto

```bash
npm run lint
npm run tipos
npm run mensagens   # as duas línguas têm as mesmas chaves
npm run build       # é aqui que o zod valida src/data/
```

O CI corre isto tudo em cada PR, mais o `npm audit`, o arranque do site, as
rotas e os cabeçalhos de segurança. Ver `.github/workflows/ci.yml`.

## Segurança

O resumo está em `docs/seguranca.md`, e a auditoria de publicação em
`docs/AUDITORIA-PUBLICACAO.md`. Em poucas linhas: cabeçalhos completos e
verificados pelo CI, CSP que não deixa carregar nada de fora — **incluindo o
motor de rolagem, que é servido por nós** — nenhum script de terceiros, nenhum
cookie a quem visita, e um só dado de visitantes (o email de quem se inscreve na
newsletter, com duplo opt-in). Um painel com login por código e CSP com nonce,
que fora do site oficial nunca grava no `main`. Scripts de instalação de
pacotes bloqueados pelo `.npmrc`, e `npm audit` das dependências de produção a
zero, mantido pelo Dependabot.
