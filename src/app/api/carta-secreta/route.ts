import { z } from "zod";
import { routing } from "@/i18n/routing";
import { artigosSecretos } from "@/lib/carta-secreta/artigos";
import { abrirChaveDaCarta, criarChaveDaCarta } from "@/lib/carta-secreta/chave";
import { somar, ErroDoRedis } from "@/lib/painel/redis";
import { rede } from "@/lib/painel/limites";
import { lerJson } from "@/lib/pedido";

/*
  Abrir a carta secreta com a chave que o browser guardou.

  A chave nasce na confirmação do email (`/api/newsletter/confirmar`) e diz só
  que este browser confirmou um email — ver `lib/carta-secreta/chave.ts`. Os
  artigos só saem daqui com uma chave válida: nunca estão no HTML da `/ementa`.

  **Já não recebe um email, e já não pergunta ao Resend.** Até à revisão legal
  de 2026-10-15, um email inscrito abria a carta sem mais nada, e uma chave só
  valia enquanto a pessoa recebesse a newsletter. A carta deixou de depender do
  marketing; e deixar de aceitar um email solto tirou também a forma de alguém
  descobrir quem está na lista escrevendo endereços aqui.

  | pedido | resposta |
  |---|---|
  | `{ chave }` válida | `{ aberta: true, artigos }` |
  | `{ chave, lembrar: true }` válida | o mesmo, e `chave`: uma nova, de 90 dias, para o `localStorage` |
  | `{ chave }` `c1`, válida | o mesmo, e `chave`: uma `c2` de sessão, no lugar da antiga com email |
  | chave inventada ou caducada | `{ aberta: false }` |
  | 400 | sem chave |
  | 429 | mais de 30 pedidos numa hora da mesma ligação |
  | 503 | Redis em baixo |

  O limite fica, mais largo: já não protege uma lista de emails, protege só o
  servidor de quem repita pedidos sem parar.
*/

const Pedido = z.object({
  chave: z.string().max(1000),
  lembrar: z.boolean().optional(),
  lingua: z.enum(routing.locales).catch(routing.defaultLocale),
});

const POR_IP = 30;
const HORA_S = 60 * 60;

export async function POST(pedido: Request) {
  const corpo = await lerJson(pedido);
  if (!corpo.ok) {
    if (corpo.estado === 415) return Response.json({ erro: "formato" }, { status: 415 });
    if (corpo.estado === 413) return Response.json({ erro: "tamanho" }, { status: 413 });
  }

  const lido = Pedido.safeParse(corpo.ok ? corpo.valor : null);
  if (!lido.success) return Response.json({ erro: "chave" }, { status: 400 });

  try {
    if ((await somar(`carta:ip:${await rede()}`, HORA_S)) > POR_IP) {
      return Response.json({ erro: "limite" }, { status: 429 });
    }

    const aberta = await abrirChaveDaCarta(lido.data.chave);
    if (!aberta) return Response.json({ aberta: false });

    /* Uma chave nova só quando é preciso: a pessoa pediu para lembrar, ou a
       chave ainda é das antigas, com email. Abrir não renova o prazo. */
    const nova =
      lido.data.lembrar === true
        ? await criarChaveDaCarta(true)
        : aberta.versao === "c1"
          ? await criarChaveDaCarta(false)
          : undefined;

    return Response.json({
      aberta: true,
      artigos: artigosSecretos(lido.data.lingua),
      ...(nova ? { chave: nova } : {}),
    });
  } catch (erro) {
    if (erro instanceof ErroDoRedis) {
      console.error(`[carta-secreta] ${erro.message}`);
      return Response.json({ erro: "servico" }, { status: 503 });
    }
    throw erro;
  }
}
