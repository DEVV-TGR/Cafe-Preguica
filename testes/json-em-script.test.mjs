/*
  O JSON-LD (`src/lib/json-em-script.ts`). O painel grava o telefone e os links
  das redes, e esses valores acabam dentro de um <script> em todas as páginas
  públicas: nada do que lá se escreva pode fechar a etiqueta.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { jsonParaScript } from "../src/lib/json-em-script.ts";

const SEPARADORES = String.fromCharCode(0x2028) + String.fromCharCode(0x2029);

const MALICIOSO = {
  telephone: "</script><script>alert(document.domain)</script>",
  sameAs: ["https://instagram.com/</script><img src=x onerror=alert(1)>"],
  outro: `<!-- & ${SEPARADORES} -->`,
};

test("não sobra nenhum carácter que feche ou abra HTML", () => {
  const saida = jsonParaScript(MALICIOSO);
  for (const perigoso of ["<", ">", "&", ...SEPARADORES]) {
    assert.ok(!saida.includes(perigoso), `a saída ainda tem ${JSON.stringify(perigoso)}`);
  }
});

test("continua a ser o mesmo JSON para quem o lê", () => {
  assert.deepEqual(JSON.parse(jsonParaScript(MALICIOSO)), MALICIOSO);
});

test("dados normais saem iguais ao JSON.stringify", () => {
  const normal = { "@type": "CafeOrCoffeeShop", telephone: "229 730 873" };
  assert.equal(jsonParaScript(normal), JSON.stringify(normal));
});
