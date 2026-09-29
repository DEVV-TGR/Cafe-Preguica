/*
  Deixa o `node --test` carregar os módulos do painel tal como estão.

  Os ficheiros de `src/` foram escritos para o bundler do Next: importam
  `@/lib/…`, importam `./redis` sem extensão, e importam `server-only` e
  `next/headers`, que fora do Next não fazem sentido. Este carregador resolve os
  dois primeiros para os `.ts` verdadeiros e troca os dois últimos por versões
  mínimas (`testes/apoio/`). O código testado é o de produção, sem cópias.

  Usa-se com `node --import ./testes/apoio/carregador.mjs` (ver o script
  `testes` do `package.json`).
*/
import { register } from "node:module";

register("./resolvedor.mjs", import.meta.url);
