import "server-only";
import type { Locale } from "@/i18n/routing";
import { artigosDaCartaSecreta } from "@/data/ementa";

/*
  O que está na carta secreta: os cocktails que o painel pôs na lista
  `secretos` do `ementa.json` (ver `EsquemaEmenta`), já na língua pedida.

  ## Porque é que isto só corre no servidor

  A `/ementa` é estática, e o que ela põe no HTML qualquer pessoa lê no código
  da página. Estes artigos só saem do servidor pela `/api/carta-secreta`, depois
  de o Resend confirmar que o email está inscrito. O `server-only` faz o build
  rebentar se algum componente do browser importar este ficheiro.

  (O repositório é público, e o `ementa.json` também — o segredo é "de bar",
  não de cofre. Ver `docs/NEWSLETTER.md`.)
*/

export type ArtigoSecreto = { id: string; nome: string; descricao: string; preco: number | null };

/** Os artigos já na língua pedida — é assim que seguem para o browser. */
export function artigosSecretos(lingua: Locale): ArtigoSecreto[] {
  return artigosDaCartaSecreta().map(({ id, nome, descricao, preco }) => ({
    id,
    nome: nome[lingua],
    descricao: descricao?.[lingua] ?? "",
    preco,
  }));
}
