/*
  O teto diário de tentativas de código (`src/lib/painel/limites.ts` e
  `src/lib/painel/codigo.ts`), com o código de produção e o armazenamento em
  memória do `redis.ts` — o mesmo recuo que o `npm run dev` usa sem Upstash.

  O que se prova: todas as tentativas contam, certas ou erradas; o contador só
  sobe (nunca há devolução, nem valores negativos); e, esgotado o teto, nem um
  código acabado de pedir, com as tentativas todas por usar, é comparado — nem
  quando é o certo.
*/
import { test, before } from "node:test";
import assert from "node:assert/strict";

let codigo;
let limites;

before(async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "os testes usam o armazenamento em memória");
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  codigo = await import("../src/lib/painel/codigo.ts");
  limites = await import("../src/lib/painel/limites.ts");
});

const CERTO = "384921";
const ERRADO = "000000";

async function tentar(email, escrito) {
  const cookie = await codigo.criarDesafio(email, CERTO);
  return codigo.conferirCodigo(cookie, escrito);
}

test("uma tentativa certa também conta, e o contador nunca desce", async () => {
  const email = "certas@exemplo.pt";
  assert.equal(await limites.tentativasDoDia(email), 0);

  assert.equal((await tentar(email, CERTO)).estado, "certo");
  assert.equal(await limites.tentativasDoDia(email), 1);

  assert.equal((await tentar(email, ERRADO)).estado, "errado");
  assert.equal(await limites.tentativasDoDia(email), 2);

  assert.equal((await tentar(email, CERTO)).estado, "certo");
  assert.equal(await limites.tentativasDoDia(email), 3, "uma certa não devolve nada");
});

test("à 21.ª tentativa do dia, nem o código certo é aceite", async () => {
  const email = "teto@exemplo.pt";

  /* Vinte tentativas, metade certas e metade erradas. */
  for (let i = 0; i < 20; i++) {
    const veredicto = await tentar(email, i % 2 ? CERTO : ERRADO);
    assert.equal(veredicto.estado, i % 2 ? "certo" : "errado", `tentativa ${i + 1}`);
  }
  assert.equal(await limites.tentativasDoDia(email), 20);

  /* Um código acabado de pedir, com as 5 tentativas por usar, e o certo. */
  const cookie = await codigo.criarDesafio(email, CERTO);
  assert.deepEqual(await codigo.conferirCodigo(cookie, CERTO), { estado: "bloqueado", email });

  /* E o desafio foi queimado: nem uma segunda vez. */
  assert.deepEqual(await codigo.conferirCodigo(cookie, CERTO), { estado: "expirado" });
  assert.equal(await codigo.emailDoDesafio(cookie), null);
});

test("esgotado o teto, o email deixa de poder pedir códigos", async () => {
  const email = "pedir@exemplo.pt";
  for (let i = 0; i < 20; i++) await tentar(email, ERRADO);
  assert.equal(await limites.podePedirCodigo(email), false);
});

test("pedidos em paralelo não passam do teto", async () => {
  const email = "paralelo@exemplo.pt";
  const cookies = await Promise.all(
    Array.from({ length: 30 }, () => codigo.criarDesafio(email, CERTO)),
  );
  const veredictos = await Promise.all(cookies.map((c) => codigo.conferirCodigo(c, CERTO)));

  const certos = veredictos.filter((v) => v.estado === "certo").length;
  const bloqueados = veredictos.filter((v) => v.estado === "bloqueado").length;
  assert.equal(certos, 20, "exatamente vinte comparadas");
  assert.equal(bloqueados, 10, "as outras dez recusadas sem comparar");
  assert.equal(await limites.tentativasDoDia(email), 30, "todas contadas, nenhuma devolvida");
});

test("o contador de um email não mexe no de outro", async () => {
  assert.equal(await limites.tentativasDoDia("outro@exemplo.pt"), 0);
});
