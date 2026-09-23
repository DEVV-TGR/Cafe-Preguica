import { connection } from "next/server";
import { sessao } from "@/lib/painel/porta";

/**
 * Que versão do site está no ar, neste instante.
 *
 * Responde à pergunta que se faz a seguir a gravar: *"já apareceu?"*. O painel
 * guarda o sha do commit que acabou de fazer e pergunta aqui de dez em dez
 * segundos; quando os dois coincidem, a alteração está no ar.
 *
 * Não se pergunta à API da Vercel porque isso exigia um `VERCEL_TOKEN`, que tem
 * acesso a **todos** os projetos da conta. O `VERCEL_GIT_COMMIT_SHA` é posto
 * pela própria plataforma; fora da Vercel não existe, a resposta é `null`, e o
 * painel diz que não sabe em vez de esperar para sempre.
 */
export async function GET() {
  /* Sem isto o Next gerava a rota no build, com o sha congelado para sempre. */
  await connection();

  if (!(await sessao())) {
    return Response.json({ erro: "Sem sessão." }, { status: 401 });
  }

  return Response.json(
    { sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
