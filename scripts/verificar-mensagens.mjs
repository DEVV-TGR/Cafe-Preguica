/**
 * Duas verificações sobre as traduções, e a segunda existe por causa de um erro
 * a sério que a primeira deixou passar.
 *
 * ## 1. As duas línguas têm as mesmas chaves
 *
 * Uma chave em falta no `next-intl` **não parte o build**: em produção a página
 * renderiza com o nome da chave à vista — `ementa.categorias.tostas-e-snacks` no
 * meio da carta — e só se descobre quando alguém abre o site na outra língua,
 * que costuma ser o cliente.
 *
 * ## 2. Os dados têm tradução
 *
 * ⚠️ **A verificação 1 não chega, e isto não é teoria.** Quando as categorias da
 * ementa mudaram de um café de pequenos-almoços para um bar de cocktails, os
 * ficheiros de mensagens ficaram para trás — e o teste passou, porque as chaves
 * antigas estavam igualmente presentes nas duas línguas. **Ambas estavam
 * igualmente erradas.** A carta foi para o ar a escrever
 * `ementa.categorias.tostas-e-snacks` por cima da secção.
 *
 * Por isso a segunda verificação não compara as línguas uma com a outra:
 * compara-as com os **dados**. Cada categoria que existe em `ementa.json` tem de
 * ter nome nas duas línguas, e cada sabor declarado em `ementa.ts` também.
 */
import { readFileSync } from "node:fs";

const linguas = ["pt", "en"];
const msgs = Object.fromEntries(
  linguas.map((l) => [l, JSON.parse(readFileSync(`messages/${l}.json`, "utf8"))]),
);

const problemas = [];

/* ---------------------------------------------------------- 1. paridade -- */

/** Achata o objeto em `a.b.c`, para comparar folhas e não ramos. */
function chaves(objeto, prefixo = "") {
  return Object.entries(objeto).flatMap(([chave, valor]) =>
    valor && typeof valor === "object" && !Array.isArray(valor)
      ? chaves(valor, `${prefixo}${chave}.`)
      : [`${prefixo}${chave}`],
  );
}

const pt = chaves(msgs.pt).sort();
const en = chaves(msgs.en).sort();
for (const c of pt.filter((c) => !en.includes(c))) problemas.push(`falta em en.json: ${c}`);
for (const c of en.filter((c) => !pt.includes(c))) problemas.push(`falta em pt.json: ${c}`);

/* ------------------------------------------------- 2. os dados traduzidos -- */

/** Segue o caminho `a.b.c` dentro de um objeto; devolve `undefined` se faltar. */
const ler = (obj, caminho) =>
  caminho.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

function exigir(caminho, contexto) {
  for (const l of linguas) {
    const v = ler(msgs[l], caminho);
    if (typeof v !== "string" || v.trim() === "") {
      problemas.push(`${l}.json não traduz ${contexto}: falta ${caminho}`);
    }
  }
}

/* As categorias que a carta usa mesmo — lidas do JSON dos dados, não de uma
   lista escrita à mão que voltaria a ficar para trás pela mesma razão. */
const ementa = JSON.parse(readFileSync("src/data/ementa.json", "utf8"));
const categorias = [...new Set(ementa.artigos.map((a) => a.categoria))];
for (const c of categorias) exigir(`ementa.categorias.${c}`, `a categoria "${c}"`);

/* Os sabores vivem em `ementa.ts` e não no JSON. Ler o TypeScript com uma
   expressão regular é feio, e é menos feio do que manter a lista em dois sítios:
   um `SABORES` novo sem tradução volta a pôr o nome da chave no ecrã. */
const fonte = readFileSync("src/data/ementa.ts", "utf8");
const bloco = fonte.match(/export const SABORES = \[([\s\S]*?)\] as const;/);
if (!bloco) {
  problemas.push("não encontrei o SABORES em src/data/ementa.ts — o padrão mudou?");
} else {
  const sabores = [...bloco[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  for (const s of sabores) exigir(`ementa.sabores.${s}`, `o sabor "${s}"`);
}

/* As secções com duas colunas de preço (`METADADOS` em `ementa.ts`) precisam
   do nome de cada coluna — a página pede-o por categoria, e uma secção nova com
   colunas e sem nomes escrevia a chave por cima dos preços. */
const metadados = fonte.match(/export const METADADOS[\s\S]*?\n\};/);
if (!metadados) {
  problemas.push("não encontrei o METADADOS em src/data/ementa.ts — o padrão mudou?");
} else {
  const comColunas = [...metadados[0].matchAll(/"?([a-z-]+)"?:\s*\{[^}]*colunas:/g)].map((m) => m[1]);
  for (const c of comColunas) {
    exigir(`ementa.colunas.${c}.a`, `a primeira coluna de preço de "${c}"`);
    exigir(`ementa.colunas.${c}.b`, `a segunda coluna de preço de "${c}"`);
  }
}

/* ------------------------------------------------------------- relatório -- */

if (problemas.length === 0) {
  console.log(
    `✓ ${pt.length} chaves iguais nas duas línguas · ` +
      `${categorias.length} categorias e os sabores todos traduzidos`,
  );
  process.exit(0);
}

for (const p of problemas) console.error(`✖ ${p}`);
process.exit(1);
