/*
  Sem imports, para os testes em `testes/` a carregarem com o `node --test`.
*/

/**
 * `JSON.stringify` com os caracteres que fecham um `<script>` escapados.
 *
 * O `JSON.stringify` sozinho não chega: um valor com `</script>` fecha a
 * etiqueta a meio e o que vem a seguir é HTML — e, com o `'unsafe-inline'` da
 * CSP pública, um script que corre. Estes ficheiros **são escritos pelo
 * painel**, e por isso "não há entrada de utilizador" deixou de ser verdade no
 * dia em que ele entrou. `\u003c` e companhia são JSON válido, e quem lê os
 * dados estruturados recebe os caracteres originais.
 */
export function jsonParaScript(valor: unknown): string {
  return JSON.stringify(valor)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
