import "server-only";
import { headers } from "next/headers";
import {
  apagar,
  guardarAte,
  juntarAoConjunto,
  lerConjunto,
  lerHashDeTexto,
  lerVarias,
  tirarDoConjunto,
} from "./redis";
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
  poder **terminar a sessão** dele. Um registo por aparelho, com o `id` do
  aparelho (o mesmo da chave `aparelho:<id>` de `lib/painel/sessao.ts`).

  ## Um aparelho, uma sessão

  Uma entrada nova num aparelho apaga a sessão que ele tinha antes. Assim o
  registo diz sempre a verdade sobre o que está aberto, e terminar um aparelho
  é apagar duas chaves que se sabem quais são — sem andar à procura.

  ## Cada registo morre sozinho

  Já foi um hash só (`painel:aparelhos`), sem prazo, que quem lia ia limpando
  (revisão legal de 2026-10-15): se ninguém abrisse a página das Sessões, o
  email e o aparelho de quem deixou de entrar ficavam lá para sempre.

  Agora cada aparelho é uma chave `painel:aparelhos:<id>` com hora de morte
  absoluta — o fim do aparelho lembrado (30 dias depois do código) ou, quando
  quem entrou não pediu para o lembrar, o fim da sessão (8 horas). O conjunto
  `painel:aparelhos:ids` guarda só os `id`s, para se saber que chaves ler; os
  que o Redis já apagou saem dele à leitura seguinte, e o conjunto inteiro
  morre 30 dias depois da última entrada.
*/

const PREFIXO = "painel:aparelhos:";
const INDICE = "painel:aparelhos:ids";
/** O hash de antes — migra-se e apaga-se à primeira leitura deste código. */
const HASH_ANTIGO = "painel:aparelhos";
const PRAZO_DO_INDICE_S = VALIDADE_APARELHO_MS / 1000;

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
  /** Quem entrou pediu para lembrar o aparelho. Registos de antes disto não
      trazem o campo, e eram todos lembrados. */
  lembrado?: boolean;
  /** Até quando o aparelho entra sem código — ou, sem ser lembrado, até
      quando o registo existe (o fim da sessão). */
  lembradoAte: number;
};

async function gravar(registo: Aparelho): Promise<void> {
  await guardarAte(`${PREFIXO}${registo.id}`, JSON.stringify(registo), registo.lembradoAte);
  await juntarAoConjunto(INDICE, registo.id, PRAZO_DO_INDICE_S);
}

async function esquecerRegisto(id: string): Promise<void> {
  await apagar(`${PREFIXO}${id}`);
  await tirarDoConjunto(INDICE, [id]);
}

function lerRegisto(texto: string | null): Aparelho | null {
  if (!texto) return null;
  try {
    return JSON.parse(texto) as Aparelho;
  } catch {
    return null;
  }
}

/* O hash antigo passa para chaves com prazo. As linhas já vencidas não
   passam: morrem com o hash. Depois da primeira vez, é um `HGETALL` vazio. */
async function migrarHashAntigo(): Promise<void> {
  const textos = Object.values(await lerHashDeTexto(HASH_ANTIGO));
  if (textos.length === 0) return;
  const vivas = textos
    .map(lerRegisto)
    .filter((a): a is Aparelho => !!a && a.lembradoAte > Date.now());
  for (const a of vivas) await gravar({ ...a, lembrado: a.lembrado ?? true });
  await apagar(HASH_ANTIGO);
}

async function linhas(): Promise<Aparelho[]> {
  await migrarHashAntigo();
  const ids = await lerConjunto(INDICE);
  const textos = await lerVarias(ids.map((id) => `${PREFIXO}${id}`));
  const mortos = ids.filter((_, i) => textos[i] === null);
  await tirarDoConjunto(INDICE, mortos);
  return textos.map(lerRegisto).filter((a): a is Aparelho => !!a);
}

async function linha(id: string): Promise<Aparelho | null> {
  await migrarHashAntigo();
  return lerRegisto((await lerVarias([`${PREFIXO}${id}`]))[0]);
}

/**
 * Uma entrada neste aparelho: com o código (`novo`, que começa os 30 dias do
 * aparelho lembrado) ou pelo aparelho lembrado. `lembrado: false` é quem
 * entrou com o código sem pedir para lembrar o aparelho — o registo dura o
 * mesmo que a sessão.
 */
export async function registarEntrada(
  id: string,
  email: string,
  sessao: string,
  novo: boolean,
  lembrado = true,
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
    lembrado,
    lembradoAte: !lembrado
      ? agora + VALIDADE_MS
      : novo || !antes
        ? agora + VALIDADE_APARELHO_MS
        : antes.lembradoAte,
  };
  await gravar(registo);
}

/** Os aparelhos que ainda entram, da entrada mais recente para a mais antiga. */
export async function aparelhosComAcesso(): Promise<Aparelho[]> {
  const agora = Date.now();
  return (await linhas())
    .filter((a) => a.lembradoAte >= agora)
    .sort((a, b) => b.ultimaEntrada - a.ultimaEntrada);
}

/** Sair: fecha a sessão deste aparelho, que continua lembrado — se o era. */
export async function fecharSessao(id: string, sessao: string): Promise<void> {
  await apagar(chaveDaSessao(sessao));
  const registo = await linha(id);
  if (registo?.sessao !== sessao) return;
  /* Sem ser lembrado e sem sessão, o aparelho já não tem nada para dizer. */
  if (registo.lembrado === false) return esquecerRegisto(id);
  await gravar({ ...registo, sessao: null, sessaoAte: null });
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
  await esquecerRegisto(id);
  return registo;
}
