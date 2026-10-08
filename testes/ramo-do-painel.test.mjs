/*
  Onde o painel grava (`src/lib/painel/github.ts`, `ramo()`).

  O que se prova: só o site oficial (`VERCEL_ENV=production`) grava no `main`. Uma
  pré-visualização da Vercel ou o `npm start` — que também correm com
  `NODE_ENV=production` — gravam na branch de ensaio, e sem ela recusam. Nem
  `PAINEL_GITHUB_RAMO=main` abre essa porta fora do site oficial.
*/
import { test, before, afterEach } from "node:test";
import assert from "node:assert/strict";

let github;
const original = { ...process.env };

before(async () => {
  github = await import("../src/lib/painel/github.ts");
});

afterEach(() => {
  for (const nome of ["VERCEL_ENV", "PAINEL_GITHUB_RAMO", "NODE_ENV"]) {
    if (original[nome] === undefined) delete process.env[nome];
    else process.env[nome] = original[nome];
  }
});

test("no site oficial grava no main, seja qual for a branch de ensaio", () => {
  process.env.VERCEL_ENV = "production";
  process.env.PAINEL_GITHUB_RAMO = "painel-ensaio";
  assert.equal(github.ramo(), "main");
});

test("numa pré-visualização, com NODE_ENV=production, grava na branch de ensaio", () => {
  process.env.NODE_ENV = "production";
  process.env.VERCEL_ENV = "preview";
  process.env.PAINEL_GITHUB_RAMO = "painel-ensaio";
  assert.equal(github.ramo(), "painel-ensaio");
});

test("fora do site oficial e sem branch de ensaio, recusa com uma frase que se lê", () => {
  process.env.NODE_ENV = "production";
  delete process.env.VERCEL_ENV;
  delete process.env.PAINEL_GITHUB_RAMO;
  assert.throws(
    () => github.ramo(),
    (erro) => erro instanceof github.ErroDoGithub && /versão de ensaio/.test(erro.paraOEcra),
  );
});

test("fora do site oficial, PAINEL_GITHUB_RAMO=main também é recusado", () => {
  process.env.VERCEL_ENV = "preview";
  process.env.PAINEL_GITHUB_RAMO = " main ";
  assert.throws(() => github.ramo(), github.ErroDoGithub);
});

test("o email da entrada do painel é validado como nas rotas públicas", async () => {
  const { EsquemaEmail } = await import("../src/lib/email.ts");
  assert.equal(EsquemaEmail.parse("  Dono@Exemplo.PT "), "dono@exemplo.pt");
  assert.equal(EsquemaEmail.safeParse("a@b").success, false);
  assert.equal(EsquemaEmail.safeParse("dono@exemplo.pt\n[painel] linha forjada").success, false);
  assert.equal(EsquemaEmail.safeParse(`${"a".repeat(250)}@exemplo.pt`).success, false);
});
