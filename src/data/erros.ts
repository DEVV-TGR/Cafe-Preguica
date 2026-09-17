import type { ZodError } from "zod";

/**
 * Transforma os erros do `zod` em linhas que dizem **qual é o artigo**, e não só
 * qual é o índice do array.
 *
 * O `z.prettifyError` escreve `→ at artigos[17].preco`, e num ficheiro editado à
 * mão isso obriga a contar chavetas. A mensagem que interessa a quem está a
 * corrigir é `[17] "Tosta mista" → preco`, e o índice fica lá na mesma para quem
 * quiser saltar direto à linha.
 *
 * `dados` é o array dos registos, quando existe — é de lá que sai o nome. Num
 * ficheiro que é um objeto e não um array (o `cafe.json`, o `marca.json`),
 * passa-se `null` e a mensagem fica só com o caminho, que aí já chega.
 */
export function erroDeFicheiro(
  ficheiro: string,
  erro: ZodError,
  dados: unknown,
): Error {
  const registos = Array.isArray(dados) ? dados : null;

  const linhas = erro.issues.map((problema) => {
    /* O índice não está sempre no início do caminho: num ficheiro com o array
       dentro de um objeto, o `zod` devolve `["artigos", 12, "descricao"]`.
       Procurar o primeiro segmento numérico serve as duas formas. */
    const posicao = problema.path.findIndex((s) => typeof s === "number");
    const indice = posicao === -1 ? null : (problema.path[posicao] as number);
    const resto = posicao === -1 ? [] : problema.path.slice(posicao + 1);

    const registo =
      indice !== null && registos
        ? (registos[indice] as
            | { nome?: string | { pt?: string }; id?: string }
            | undefined)
        : null;

    const nome =
      typeof registo?.nome === "string" ? registo.nome : registo?.nome?.pt;
    const etiqueta = nome ?? registo?.id;

    const onde =
      indice === null
        ? problema.path.join(".")
        : `[${indice}]${etiqueta ? ` "${etiqueta}"` : ""}${
            resto.length > 0 ? ` → ${resto.join(".")}` : ""
          }`;

    return `  ✖ ${onde}: ${problema.message}`;
  });

  return new Error(`${ficheiro} inválido:\n${linhas.join("\n")}`);
}
