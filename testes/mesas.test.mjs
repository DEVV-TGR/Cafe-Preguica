/*
  As contas das leituras das mesas (`src/lib/mesas/contas.ts`). O que interessa
  provar: o fecho depois da meia-noite conta na noite certa, só mesas a sério
  chegam ao Redis, e o resumo do painel soma o que deve.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  campoDaHora,
  campoDaLeitura,
  estatistica,
  horaEmLisboa,
  lerCampos,
  lerHoras,
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
    [campoDaLeitura("2026-10-09", 3)]: 4,
    [campoDaLeitura("2026-10-03", 12)]: 2, // dentro dos 7 (6 noites antes)
    [campoDaLeitura("2026-10-02", 12)]: 5, // fora dos 7, dentro dos 30
    [campoDaLeitura("2026-08-01", 1)]: 9, // só no "sempre"
    "lixo|3": 100,
    "2026-10-09|abc": 100,
    "2026-10-09|outra|3": 100,
  };

  const r = resumir(hash, hoje);
  assert.equal(r.semana, 6);
  assert.equal(r.mes, 11);
  assert.equal(r.sempre, 20);

  assert.equal(r.porNoite.length, 14);
  assert.deepEqual(r.porNoite[0], { noite: "2026-10-09", total: 4 });
  assert.deepEqual(r.porNoite[1], { noite: "2026-10-08", total: 0 });
  assert.deepEqual(r.porNoite[6], { noite: "2026-10-03", total: 2 });

  assert.deepEqual(r.porMesa, [
    { mesa: 3, total: 4 },
    { mesa: 12, total: 7 },
  ]);
});

test("os campos antigos, com qr ou nfc no meio, somam na mesa e na noite deles", () => {
  const r = resumir(
    {
      "2026-10-09|qr|3": 2,
      "2026-10-09|nfc|3": 1,
      [campoDaLeitura("2026-10-09", 3)]: 4,
    },
    "2026-10-09",
  );
  assert.equal(r.semana, 7);
  assert.deepEqual(r.porNoite[0], { noite: "2026-10-09", total: 7 });
  assert.deepEqual(r.porMesa, [{ mesa: 3, total: 7 }]);
});

/* --------------------------------------------- a estatística do painel */

test("a hora é a de Lisboa, com dois algarismos", () => {
  assert.equal(horaEmLisboa(new Date("2026-10-10T22:41:00Z")), "23"); // verão, UTC+1
  assert.equal(horaEmLisboa(new Date("2026-10-10T23:05:00Z")), "00");
  assert.equal(horaEmLisboa(new Date("2026-12-12T21:30:00Z")), "21"); // inverno, UTC+0
});

function dadosDeEnsaio() {
  const leituras = lerCampos({
    [campoDaLeitura("2026-10-10", 4)]: 5,
    [campoDaLeitura("2026-10-10", 7)]: 2,
    [campoDaLeitura("2026-10-09", 4)]: 3,
    [campoDaLeitura("2026-09-01", 4)]: 40, // fora dos 7 e dos 30
  });
  const horas = lerHoras({
    [campoDaHora("2026-10-10", 4, "22")]: 4,
    [campoDaHora("2026-10-10", 4, "01")]: 1,
    [campoDaHora("2026-10-10", 7, "22")]: 2,
    "lixo|4|99": 7,
  });
  const ultimas = [
    { quando: Date.parse("2026-10-10T21:10:00Z"), mesa: 4 },
    { quando: Date.parse("2026-10-10T21:20:00Z"), mesa: 7 },
  ];
  return { leituras, horas, ultimas };
}

test("todas as mesas, nas últimas 7 noites", () => {
  const e = estatistica(dadosDeEnsaio(), { mesa: null, periodo: 7 }, "2026-10-10");
  assert.equal(e.total, 10);
  assert.equal(e.noites.length, 7);
  assert.equal(e.noites.at(-1), "2026-10-10", "a noite mais recente fica à direita");
  assert.deepEqual(e.porNoite.at(-1), { noite: "2026-10-10", total: 7 });
  assert.equal(e.porMesa.get(4), 8);
  assert.equal(e.porMesa.get(7), 2);
  assert.equal(e.ultimas.length, 2);
  assert.equal(e.horasDesde, "2026-10-10");
});

test("uma mesa: tudo passa a ser dela, menos o mapa, que continua a mostrar todas", () => {
  const e = estatistica(dadosDeEnsaio(), { mesa: 4, periodo: 7 }, "2026-10-10");
  assert.equal(e.total, 8);
  assert.equal(e.porHora.find((h) => h.hora === 22).total, 4);
  assert.equal(e.porMesa.get(7), 2, "o mapa ignora o filtro da mesa");
  assert.deepEqual(e.ultimas.map((u) => u.mesa), [4]);
});

test("as horas vão pela ordem da noite, com a uma da manhã depois das onze", () => {
  const e = estatistica(dadosDeEnsaio(), { mesa: null, periodo: { noite: "2026-10-10" } }, "2026-10-10");
  const horas = e.porHora.map((h) => h.hora);
  assert.ok(horas.indexOf(22) < horas.indexOf(1));
  assert.equal(horas[0], 16, "pelo menos das 16h");
  assert.equal(e.porHora.find((h) => h.hora === 1).total, 1);
  assert.equal(e.total, 7);
});

test("a média por dia da semana divide pelas noites desse dia", () => {
  const e = estatistica(dadosDeEnsaio(), { mesa: null, periodo: 7 }, "2026-10-10");
  // 2026-10-10 é sábado (5), 2026-10-09 é sexta (4).
  assert.equal(e.porDiaDaSemana[5].media, 7);
  assert.equal(e.porDiaDaSemana[4].media, 3);
});
