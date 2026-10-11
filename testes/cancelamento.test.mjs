/*
  O cancelamento da newsletter: a assinatura do webhook do Resend
  (`src/lib/newsletter/webhook.ts`) e o aviso que só sai uma vez por
  cancelamento (`src/lib/newsletter/aviso-unico.ts`), com o armazenamento em
  memória.
*/
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

let webhook;
let avisoUnico;

before(async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "os testes usam o armazenamento em memória");
  for (const nome of [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "KV_REST_API_URL",
    "KV_REST_API_TOKEN",
    "RESEND_NEWSLETTER_API_KEY",
  ]) delete process.env[nome];
  webhook = await import("../src/lib/newsletter/webhook.ts");
  avisoUnico = await import("../src/lib/newsletter/aviso-unico.ts");
});

const SEGREDO = `whsec_${Buffer.from("um segredo de ensaio com 32 bytes!").toString("base64")}`;
const CORPO = JSON.stringify({ type: "contact.updated", data: { email: "a@exemplo.pt", unsubscribed: true } });
const AGORA = Date.parse("2026-10-11T22:00:00Z");

function assinar(id, instante, corpo) {
  const chave = Buffer.from(SEGREDO.replace(/^whsec_/, ""), "base64");
  return `v1,${createHmac("sha256", chave).update(`${id}.${instante}.${corpo}`).digest("base64")}`;
}

test("uma assinatura certa, dentro do prazo, passa", () => {
  const instante = String(AGORA / 1000);
  assert.equal(
    webhook.assinaturaValida({
      segredo: SEGREDO,
      id: "msg_1",
      instante,
      assinaturas: `v1,outra ${assinar("msg_1", instante, CORPO)}`,
      corpo: CORPO,
      agora: AGORA,
    }),
    true,
  );
});

test("um corpo mexido, uma assinatura de outro segredo ou um instante velho não passam", () => {
  const instante = String(AGORA / 1000);
  const certa = assinar("msg_1", instante, CORPO);
  const base = { segredo: SEGREDO, id: "msg_1", instante, assinaturas: certa, corpo: CORPO, agora: AGORA };

  assert.equal(webhook.assinaturaValida({ ...base, corpo: CORPO.replace("true", "false") }), false);
  assert.equal(webhook.assinaturaValida({ ...base, segredo: "whsec_b3V0cm8=" }), false);
  assert.equal(webhook.assinaturaValida({ ...base, agora: AGORA + 6 * 60 * 1000 }), false, "seis minutos depois");
  assert.equal(webhook.assinaturaValida({ ...base, assinaturas: null }), false);
});

test("o aviso de cancelamento sai uma vez, e volta a poder sair depois de uma reinscrição", async () => {
  const email = "uma-vez@exemplo.pt";
  let enviados = 0;
  const mandar = async () => {
    enviados += 1;
  };

  assert.equal(await avisoUnico.umaVezPorCancelamento(email, mandar), true);
  assert.equal(await avisoUnico.umaVezPorCancelamento(email, mandar), false, "o webhook a seguir ao painel não manda outro");
  assert.equal(enviados, 1);

  await avisoUnico.esquecerAviso(email);
  assert.equal(await avisoUnico.umaVezPorCancelamento(email, mandar), true);
  assert.equal(enviados, 2);
});

test("um aviso que falhou não impede o seguinte", async () => {
  const email = "falhou@exemplo.pt";
  await assert.rejects(
    avisoUnico.umaVezPorCancelamento(email, async () => {
      throw new Error("o Resend não respondeu");
    }),
  );
  assert.equal(await avisoUnico.umaVezPorCancelamento(email, async () => {}), true);
});
