/*
  Ler o corpo JSON de um pedido às rotas públicas (`/api/*`), com teto.

  ## Porquê um teto, se o `zod` já corta o email aos 254 caracteres

  Porque o `zod` só corre **depois** de o corpo inteiro estar lido e passado
  pelo `JSON.parse`. Sem teto, um pedido de vários megabytes é lido, analisado
  e posto em memória antes de alguém lhe dizer que não — e as rotas são
  públicas, sem sessão. O maior pedido legítimo é o da confirmação, com o
  convite assinado lá dentro, e não passa de umas centenas de bytes.

  ## Porquê exigir `application/json`

  Um `<form>` de outro site pode fazer um POST para aqui sem pedir licença,
  mas só com os três tipos "simples" (`text/plain`, `multipart/form-data`,
  `application/x-www-form-urlencoded`). Exigir JSON obriga o browser a
  perguntar primeiro (CORS), e como não há CORS aberto, a resposta é não.

  Sem imports, para os testes em `testes/` a carregarem com o `node --test`.
*/

/** Em bytes, e não em caracteres: um "ã" são dois bytes em UTF-8. */
export const TETO_DO_CORPO = 4 * 1024;

export type Lido =
  | { ok: true; valor: unknown }
  | { ok: false; estado: 400 | 413 | 415 };

export async function lerJson(pedido: Request, teto = TETO_DO_CORPO): Promise<Lido> {
  if (!pedido.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return { ok: false, estado: 415 };
  }

  /* O `Content-Length` é do cliente e pode mentir, por isso é só o atalho: o
     teto a sério é o dos bytes lidos, logo a seguir. */
  const declarado = Number(pedido.headers.get("content-length") ?? 0);
  if (declarado > teto) return { ok: false, estado: 413 };

  const bytes = await lerAteAoTeto(pedido, teto);
  if (bytes === "grande") return { ok: false, estado: 413 };
  if (bytes === null) return { ok: false, estado: 400 };

  try {
    /* `fatal`: bytes que não são UTF-8 válido são um pedido partido, e não
       texto com caracteres de substituição lá dentro. */
    const texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, valor: JSON.parse(texto) };
  } catch {
    return { ok: false, estado: 400 };
  }
}

/*
  Lê o corpo aos bocados e pára no primeiro byte a mais.

  Um `pedido.text()` lia o corpo inteiro antes de se poder medir — era o
  tamanho que o teto existe para recusar. Assim, o que fica em memória nunca
  passa do teto mais um bocado, e o resto do corpo nem chega a ser lido.
*/
async function lerAteAoTeto(pedido: Request, teto: number): Promise<Uint8Array | "grande" | null> {
  if (!pedido.body) return new Uint8Array();

  const leitor = pedido.body.getReader();
  const bocados: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.byteLength;
      if (total > teto) {
        await leitor.cancel().catch(() => {});
        return "grande";
      }
      bocados.push(value);
    }
  } catch {
    return null;
  }

  const bytes = new Uint8Array(total);
  let posicao = 0;
  for (const bocado of bocados) {
    bytes.set(bocado, posicao);
    posicao += bocado.byteLength;
  }
  return bytes;
}
