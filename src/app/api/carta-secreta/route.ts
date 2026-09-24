import { z } from "zod";
import { routing } from "@/i18n/routing";
import { artigosSecretos } from "@/lib/carta-secreta/artigos";
import { abrirChaveDaCarta, criarChaveDaCarta } from "@/lib/carta-secreta/chave";
import { estaInscrito, ErroDaNewsletter } from "@/lib/newsletter/resend";
import { somar, ErroDoRedis } from "@/lib/painel/redis";
import { origem } from "@/lib/painel/limites";

/*
  Abrir a carta secreta: está inscrito na newsletter, ou não está?

  Recebe **um email** (quem o escreve na secção) **ou uma chave** (o telemóvel
  que já abriu antes — ver `lib/carta-secreta/chave.ts`). Nos dois casos quem
  responde é o Resend, e os artigos só saem daqui se ele disser que sim: nunca
  estão no HTML da `/ementa`.

  | resposta | quando |
  |---|---|
  | `{ aberta: true, artigos, chave }` | inscrito — a chave é para o telemóvel guardar |
  | `{ aberta: false }` | não inscrito, ou chave inventada, caducada, ou de quem cancelou |
  | 400 | nem email nem chave válidos |
  | 429 | mais de 10 pedidos numa hora da mesma ligação |
  | 503 | Redis ou Resend em baixo |

  ## O limite, e porquê

  A resposta diz se um email está na lista — é essa a função disto. Sem limite,
  era também uma forma de alguém testar uma lista de endereços e saber quem
  recebe a newsletter da casa. Dez por hora chega para uma mesa inteira, cada
  um com o seu telemóvel, e não chega para mais nada.
*/

const Pedido = z.union([
  z.object({
    email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
    lingua: z.enum(routing.locales).catch(routing.defaultLocale),
  }),
  z.object({
    chave: z.string().max(1000),
    lingua: z.enum(routing.locales).catch(routing.defaultLocale),
  }),
]);

const POR_IP = 10;
const HORA_S = 60 * 60;

export async function POST(pedido: Request) {
  if (!pedido.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ erro: "formato" }, { status: 415 });
  }

  const lido = Pedido.safeParse(await pedido.json().catch(() => null));
  if (!lido.success) return Response.json({ erro: "email" }, { status: 400 });

  try {
    if ((await somar(`carta:ip:${await origem()}`, HORA_S)) > POR_IP) {
      return Response.json({ erro: "limite" }, { status: 429 });
    }

    const email = "email" in lido.data ? lido.data.email : await abrirChaveDaCarta(lido.data.chave);
    if (!email || !(await estaInscrito(email))) return Response.json({ aberta: false });

    return Response.json({
      aberta: true,
      artigos: artigosSecretos(lido.data.lingua),
      chave: await criarChaveDaCarta(email),
    });
  } catch (erro) {
    if (erro instanceof ErroDoRedis || erro instanceof ErroDaNewsletter) {
      if (erro instanceof ErroDoRedis) console.error(`[carta-secreta] ${erro.message}`);
      return Response.json({ erro: "servico" }, { status: 503 });
    }
    throw erro;
  }
}
