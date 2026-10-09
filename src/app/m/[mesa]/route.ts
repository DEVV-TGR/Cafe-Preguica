import { after } from "next/server";
import { mesaValida, pareceRobo } from "@/lib/mesas/contas";
import { contarLeitura } from "@/lib/mesas/leituras";

/*
  Os QR e os NFC das mesas: `/m/<mesa>` leva à carta, e conta uma leitura.

  Os QR estão impressos com `cafepreguica.pt/m/<mesa>`. Os NFC levam o mesmo
  endereço com `?nfc` no fim (`/m/7?nfc`), e é isso que os separa no painel.

  Era um `redirect` do `next.config.ts`, que não deixa contar nada. Continua a
  ser um 307 e pela mesma razão: um 308 fica guardado no telemóvel de quem já
  leu o QR, e se um dia a mesa servir para outra coisa o papel não se reimprime.

  - **A conta corre depois da resposta** (`after`): quem lê o QR não espera
    pelo Redis, e um Redis em baixo não deixa ninguém sem carta.
  - **`no-store`**: um 307 guardado na CDN da Vercel respondia às leituras
    seguintes sem passar por aqui, e elas não contavam.
  - **O `Location` é relativo**, como era o do `next.config.ts`: o mesmo QR serve
    o `.pt` e o `.com` sem saltar de um para o outro.
  - **O `/ementa` não leva `/pt`**: com `localePrefix: "as-needed"` o português
    não tem prefixo.
*/

const PARA_A_CARTA = {
  status: 307,
  headers: { Location: "/ementa", "Cache-Control": "no-store" },
} as const;

export async function GET(pedido: Request, { params }: { params: Promise<{ mesa: string }> }) {
  const mesa = mesaValida((await params).mesa);

  if (mesa !== null && !pareceRobo(pedido.headers.get("user-agent"))) {
    const origem = new URL(pedido.url).searchParams.has("nfc") ? "nfc" : "qr";
    after(async () => {
      try {
        await contarLeitura(mesa, origem);
      } catch (erro) {
        console.warn(`[mesas] leitura da mesa ${mesa} por contar:`, erro);
      }
    });
  }

  return new Response(null, PARA_A_CARTA);
}

/* Sem ele, o Next responde ao `HEAD` com o `GET` — e um `curl -I` contava. */
export function HEAD() {
  return new Response(null, PARA_A_CARTA);
}
