/*
  A prova do consentimento da newsletter (`src/lib/newsletter/consentimento.ts`),
  o convite que a leva (`src/lib/newsletter/convite.ts`) e a chave da carta
  secreta (`src/lib/carta-secreta/chave.ts`), com o armazenamento em memória.

  Revisão legal de 2026-10-15. O que se prova:

  - cada confirmação fica com a sua hora, o texto que estava ao lado do botão e
    a versão dele — e uma reinscrição é um registo novo, não o de antes;
  - sem prazo enquanto a pessoa está inscrita; com prazo depois de retirar; e
    voltar a inscrever-se tira o prazo outra vez;
  - apagar leva a prova;
  - um convite com novidades sem texto não se aceita, e os `n1` também não;
  - a chave da carta não leva o email, não se renova sozinha, e as `c1` (com
    email) ainda se aceitam, uma vez, para serem trocadas.
*/
import { test, before } from "node:test";
import assert from "node:assert/strict";

let consentimento;
let convite;
let chave;
let redis;

before(async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "os testes usam o armazenamento em memória");
  for (const nome of ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"]) {
    delete process.env[nome];
  }
  consentimento = await import("../src/lib/newsletter/consentimento.ts");
  convite = await import("../src/lib/newsletter/convite.ts");
  chave = await import("../src/lib/carta-secreta/chave.ts");
  redis = await import("../src/lib/painel/redis.ts");
});

const TEXTO = "Ao inscrever-se, aceita receber as novidades da casa por email. Pode cancelar quando quiser.";

function dados(pedidoEm) {
  return { pedidoEm, origem: "carta", lingua: "pt", texto: TEXTO, versao: "2026-10-15" };
}

test("a confirmação fica com hora, texto e versão, e a reinscrição é um registo novo", async () => {
  const email = "Prova@Exemplo.pt";
  await consentimento.registarConsentimento(email, dados(1000));
  await consentimento.registarRetirada(email, "link-no-email");
  await consentimento.registarConsentimento(email, { ...dados(2000), origem: "convite" });

  const prova = await consentimento.provaDe("prova@exemplo.pt ");
  assert.deepEqual(
    prova.map((a) => a.tipo),
    ["consentimento", "retirada", "consentimento"],
    "o mesmo email, com outras maiúsculas e espaços, é a mesma pessoa",
  );
  const [primeira, , segunda] = prova;
  assert.equal(primeira.texto, TEXTO);
  assert.equal(primeira.versao, "2026-10-15");
  assert.equal(primeira.confirmacao, "botao-depois-do-email");
  assert.equal(segunda.pedidoEm, 2000);
  assert.equal(segunda.origem, "convite");
  assert.ok(segunda.quando >= primeira.quando);
  for (const a of prova) {
    assert.ok(!("ip" in a) && !("aparelho" in a), "sem IP nem aparelho");
  }

  const [ultima] = await consentimento.ultimasConfirmacoes([email]);
  assert.equal(ultima.pedidoEm, 2000, "a lista do painel mostra a última confirmação");
});

test("inscrito: sem prazo; depois de retirar: com prazo; voltar: sem prazo outra vez", async () => {
  const email = "prazo@exemplo.pt";
  const chaveDaProva = consentimento.chaveDaProva(email);

  await consentimento.registarConsentimento(email, dados(1));
  assert.equal(await redis.prazoDe(chaveDaProva), -1);
  assert.equal(await consentimento.jaRetirou(email), false);

  await consentimento.registarRetirada(email, "painel");
  const prazo = await redis.prazoDe(chaveDaProva);
  assert.ok(prazo > 0 && prazo <= consentimento.PRAZO_DA_PROVA_S, `prazo de ${prazo} s`);
  assert.equal(await consentimento.jaRetirou(email), true);

  await consentimento.registarConsentimento(email, dados(2));
  assert.equal(await redis.prazoDe(chaveDaProva), -1);
  assert.equal(await consentimento.jaRetirou(email), false);
});

test("apagar leva a prova toda", async () => {
  const email = "apagar@exemplo.pt";
  await consentimento.registarConsentimento(email, dados(1));
  await consentimento.apagarProva(email);
  assert.deepEqual(await consentimento.provaDe(email), []);
  assert.equal(await redis.prazoDe(consentimento.chaveDaProva(email)), -2);
});

test("a chave da prova é um resumo, não o email", () => {
  const k = consentimento.chaveDaProva("alguem@exemplo.pt");
  assert.ok(!k.includes("alguem"));
  assert.match(k, /^newsletter:consentimento:[0-9a-f]{64}$/);
});

test("o convite leva o texto e a versão quando há novidades, e nada disso sem elas", async () => {
  const com = await convite.criarConvite({
    email: "a@exemplo.pt",
    lingua: "pt",
    origem: "carta",
    novidades: true,
    texto: TEXTO,
  });
  const aberto = await convite.abrirConvite(com);
  assert.equal(aberto.novidades, true);
  assert.equal(aberto.texto, TEXTO);
  assert.equal(aberto.versao, convite.VERSAO_DO_TEXTO);
  assert.equal(aberto.origem, "carta");
  assert.ok(Math.abs(aberto.pedidoEm - Date.now()) < 5000);

  const sem = await convite.abrirConvite(
    await convite.criarConvite({ email: "b@exemplo.pt", lingua: "en", origem: "carta", novidades: false, texto: null }),
  );
  assert.equal(sem.novidades, false);
  assert.equal(sem.texto, null);
  assert.equal(sem.versao, null);
});

test("um convite com novidades e sem texto, ou da versão n1, não abre", async () => {
  const semTexto = await convite.criarConvite({
    email: "c@exemplo.pt",
    lingua: "pt",
    origem: "convite",
    novidades: true,
    texto: "",
  });
  assert.equal(await convite.abrirConvite(semTexto), "invalido");

  const [, corpo, selo] = semTexto.split(".");
  assert.equal(await convite.abrirConvite(`n1.${corpo}.${selo}`), "invalido");
});

test("um convite caducado diz que caducou", async () => {
  const ha3dias = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const velho = await convite.criarConvite(
    { email: "d@exemplo.pt", lingua: "pt", origem: "convite", novidades: true, texto: TEXTO },
    ha3dias,
  );
  assert.equal(await convite.abrirConvite(velho), "expirado");
});

test("a chave da carta não leva o email, e o prazo depende de lembrar", async () => {
  const sessao = await chave.criarChaveDaCarta(false);
  const lembrada = await chave.criarChaveDaCarta(true);

  for (const c of [sessao, lembrada]) {
    const corpo = Buffer.from(c.split(".")[1], "base64url").toString("utf8");
    assert.ok(!corpo.includes("@"), `sem email lá dentro: ${corpo}`);
    assert.deepEqual(Object.keys(JSON.parse(corpo)).sort(), ["exp", "r"]);
  }

  const a = await chave.abrirChaveDaCarta(sessao);
  const b = await chave.abrirChaveDaCarta(lembrada);
  assert.equal(a.versao, "c2");
  assert.equal(a.lembrada, false);
  assert.ok(a.exp - Date.now() <= chave.VALIDADE_DA_SESSAO_MS);
  assert.equal(b.lembrada, true);
  assert.ok(b.exp - Date.now() <= chave.VALIDADE_LEMBRADA_MS);
  assert.ok(b.exp - Date.now() > chave.VALIDADE_LEMBRADA_MS - 60_000);
});

test("uma chave caducada, mexida ou inventada não abre", async () => {
  const velha = await chave.criarChaveDaCarta(true, Date.now() - chave.VALIDADE_LEMBRADA_MS - 1000);
  assert.equal(await chave.abrirChaveDaCarta(velha), null);

  const boa = await chave.criarChaveDaCarta(false);
  const [v, , selo] = boa.split(".");
  const outroCorpo = Buffer.from(JSON.stringify({ exp: Date.now() + 1e12, r: true })).toString("base64url");
  assert.equal(await chave.abrirChaveDaCarta(`${v}.${outroCorpo}.${selo}`), null);
  assert.equal(await chave.abrirChaveDaCarta("c2.e30.nada"), null);
});

test("uma chave c1 nossa, com email, ainda se reconhece — para ser trocada", async () => {
  const { createHmac } = await import("node:crypto");
  const { chave: derivar } = await import("../src/lib/painel/chaves.ts");
  const corpo = Buffer.from(JSON.stringify({ e: "antiga@exemplo.pt", exp: Date.now() + 1000 })).toString(
    "base64url",
  );
  const selo = createHmac("sha256", await derivar("carta")).update(`c1.${corpo}`).digest("base64url");
  const aberta = await chave.abrirChaveDaCarta(`c1.${corpo}.${selo}`);
  assert.equal(aberta.versao, "c1");
  assert.ok(!("email" in aberta), "o email de dentro não sai daqui");
});
