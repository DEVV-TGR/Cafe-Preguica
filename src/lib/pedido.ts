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

export const TETO_DO_CORPO = 4 * 1024;

export type Lido =
  | { ok: true; valor: unknown }
  | { ok: false; estado: 400 | 413 | 415 };

export async function lerJson(pedido: Request, teto = TETO_DO_CORPO): Promise<Lido> {
  if (!pedido.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return { ok: false, estado: 415 };
  }

  /* O `Content-Length` é do cliente e pode mentir, por isso é só o atalho: o
     teto a sério é o do texto lido, logo a seguir. */
  const declarado = Number(pedido.headers.get("content-length") ?? 0);
  if (declarado > teto) return { ok: false, estado: 413 };

  const texto = await pedido.text().catch(() => null);
  if (texto === null) return { ok: false, estado: 400 };
  if (texto.length > teto) return { ok: false, estado: 413 };

  try {
    return { ok: true, valor: JSON.parse(texto) };
  } catch {
    return { ok: false, estado: 400 };
  }
}
