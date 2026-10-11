/*
  As sessões com registo e os aparelhos (`src/lib/painel/sessao.ts` e
  `src/lib/painel/aparelhos.ts`), com o armazenamento em memória do `redis.ts`.

  O que se prova: uma sessão abre enquanto existir no Redis; terminar um
  aparelho fecha-a **e** esquece o aparelho; uma entrada nova no mesmo aparelho
  fecha a anterior; sair fecha a sessão mas deixa o aparelho lembrado; e um
  selo de antes do registo, sem `id`, já não abre.
*/
import { test, before } from "node:test";
import assert from "node:assert/strict";

let sessao;
let aparelhos;

before(async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "os testes usam o armazenamento em memória");
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  sessao = await import("../src/lib/painel/sessao.ts");
  aparelhos = await import("../src/lib/painel/aparelhos.ts");
});

async function entrar(email) {
  const aparelho = await sessao.lembrarAparelho(email);
  const nova = await sessao.selar(email, aparelho.id);
  await aparelhos.registarEntrada(aparelho.id, email, nova.id, true);
  return { aparelho, nova };
}

test("terminar um aparelho fecha a sessão e esquece-o", async () => {
  const email = "terminar@exemplo.pt";
  const { aparelho, nova } = await entrar(email);

  assert.deepEqual(await sessao.abrir(nova.cookie), { email, sessao: nova.id, aparelho: aparelho.id });
  assert.equal(await sessao.aparelhoConhecido(aparelho.cookie, email), aparelho.id);
  assert.ok((await aparelhos.aparelhosComAcesso()).some((a) => a.id === aparelho.id && a.sessao === nova.id));

  const terminado = await aparelhos.terminarAparelho(aparelho.id);
  assert.equal(terminado.email, email);

  assert.equal(await sessao.abrir(nova.cookie), null, "a sessão já não abre");
  assert.equal(await sessao.aparelhoConhecido(aparelho.cookie, email), null, "e o aparelho pede o código");
  assert.ok(!(await aparelhos.aparelhosComAcesso()).some((a) => a.id === aparelho.id));
});

test("uma entrada nova no mesmo aparelho fecha a sessão anterior", async () => {
  const email = "duas@exemplo.pt";
  const { aparelho, nova: primeira } = await entrar(email);

  const segunda = await sessao.selar(email, aparelho.id);
  await aparelhos.registarEntrada(aparelho.id, email, segunda.id, false);

  assert.equal(await sessao.abrir(primeira.cookie), null);
  assert.equal((await sessao.abrir(segunda.cookie))?.email, email);
});

test("sair fecha a sessão, e o aparelho continua lembrado", async () => {
  const email = "sair@exemplo.pt";
  const { aparelho, nova } = await entrar(email);

  await aparelhos.fecharSessao(aparelho.id, nova.id);

  assert.equal(await sessao.abrir(nova.cookie), null);
  assert.equal(await sessao.aparelhoConhecido(aparelho.cookie, email), aparelho.id);
  const linha = (await aparelhos.aparelhosComAcesso()).find((a) => a.id === aparelho.id);
  assert.equal(linha.sessao, null);
});

test("um cookie que não é nosso não abre", async () => {
  assert.equal(await sessao.abrir("s2.e30.nada"), null);
  assert.equal(await sessao.abrir(undefined), null);
});
