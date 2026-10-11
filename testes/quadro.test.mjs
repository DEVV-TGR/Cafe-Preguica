/*
  As contas do quadro do painel (`src/lib/painel/quadro.ts`): o nome e as
  iniciais a partir do email, a linha dos inscritos semana a semana, e a escala
  do gráfico das mesas.
*/
import { test, before } from "node:test";
import assert from "node:assert/strict";

let quadro;
before(async () => {
  quadro = await import("../src/lib/painel/quadro.ts");
});

const DIA = 24 * 60 * 60 * 1000;
const AGORA = Date.parse("2026-10-11T20:00:00Z");

test("o nome e as iniciais saem do email", () => {
  assert.equal(quadro.nomeDe("rafael.silva@cafepreguica.pt"), "Rafael");
  assert.equal(quadro.nomeDe("tomas@devplus.pt"), "Tomas");
  assert.equal(quadro.iniciais("rafael.silva@cafepreguica.pt"), "RS");
  assert.equal(quadro.iniciais("tomas@devplus.pt"), "T");
});

test("os inscritos por semana sobem até ao total de hoje, sem os que cancelaram", () => {
  const contactos = [
    { criadoEm: new Date(AGORA - 60 * DIA).toISOString(), cancelou: false },
    { criadoEm: new Date(AGORA - 20 * DIA).toISOString(), cancelou: false },
    { criadoEm: new Date(AGORA - 3 * DIA).toISOString(), cancelou: false },
    { criadoEm: new Date(AGORA - 10 * DIA).toISOString(), cancelou: true },
  ];
  const serie = quadro.inscritosPorSemana(contactos, AGORA, 8);
  assert.equal(serie.length, 8);
  assert.equal(serie.at(-1), 3, "o último ponto é o número do cartão");
  assert.equal(serie[0], 1);
  for (let i = 1; i < serie.length; i++) assert.ok(serie[i] >= serie[i - 1], "a linha nunca desce");
  assert.equal(quadro.novosNoMes(contactos, AGORA), 2);
});

test("a escala do gráfico acaba num número redondo", () => {
  assert.deepEqual(quadro.escala(0), { topo: 4, marcas: [0, 1, 2, 3, 4] });
  assert.deepEqual(quadro.escala(31), { topo: 40, marcas: [0, 10, 20, 30, 40] });
  assert.deepEqual(quadro.escala(38), { topo: 40, marcas: [0, 10, 20, 30, 40] });
  assert.deepEqual(quadro.escala(7), { topo: 8, marcas: [0, 2, 4, 6, 8] });
  assert.equal(quadro.escala(130).topo, 200);
});

test("a linha suave começa no primeiro ponto e acaba no último", () => {
  const d = quadro.linhaSuave([1, 3, 2], 300, 100);
  assert.match(d, /^M0 /);
  assert.match(d, / 300 \d+(\.\d)?$/);
  assert.equal(quadro.linhaSuave([], 300, 100), "");
});
