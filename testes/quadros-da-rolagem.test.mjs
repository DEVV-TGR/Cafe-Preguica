import { test } from "node:test";
import assert from "node:assert/strict";
import { quadrosDaDeixa, quadrosDaInteracao } from "../src/lib/quadros-da-rolagem.ts";

const SUAVE = "cubic-bezier(0.333333,0,0.666667,1)";

test("uma deixa de entrada mantém a fotografia depois da rampa", () => {
  assert.deepEqual(quadrosDaDeixa("0.04"), [
    { offset: 0, opacity: 0, transform: "translate3d(0,2.4vh,0)", easing: "linear" },
    { offset: 0.04, opacity: 0, transform: "translate3d(0,2.4vh,0)", easing: SUAVE },
    { offset: 0.22, opacity: 1, transform: "translate3d(0,0vh,0)", easing: "linear" },
    { offset: 1, opacity: 1, transform: "translate3d(0,0vh,0)", easing: "linear" },
  ]);
});

test("uma janela distribui as rampas e mantém um patamar no meio", () => {
  assert.deepEqual(quadrosDaDeixa("0.2 0.6 0.25 0.25"), [
    { offset: 0, opacity: 0, transform: "translate3d(0,2.4vh,0)", easing: "linear" },
    { offset: 0.2, opacity: 0, transform: "translate3d(0,2.4vh,0)", easing: SUAVE },
    { offset: 0.3, opacity: 1, transform: "translate3d(0,0vh,0)", easing: "linear" },
    { offset: 0.5, opacity: 1, transform: "translate3d(0,0vh,0)", easing: SUAVE },
    { offset: 0.6, opacity: 0, transform: "translate3d(0,2.4vh,0)", easing: "linear" },
    { offset: 1, opacity: 0, transform: "translate3d(0,2.4vh,0)", easing: "linear" },
  ]);
});

test("uma janela sem rampas está visível nos dois extremos da rolagem", () => {
  assert.deepEqual(quadrosDaDeixa("0 1 0 0"), [
    { offset: 0, opacity: 1, transform: "translate3d(0,0vh,0)", easing: "linear" },
    { offset: 1, opacity: 1, transform: "translate3d(0,0vh,0)", easing: "linear" },
  ]);
});

test("as rampas omitidas ocupam trinta por cento da janela", () => {
  assert.deepEqual(quadrosDaDeixa("0 1"), [
    { offset: 0, opacity: 0, transform: "translate3d(0,2.4vh,0)", easing: SUAVE },
    { offset: 0.3, opacity: 1, transform: "translate3d(0,0vh,0)", easing: "linear" },
    { offset: 0.7, opacity: 1, transform: "translate3d(0,0vh,0)", easing: SUAVE },
    { offset: 1, opacity: 0, transform: "translate3d(0,2.4vh,0)", easing: "linear" },
  ]);
});

test("entrada instantânea não introduz um quadro invisível na origem", () => {
  assert.deepEqual(quadrosDaDeixa("0 1 0 0.25"), [
    { offset: 0, opacity: 1, transform: "translate3d(0,0vh,0)", easing: "linear" },
    { offset: 0.75, opacity: 1, transform: "translate3d(0,0vh,0)", easing: SUAVE },
    { offset: 1, opacity: 0, transform: "translate3d(0,2.4vh,0)", easing: "linear" },
  ]);
});

test("saída instantânea conserva o último quadro visível", () => {
  assert.deepEqual(quadrosDaDeixa("0 1 0.25 0"), [
    { offset: 0, opacity: 0, transform: "translate3d(0,2.4vh,0)", easing: SUAVE },
    { offset: 0.25, opacity: 1, transform: "translate3d(0,0vh,0)", easing: "linear" },
    { offset: 1, opacity: 1, transform: "translate3d(0,0vh,0)", easing: "linear" },
  ]);
});

test("sem início válido a entrada começa em zero e continua até ao fim", () => {
  assert.deepEqual(quadrosDaDeixa(""), [
    { offset: 0, opacity: 0, transform: "translate3d(0,2.4vh,0)", easing: SUAVE },
    { offset: 0.18, opacity: 1, transform: "translate3d(0,0vh,0)", easing: "linear" },
    { offset: 1, opacity: 1, transform: "translate3d(0,0vh,0)", easing: "linear" },
  ]);
});

test("a subida afina o deslocamento sem mudar a opacidade", () => {
  const quadros = quadrosDaDeixa("0.04", 0.5);
  assert.deepEqual(quadros.map(({ opacity }) => opacity), [0, 0, 1, 1]);
  assert.deepEqual(quadros.map(({ transform }) => transform), [
    "translate3d(0,1.2vh,0)",
    "translate3d(0,1.2vh,0)",
    "translate3d(0,0vh,0)",
    "translate3d(0,0vh,0)",
  ]);
});

test("as trocas instantâneas no interior mantêm os quadros dos dois lados", () => {
  assert.deepEqual(quadrosDaDeixa("0.2 0.6 0 0").map(({ offset, opacity }) => [offset, opacity]), [
    [0, 0], [0.2, 0], [0.2, 1], [0.6, 1], [0.6, 0], [1, 0],
  ]);
});

test("uma entrada que atravessa o fim da rolagem conserva a opacidade parcial", () => {
  const quadros = quadrosDaDeixa("0.91");
  assert.deepEqual(quadros.map(({ offset }) => offset), [0, 0.91, 1]);
  assert.equal(quadros.at(-1).opacity, 0.5);
  assert.equal(quadros.at(-1).transform, "translate3d(0,1.2vh,0)");
});

test("o link de uma entrada só responde depois de metade da opacidade", () => {
  const quadros = quadrosDaInteracao("0.04");
  assert.deepEqual(quadros.map(({ pointerEvents }) => pointerEvents), ["none", "auto", "auto"]);
  assert.deepEqual([quadros[0].offset, quadros[2].offset], [0, 1]);
  assert.equal(quadros[1].offset, 0.13);
  assert.equal(quadros[0].easing, "steps(1,end)");
});

test("a janela abre e fecha a interação nos dois limiares de opacidade", () => {
  const quadros = quadrosDaInteracao("0.2 0.6 0.25 0.25");
  assert.deepEqual(quadros.map(({ pointerEvents }) => pointerEvents), ["none", "auto", "none", "none"]);
  assert.equal(quadros[1].offset, 0.25);
  assert.equal(quadros[2].offset, 0.55);
  assert.equal(quadros[0].easing, "steps(1,end)");
  assert.equal(quadros[1].easing, "steps(1,end)");
});

test("uma janela sempre visível deixa os links ativos nos dois extremos", () => {
  assert.deepEqual(quadrosDaInteracao("0 1 0 0"), [
    { offset: 0, pointerEvents: "auto", easing: "linear" },
    { offset: 1, pointerEvents: "auto", easing: "linear" },
  ]);
});

test("uma entrada parcial acima de metade ativa o link antes do fim", () => {
  const quadros = quadrosDaInteracao("0.90");
  assert.deepEqual(quadros.map(({ pointerEvents }) => pointerEvents), ["none", "auto", "auto"]);
  assert.equal(quadros[1].offset, 0.99);
  assert.equal(quadros[2].offset, 1);
});

test("uma entrada que só chega a metade no fim conserva o link inativo", () => {
  assert.deepEqual(quadrosDaInteracao("0.91"), [
    { offset: 0, pointerEvents: "none", easing: "linear" },
    { offset: 1, pointerEvents: "none", easing: "linear" },
  ]);
});
