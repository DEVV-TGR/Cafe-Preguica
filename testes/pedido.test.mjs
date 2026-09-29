/*
  A leitura do corpo das rotas públicas (`src/lib/pedido.ts`): só JSON, e com
  teto, antes de o `zod` sequer olhar para ele.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { lerJson, TETO_DO_CORPO } from "../src/lib/pedido.ts";

const pedido = (corpo, cabecalhos = { "content-type": "application/json" }) =>
  new Request("http://localhost/api/teste", { method: "POST", headers: cabecalhos, body: corpo });

test("JSON válido passa", async () => {
  assert.deepEqual(await lerJson(pedido('{"email":"a@b.pt"}')), {
    ok: true,
    valor: { email: "a@b.pt" },
  });
});

test("sem application/json é 415 — um <form> de outro site não chega cá", async () => {
  for (const tipo of ["text/plain", "application/x-www-form-urlencoded", "multipart/form-data"]) {
    const lido = await lerJson(pedido('{"email":"a@b.pt"}', { "content-type": tipo }));
    assert.deepEqual(lido, { ok: false, estado: 415 }, tipo);
  }
  assert.deepEqual(await lerJson(pedido("{}", {})), { ok: false, estado: 415 });
});

test("um corpo acima do teto é 413, diga o Content-Length o que disser", async () => {
  const grande = JSON.stringify({ email: "a".repeat(TETO_DO_CORPO) });
  assert.deepEqual(await lerJson(pedido(grande)), { ok: false, estado: 413 });

  const mentiroso = pedido(grande, { "content-type": "application/json", "content-length": "10" });
  assert.deepEqual(await lerJson(mentiroso), { ok: false, estado: 413 });

  const declarado = pedido("{}", {
    "content-type": "application/json",
    "content-length": String(TETO_DO_CORPO + 1),
  });
  assert.deepEqual(await lerJson(declarado), { ok: false, estado: 413 });
});

test("JSON partido é 400", async () => {
  assert.deepEqual(await lerJson(pedido("{email:")), { ok: false, estado: 400 });
});

test("um __proto__ no corpo não contamina objetos", async () => {
  const lido = await lerJson(pedido('{"__proto__":{"admin":true}}'));
  assert.equal(lido.ok, true);
  assert.equal({}.admin, undefined);
});
