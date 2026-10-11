/*
  O tranco da ligação por emails sem acesso (`contarSemAcesso` e
  `ligacaoTrancada` em `src/lib/painel/limites.ts`), com o armazenamento em
  memória do `redis.ts`.

  O que se prova: as duas primeiras tentativas sem acesso não trancam, a
  terceira tranca, e a partir daí a ligação fica trancada — que é o que faz o
  `pedirCodigo` recusar também os emails da lista.
*/
import { test, before } from "node:test";
import assert from "node:assert/strict";

let limites;

before(async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "os testes usam o armazenamento em memória");
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  limites = await import("../src/lib/painel/limites.ts");
});

test("à terceira tentativa sem acesso, a ligação fica trancada", async () => {
  assert.equal(await limites.ligacaoTrancada(), false);

  assert.equal(await limites.contarSemAcesso(), false, "1.ª");
  assert.equal(await limites.ligacaoTrancada(), false);

  assert.equal(await limites.contarSemAcesso(), false, "2.ª");
  assert.equal(await limites.ligacaoTrancada(), false);

  assert.equal(await limites.contarSemAcesso(), true, "3.ª");
  assert.equal(await limites.ligacaoTrancada(), true);

  /* E continua: mais uma não destranca nada. */
  assert.equal(await limites.contarSemAcesso(), true);
  assert.equal(await limites.ligacaoTrancada(), true);
});
