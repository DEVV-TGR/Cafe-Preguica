import { z } from "zod";
import { routing } from "@/i18n/routing";
import { artigosSecretos } from "@/lib/carta-secreta/artigos";
import { abrirChaveDaCarta, criarChaveDaCarta } from "@/lib/carta-secreta/chave";
import { estaInscrito, ErroDaNewsletter } from "@/lib/newsletter/resend";
import { somar, ErroDoRedis } from "@/lib/painel/redis";
import { rede } from "@/lib/painel/limites";
import { lerJson } from "@/lib/pedido";
import { EsquemaEmail } from "@/lib/email";

/*
  Abrir a carta secreta.

  Recebe **um email** (quem o escreve na secção) **ou uma chave** (o browser
  que já a abriu — ver `lib/carta-secreta/chave.ts`). Os artigos só saem daqui
  com um "sim": nunca estão no HTML da `/ementa`.

  | pedido | resposta |
  |---|---|
  | `{ email }` inscrito na newsletter | `{ aberta: true, artigos, chave }` — uma chave de sessão |
  | `{ email }` não inscrito | `{ aberta: false }` — a secção oferece a inscrição |
  | `{ chave }` válida | `{ aberta: true, artigos }` |
  | `{ chave, lembrar: true }` válida | o mesmo, e `chave`: uma nova, de 90 dias |
  | `{ chave }` `c1`, válida | o mesmo, e `chave`: uma `c2` de sessão, no lugar da antiga com email |
  | chave inventada ou caducada | `{ aberta: false }` |
  | 400 | nem email nem chave válidos |
  | 429 | mais de 10 pedidos numa hora da mesma ligação |
  | 503 | Redis ou Resend em baixo |

  ## A carta é para quem recebe as novidades — e não se perde ao cancelar

  Decisão do Tomás depois da revisão legal de 2026-10-15: a carta continua a
  ser o benefício de quem está na lista (é o que a faz apelativa), com três
  cuidados:

  - **a chave não volta a perguntar ao Resend.** Quem cancela a newsletter não
    perde a carta no browser onde já a abriu: retirar o consentimento não pode
    custar nada (RGPD, art. 7.º, n.º 3). A chave tem prazo próprio (24 horas, ou
    90 dias a pedido) e não leva o email;
  - **há uma alternativa sem email**: a secção diz que se pode pedir a carta ao
    balcão;
  - a inscrição fica com prova do consentimento (`lib/newsletter/consentimento.ts`).

  O risco que sobra — a CNPD critica condicionar conteúdos ao consentimento
  para marketing (Diretriz 1/2022, § 70) — é uma decisão assumida, escrita em
  `docs/decisoes-pendentes.md`.

  ## O limite, e porquê

  A resposta a um email diz se ele está na lista — é essa a função disto. Sem
  limite, era também uma forma de alguém testar uma lista de endereços e saber
  quem recebe a newsletter da casa. Dez por hora chega para uma mesa inteira,
  cada um com o seu telemóvel, e não chega para mais nada.
*/

const Pedido = z.union([
  z.object({
    email: EsquemaEmail,
    lingua: z.enum(routing.locales).catch(routing.defaultLocale),
  }),
  z.object({
    chave: z.string().max(1000),
    lembrar: z.boolean().optional(),
    lingua: z.enum(routing.locales).catch(routing.defaultLocale),
  }),
]);

const POR_IP = 10;
const HORA_S = 60 * 60;

export async function POST(pedido: Request) {
  const corpo = await lerJson(pedido);
  if (!corpo.ok) {
    if (corpo.estado === 415) return Response.json({ erro: "formato" }, { status: 415 });
    if (corpo.estado === 413) return Response.json({ erro: "tamanho" }, { status: 413 });
  }

  const lido = Pedido.safeParse(corpo.ok ? corpo.valor : null);
  if (!lido.success) return Response.json({ erro: "email" }, { status: 400 });
  const { lingua } = lido.data;

  try {
    if ((await somar(`carta:ip:${await rede()}`, HORA_S)) > POR_IP) {
      return Response.json({ erro: "limite" }, { status: 429 });
    }

    if ("email" in lido.data) {
      if (!(await estaInscrito(lido.data.email))) return Response.json({ aberta: false });
      return Response.json({
        aberta: true,
        artigos: artigosSecretos(lingua),
        chave: await criarChaveDaCarta(false),
      });
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
      artigos: artigosSecretos(lingua),
      ...(nova ? { chave: nova } : {}),
    });
  } catch (erro) {
    if (erro instanceof ErroDoRedis || erro instanceof ErroDaNewsletter) {
      if (erro instanceof ErroDoRedis) console.error(`[carta-secreta] ${erro.message}`);
      return Response.json({ erro: "servico" }, { status: 503 });
    }
    throw erro;
  }
}
