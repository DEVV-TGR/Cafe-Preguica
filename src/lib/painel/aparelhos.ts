import "server-only";
import { headers } from "next/headers";
import { apagar, apagarDoHash, guardarNoHash, lerHashDeTexto } from "./redis";
import {
  chaveDaSessao,
  esquecerAparelho,
  VALIDADE_APARELHO_MS,
  VALIDADE_MS,
} from "./sessao";
import { aparelhoDe } from "./entradas";

/*
  Os aparelhos que entram no painel, e a sessão que cada um tem aberta.

  Pedido do Tomás (2026-10-11): na página das Sessões, ver cada aparelho e
  poder **terminar a sessão** dele. Uma linha por aparelho no hash
  `painel:aparelhos`, com o `id` do aparelho como campo (o mesmo da chave
  `aparelho:<id>` de `lib/painel/sessao.ts`).

  ## Um aparelho, uma sessão

  Uma entrada nova num aparelho apaga a sessão que ele tinha antes. Assim o
  registo diz sempre a verdade sobre o que está aberto, e terminar um aparelho
  é apagar duas chaves que se sabem quais são — sem andar à procura.

  ## As linhas velhas limpam-se ao ler

  O hash não tem prazo por campo. Quem lê (`aparelhosComAcesso`) tira as linhas
  de aparelhos que já não entram sem código, e é o que chega para duas pessoas.
*/

const CHAVE = "painel:aparelhos";

export type Aparelho = {
  id: string;
  email: string;
  /** "iPhone · Safari", da última entrada. */
  aparelho: string;
  desde: number;
  ultimaEntrada: number;
  /** A sessão aberta neste aparelho, e até quando vale; `null` depois de sair. */
  sessao: string | null;
  sessaoAte: number | null;
  /** Até quando o aparelho entra sem código. */
  lembradoAte: number;
};

async function linhas(): Promise<Aparelho[]> {
  return Object.values(await lerHashDeTexto(CHAVE)).flatMap((texto) => {
    try {
      return [JSON.parse(texto) as Aparelho];
    } catch {
      return [];
    }
  });
}

async function linha(id: string): Promise<Aparelho | null> {
  return (await linhas()).find((a) => a.id === id) ?? null;
}

/**
 * Uma entrada neste aparelho: com o código (`novo`, que começa os 30 dias do
 * aparelho lembrado) ou pelo aparelho lembrado.
 */
export async function registarEntrada(
  id: string,
  email: string,
  sessao: string,
  novo: boolean,
): Promise<void> {
  const agora = Date.now();
  const antes = await linha(id);
  if (antes?.sessao && antes.sessao !== sessao) await apagar(chaveDaSessao(antes.sessao));

  const registo: Aparelho = {
    id,
    email,
    aparelho: aparelhoDe((await headers()).get("user-agent")),
    desde: novo || !antes ? agora : antes.desde,
    ultimaEntrada: agora,
    sessao,
    sessaoAte: agora + VALIDADE_MS,
    lembradoAte: novo || !antes ? agora + VALIDADE_APARELHO_MS : antes.lembradoAte,
  };
  await guardarNoHash(CHAVE, id, JSON.stringify(registo));
}

/** Os aparelhos que ainda entram, da entrada mais recente para a mais antiga. */
export async function aparelhosComAcesso(): Promise<Aparelho[]> {
  const agora = Date.now();
  const todos = await linhas();
  const vencidos = todos.filter((a) => a.lembradoAte < agora);
  await Promise.all(vencidos.map((a) => apagarDoHash(CHAVE, a.id)));
  return todos
    .filter((a) => a.lembradoAte >= agora)
    .sort((a, b) => b.ultimaEntrada - a.ultimaEntrada);
}

/** Sair: fecha a sessão deste aparelho, que continua lembrado. */
export async function fecharSessao(id: string, sessao: string): Promise<void> {
  await apagar(chaveDaSessao(sessao));
  const registo = await linha(id);
  if (registo?.sessao === sessao) {
    await guardarNoHash(CHAVE, id, JSON.stringify({ ...registo, sessao: null, sessaoAte: null }));
  }
}

/**
 * Terminar a sessão de um aparelho — este ou outro. Fecha a sessão **e**
 * esquece o aparelho: da próxima vez, nesse aparelho, pede-se o código. Sem a
 * segunda parte, o aparelho lembrado entrava outra vez sozinho e terminar não
 * terminava nada.
 */
export async function terminarAparelho(id: string): Promise<Aparelho | null> {
  const registo = await linha(id);
  if (registo?.sessao) await apagar(chaveDaSessao(registo.sessao));
  await esquecerAparelho(id);
  await apagarDoHash(CHAVE, id);
  return registo;
}
