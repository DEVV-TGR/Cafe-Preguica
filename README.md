# Café Preguiça

Next.js 16 · React 19 · TypeScript · Tailwind v4 · next-intl (PT/EN)

**Este repositório é a base do site, não o site.** A estrutura, a camada de
dados, os cabeçalhos de segurança e o CI estão de pé e verificados; o conteúdo
real e o desenho entram por cima. As páginas de hoje são HTML semântico sem
estética, de propósito — para se discutir o que o site diz antes de se discutir
como se parece.

```bash
npm ci
npm run dev      # http://localhost:3000
```

## ⚠️ Antes de publicar

**O que falta são dados que só o cliente tem.** Por ordem de gravidade:

- [ ] **Morada, telefone e horário.** Estão a `null` em `src/data/cafe.json` e
      por isso não aparecem no site — a página de contactos diz que estão por
      confirmar em vez de os inventar. **Não preencher por dedução**, nem a
      partir do Google Maps nem do Facebook: um número errado manda alguém
      ligar a um estranho e um horário errado manda alguém a uma porta fechada.
- [ ] **A carta.** Os 17 artigos de `src/data/ementa.json` são de demonstração
      e os preços são inventados. É por isso que o ficheiro tem
      `"confirmada": false` e a página mostra o aviso. **Passar a `true` faz-se
      com a carta da casa à frente**, não por o site já parecer pronto.
- [ ] **Alergénios.** `alergenios: []` em todos os artigos. Preencher com quem
      está na cozinha — **não deduzir das descrições**. Até lá o site mostra o
      aviso de que a informação está no balcão, que é o que o Regulamento (UE)
      1169/2011 aceita.
- [ ] **Texto da página "A casa".** Uma frase de andaime em `messages/pt.json`
      e `messages/en.json`. Escreve-se depois da conversa com o cliente.
- [ ] **Fotografias.** Não há nenhuma. Entram em `public/` — nunca apontadas ao
      Instagram, ver o comentário em `next.config.ts`.
- [ ] **Logótipo.** `src/components/Marca.tsx` escreve o nome em texto. Quando
      houver logótipo, de preferência em vetor, troca-se lá e muda em todo o
      lado.
- [ ] **Tipografia e cores.** Os tokens em `src/app/globals.css` são cinzentos
      neutros e a fonte é provisória. São a ausência de identidade, não uma
      proposta.
- [ ] **`NEXT_PUBLIC_SITE_URL`** no painel da Vercel, e *redeploy*. Sem ela o
      `sitemap.xml`, o `robots.txt` e as imagens de partilha saem com o
      subdomínio de demonstração.
- [ ] **Rever a indexação.** O `robots.txt` deixa indexar tudo. Se a primeira
      publicação for para mostrar ao cliente e não para o público, bloquear em
      `src/app/robots.ts` e só abrir no dia do lançamento — tirar do Google
      depois demora.
- [ ] **HSTS `preload`.** O cabeçalho está sem `preload` de propósito: entrar na
      lista dos browsers é fácil, sair demora meses. Ligar só com o domínio
      final decidido e todos os subdomínios em HTTPS.
- [ ] **Decidir o formulário.** Ver `docs/decisoes-pendentes.md`.

## Como está organizado

| Onde | O quê |
|---|---|
| `src/data/` | Os factos: a casa, a carta, a marca. JSON validado por `zod` no build. |
| `messages/` | O texto, PT e EN. Tudo o que muda com a língua vive aqui. |
| `src/app/[locale]/` | As páginas. Não sabem nada sobre os dados — pedem e desenham. |
| `src/lib/` | As regras que têm de concordar entre si: domínio, rotas, metadata, preços. |
| `src/components/` | Cabeçalho, rodapé, marca, dados estruturados. |
| `docs/` | As decisões e o porquê delas. |

A separação que interessa é **factos em `src/data/`, texto em `messages/`**.
Misturá-las é o erro que se paga meses depois, quando alguém traduz o site e
descobre metade do texto num ficheiro que não tem idioma.

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

O resumo está em `docs/seguranca.md`. Em três linhas: cabeçalhos de segurança
completos e verificados pelo CI, CSP que não deixa carregar nada de fora,
nenhum serviço de terceiros, nenhum cookie, nenhum dado de visitante recolhido,
scripts de instalação de pacotes bloqueados e `npm audit` a zero mantido pelo
Dependabot.
