# Fingerprints

Every site you build with **scroll-craft** gets one row here, appended after it
ships. The registry exists so your next build can prove it is a different page
rather than a re-skin of one you already made.

This file is **yours**. It starts empty on purpose: the gate is about not
repeating *yourself*, so it has nothing to say until you have built something.

The rules and the gate live in the skill's
`references/uniqueness.md`. Short version:

**A new build must differ from EVERY row below on at least 4 of the 6
dimensions.** Four against each row individually, not four on average across the
table. If a planned build fails, change the plan. Never edit a row to make room
for it.

The six dimensions are: **grammar**, **nav treatment**, **hero device**,
**act-sequence shape**, **close pattern**, **signature move**.

Dimension 6 is free, because a signature move is unique by definition. So the
gate really asks for three more out of the remaining five, and a build that
changes only grammar and world will fail it.

---

## The registry

| Build | Grammar | Nav treatment | Hero device | Act-sequence shape | Close pattern | Signature move | World | Port |
|---|---|---|---|---|---|---|---|---|

| preguica-inicio | Catálogo de objectos | Índice de objectos que salta, mais a acção única (telefone); sem fólio | Objecto um já em vista e já rotulado, sem tratamento de título separado | 7 objectos / ~9,5 alturas de ecrã, um só acto pinado (o carril) | Placa de pedido tipografada exactamente como um rótulo, seguida do rodapé legal | **O atraso**: a preguiça do logótipo solta-se do "P" e desce pendurada num fio, sempre atrás da rolagem — rola-se depressa e ela fica para trás, pára-se e ela chega | Fotografia real da casa (19 do Instagram, 1080 px), zero geração | Next.js 16 + next-intl, motor servido de `public/` |
*(empty: your first build has nothing to clear, so build whatever the interview
points at. From the second onwards, this table is the constraint.)*

---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

Nothing is taken yet.

---

## Appending a row

After shipping, add one line to the table and one bullet to **What is taken** if
the build claimed something new. Fill every column. Say what the build shares
with existing rows.

Rows are append-only. A build that has been superseded stays in the table,
because the space it occupies is still occupied.

---

## Worked example

The skill's author kept a registry of twelve builds across eight page grammars.
If you want to see what a filled-in table looks like, and which shapes tend to
collide, read `EXAMPLES.md` in the scroll-craft repository. Treat it as
illustration only: those rows are somebody else's builds and they do **not**
constrain yours.


## O que esta build toma

- **Gramática:** catálogo de objectos, com `pan` como espinha e não como um acto.
- **Rótulo de três campos — nome, facto, dado — igual em todos os objectos, sem
  excepção.** Uma próxima build que queira colecção tem de inventar outro
  esquema, ou deixa de se distinguir desta.
- **Movimento de assinatura:** o atraso. Um elemento da marca que **persegue a
  rolagem sem a apanhar**, com o fio a esticar na proporção do que falta. O
  `lerp` sozinho não fica tomado; **o atraso como significado da marca** fica.
- **Fecho em placa de pedido**, tipografada com o mesmo esquema dos rótulos.
- **Banda de comprimento:** 7 objectos a ~9,5 alturas de ecrã, com um só acto
  pinado. É metade do Damira e fica confortavelmente dentro do tecto de 14.
- **Paleta medida em vez de escolhida**: o ouro tirado do logótipo, a madeira e
  o escuro tirados da média das fotografias da casa.

### Contra o Damira

O registo deste projecto nasceu vazio, portanto a barreira das 4 de 6 dimensões
passaria sem esforço — o que seria fazer batota com o espírito da regra. A
comparação que interessa é contra a build anterior do mesmo estúdio, e foi feita
à mão contra a linha `damira-inicio` do registo desse repositório:

| Dimensão | damira-inicio | preguica-inicio | Difere |
|---|---|---|---|
| Gramática | editorial em capítulos | catálogo de objectos | ✓ |
| Navegação | fólio na margem, desenhado pelo vapor | índice de objectos que salta | ✓ |
| Herói | folha de rosto tipográfica | objecto um já rotulado, sem título separado | ✓ |
| Actos | 10 capítulos, 19 alturas | 7 objectos, ~9,5 alturas | ✓ |
| Fecho | colofão em tinta | placa de pedido como rótulo | ✓ |
| Assinatura | o vapor a mudar de papel | o atraso da preguiça | ✓ |

**Seis de seis**, quando se exigem quatro.
