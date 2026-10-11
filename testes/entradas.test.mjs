/*
  O registo de quem entra no painel (`src/lib/painel/entradas.ts`), com o
  armazenamento em memória do `redis.ts`.

  O que se prova: o aparelho é resumido como se espera para os browsers que a
  casa usa (incluindo os que mentem sobre quem são), as entradas saem da mais
  recente para a mais antiga, e a lista nunca passa do teto.
*/
import { test, before } from "node:test";
import assert from "node:assert/strict";

let entradas;

before(async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "os testes usam o armazenamento em memória");
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  entradas = await import("../src/lib/painel/entradas.ts");
});

test("o aparelho resume-se a sistema e browser", () => {
  const { aparelhoDe } = entradas;
  const casos = {
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1":
      "iPhone · Safari",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1":
      "iPhone · Chrome",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36":
      "Mac · Chrome",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0":
      "Windows · Edge",
    "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36":
      "Android · Samsung Internet",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:131.0) Gecko/20100101 Firefox/131.0": "Mac · Firefox",
  };
  for (const [ua, esperado] of Object.entries(casos)) assert.equal(aparelhoDe(ua), esperado, ua);
  assert.equal(aparelhoDe(null), "aparelho desconhecido");
  assert.equal(aparelhoDe("curl/8.0"), "aparelho desconhecido");
});

test("as entradas saem da mais recente para a mais antiga, e com teto", async () => {
  await entradas.anotarEntrada("a@exemplo.pt", "codigo");
  await entradas.anotarEntrada("b@exemplo.pt", "aparelho");
  await entradas.anotarEntrada("a@exemplo.pt", "saiu");

  const lidas = await entradas.ultimasEntradas();
  assert.deepEqual(
    lidas.slice(0, 3).map((e) => [e.email, e.como]),
    [
      ["a@exemplo.pt", "saiu"],
      ["b@exemplo.pt", "aparelho"],
      ["a@exemplo.pt", "codigo"],
    ],
  );
  assert.equal(typeof lidas[0].quando, "number");

  for (let i = 0; i < 400; i++) await entradas.anotarEntrada("c@exemplo.pt", "aparelho");
  assert.equal((await entradas.ultimasEntradas()).length, 300);
});
