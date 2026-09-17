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

- [ ] **Confirmar os preços da carta.** Os 125 artigos de `src/data/ementa.json`
      foram transcritos do PDF do menu digital, que **não tem data**. Uma carta
      de bar muda mais do que uma de pastelaria. Enquanto
      `"confirmada": false`, a página da ementa mostra o aviso — e é isso que se
      quer até alguém conferir ao balcão.
- [ ] **Alergénios.** `alergenios: []` nos 125 artigos. Preencher com quem está
      na cozinha, **sem deduzir das descrições**. Até lá o site mostra o aviso de
      que a informação está no balcão, que é o que o Regulamento (UE) 1169/2011
      aceita.
- [ ] **Confirmar o horário.** Está no site mas com `horarioConfirmado: false`,
      e por isso a página escreve que é preciso ligar antes de vir. **Três fontes
      públicas dão três horas de abertura diferentes** — 15h00, 15h30 e 16h00. O
      que está é o mais reportado. Uma resposta do cliente resolve e faz o aviso
      desaparecer sozinho.
- [ ] **Confirmar que a casa está aberta.** Um agregador marca-a como
      *temporariamente encerrada*. Pode ser dado velho, mas convém perguntar.
- [ ] **Fotografias originais.** As 38 imagens de `public/casa/` saíram das 19
      fotografias do Instagram da casa, **a 1080 px de largura**, que é o tecto do
      que o Instagram serve. Chegam para os cartões do carril; não chegam para um
      herói de ecrã inteiro. Os ficheiros da máquina de quem as tirou valem muito
      mais, e permitem fotografias maiores na página.
- [ ] **Código postal.** Está a `null` em `src/data/cafe.json` e por isso não
      aparece nem entra nos dados estruturados.
- [ ] **Logótipo em vetor.** O de `public/marca/` foi recortado de um JPEG por
      luminância. Funciona, mas um SVG dava contornos limpos em qualquer tamanho
      — e a preguiça é o elemento que mais cresce na página.
- [ ] **Redes sociais.** `instagram` e `facebook` estão a `null` em
      `src/data/marca.json`, por isso não aparecem no rodapé nem no `sameAs` dos
      dados estruturados. O Instagram é `@cafepreguica`; falta confirmar o
      Facebook.
- [ ] **O domínio.** Ver `docs/decisoes-pendentes.md` — `cafepreguica.pt` já
      existe, está parqueado, e o HTTPS está partido.
- [ ] **Rever a indexação.** O `robots.txt` deixa indexar tudo.

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

Editar `src/data/ementa.json` e mais nada. Não há base de dados nem área de
administração: para uma carta que muda duas ou três vezes por ano, um ficheiro
versionado ganha a um CMS — histórico no git, sem palavra-passe para esquecer,
sem custo mensal, e sem mais um serviço com sessão iniciada a poder ser
comprometido.

O ficheiro é editado à mão, por isso o `zod` valida-o no `npm run build`. Um
erro rebenta a compilação a dizer **qual é o artigo**:

```
ementa.json inválido:
  ✖ [3] "Galão" → preco: no máximo duas casas decimais
  ✖ [9] "Tosta mista" → preco: Invalid input: expected number, received string
```

## Reprocessar as imagens

O material em bruto vive em `fotos/`, **fora do git**.

```bash
npm run fotos     # fotos/instagram/ → public/casa/, WebP a 640 e 1080
```

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

O resumo está em `docs/seguranca.md`. Em três linhas: cabeçalhos completos e
verificados pelo CI, CSP que não deixa carregar nada de fora — **incluindo o
motor de rolagem, que é servido por nós** — nenhum serviço de terceiros, nenhum
cookie, nenhum dado de visitante recolhido, scripts de instalação de pacotes
bloqueados e `npm audit` a zero mantido pelo Dependabot.
