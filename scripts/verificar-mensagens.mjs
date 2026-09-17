/**
 * Compara as chaves de `messages/pt.json` e `messages/en.json`.
 *
 * Existe porque uma chave em falta no `next-intl` **não parte o build**: em
 * produção a página renderiza com o nome da chave à vista — `ementa.categorias.
 * salgados` no meio da carta — e só se descobre quando alguém abre o site na
 * outra língua, que costuma ser o cliente.
 *
 * Aqui descobre-se no CI, antes do merge.
 */
import { readFileSync } from "node:fs";

const caminhos = ["messages/pt.json", "messages/en.json"];

/** Achata o objeto em `a.b.c`, para comparar folhas e não ramos. */
function chaves(objeto, prefixo = "") {
  return Object.entries(objeto).flatMap(([chave, valor]) =>
    valor && typeof valor === "object" && !Array.isArray(valor)
      ? chaves(valor, `${prefixo}${chave}.`)
      : [`${prefixo}${chave}`],
  );
}

const [pt, en] = caminhos.map((caminho) =>
  chaves(JSON.parse(readFileSync(caminho, "utf8"))).sort(),
);

const soEmPt = pt.filter((chave) => !en.includes(chave));
const soEmEn = en.filter((chave) => !pt.includes(chave));

if (soEmPt.length === 0 && soEmEn.length === 0) {
  console.log(`✓ ${pt.length} chaves, iguais nas duas línguas`);
  process.exit(0);
}

for (const chave of soEmPt) console.error(`✖ falta em en.json: ${chave}`);
for (const chave of soEmEn) console.error(`✖ falta em pt.json: ${chave}`);
process.exit(1);
