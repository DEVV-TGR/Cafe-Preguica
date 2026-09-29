/*
  A chave dos limites por ligação (`src/lib/rede.ts`). O que interessa provar:
  dois endereços do mesmo /64 contam como um, e o que não é um endereço não
  chega ao Redis nem ao registo.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { redeDe } from "../src/lib/rede.ts";

test("um IPv4 conta tal e qual", () => {
  assert.equal(redeDe("203.0.113.7"), "203.0.113.7");
  assert.equal(redeDe(" 203.0.113.7 "), "203.0.113.7");
});

test("dois IPv6 do mesmo /64 são a mesma ligação", () => {
  const a = redeDe("2001:db8:abcd:12:1:2:3:4");
  const b = redeDe("2001:db8:abcd:12::ffff");
  const c = redeDe("2001:DB8:ABCD:0012:9:9:9:9");
  assert.equal(a, "2001:db8:abcd:12::/64");
  assert.equal(a, b);
  assert.equal(a, c);
});

test("IPv6 de /64 diferentes são ligações diferentes", () => {
  assert.notEqual(redeDe("2001:db8:abcd:12::1"), redeDe("2001:db8:abcd:13::1"));
});

test("um IPv4 escrito à maneira do IPv6 conta como IPv4", () => {
  assert.equal(redeDe("::ffff:192.0.2.1"), "192.0.2.1");
});

test("o que não é um endereço vira 'desconhecida'", () => {
  for (const lixo of [
    "",
    "desconhecida",
    "1:2:3:4:5:6:7:8:9",
    "1::2::3",
    "12345::1",
    "203.0.113.7\n[painel] linha forjada",
    "<script>",
    "a".repeat(500),
  ]) {
    assert.equal(redeDe(lixo), "desconhecida", JSON.stringify(lixo));
  }
});
