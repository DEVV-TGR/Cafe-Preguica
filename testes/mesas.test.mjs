/*
  As contas das leituras das mesas (`src/lib/mesas/contas.ts`). O que interessa
  provar: o fecho depois da meia-noite conta na noite certa, só mesas a sério
  chegam ao Redis, e o resumo do painel soma o que deve.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  campoDaLeitura,
  mesaValida,
  noiteAntes,
  noiteDeServico,
  pareceRobo,
  resumir,
} from "../src/lib/mesas/contas.ts";

test("depois da meia-noite ainda é a noite anterior", () => {
  // Sábado, 01:15 em Lisboa (verão, UTC+1) — ainda é a noite de sexta.
  assert.equal(noiteDeServico(new Date("2026-10-10T00:15:00Z")), "2026-10-09");
  // 05:59 em Lisboa — ainda sexta; 06:00 — já sábado.
  assert.equal(noiteDeServico(new Date("2026-10-10T04:59:00Z")), "2026-10-09");
  assert.equal(noiteDeServico(new Date("2026-10-10T05:00:00Z")), "2026-10-10");
});

test("a viragem usa a hora de Lisboa também no inverno", () => {
  // Inverno, UTC+0: 05:30 em Lisboa ainda é a noite anterior.
  assert.equal(noiteDeServico(new Date("2026-12-12T05:30:00Z")), "2026-12-11");
  assert.equal(noiteDeServico(new Date("2026-12-12T06:00:00Z")), "2026-12-12");
});

test("noiteAntes atravessa meses e a mudança da hora", () => {
  assert.equal(noiteAntes("2026-11-01", 1), "2026-10-31");
  assert.equal(noiteAntes("2026-10-26", 1), "2026-10-25");
  assert.equal(noiteAntes("2026-03-01", 29), "2026-01-31");
});

test("só números de mesa curtos e positivos contam", () => {
  assert.equal(mesaValida("7"), 7);
  assert.equal(mesaValida("07"), 7);
  assert.equal(mesaValida("22"), 22);
  for (const mau of ["0", "00", "100", "-1", "7a", "", " 7", "1e1", "7.0"]) {
    assert.equal(mesaValida(mau), null, mau);
  }
});

test("pré-visualizações e robôs não contam; um telemóvel conta", () => {
  assert.equal(pareceRobo(null), true);
  assert.equal(pareceRobo(""), true);
  assert.equal(pareceRobo("WhatsApp/2.23.20.0"), true);
  assert.equal(pareceRobo("facebookexternalhit/1.1"), true);
  assert.equal(pareceRobo("Mozilla/5.0 (compatible; Googlebot/2.1)"), true);
  assert.equal(pareceRobo("curl/8.7.1"), true);
  assert.equal(
    pareceRobo(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    ),
    false,
  );
});

test("o resumo soma por janela, por noite e por mesa", () => {
  const hoje = "2026-10-09";
  const hash = {
    [campoDaLeitura("2026-10-09", "qr", 3)]: 4,
    [campoDaLeitura("2026-10-09", "nfc", 3)]: 1,
    [campoDaLeitura("2026-10-03", "qr", 12)]: 2, // dentro dos 7 (6 noites antes)
    [campoDaLeitura("2026-10-02", "qr", 12)]: 5, // fora dos 7, dentro dos 30
    [campoDaLeitura("2026-08-01", "nfc", 1)]: 9, // só no "sempre"
    "lixo|qr|3": 100,
    "2026-10-09|outra|3": 100,
    "2026-10-09|qr|abc": 100,
  };

  const r = resumir(hash, hoje);
  assert.deepEqual(r.semana, { qr: 6, nfc: 1 });
  assert.deepEqual(r.mes, { qr: 11, nfc: 1 });
  assert.deepEqual(r.sempre, { qr: 11, nfc: 10 });

  assert.equal(r.porNoite.length, 14);
  assert.deepEqual(r.porNoite[0], { noite: "2026-10-09", qr: 4, nfc: 1 });
  assert.deepEqual(r.porNoite[1], { noite: "2026-10-08", qr: 0, nfc: 0 });
  assert.deepEqual(r.porNoite[6], { noite: "2026-10-03", qr: 2, nfc: 0 });

  assert.deepEqual(r.porMesa, [
    { mesa: 3, qr: 4, nfc: 1 },
    { mesa: 12, qr: 7, nfc: 0 },
  ]);
});
