import "server-only";
import { createHash } from "node:crypto";
import { somar } from "@/lib/painel/redis";
import { origem } from "@/lib/painel/limites";
import { meioEscondido } from "@/lib/painel/utilizadores";

/*
  Quantos emails de confirmação o pop-up pode mandar.

  O formulário é público e manda um email a quem lá se escrever — é exactamente
  o tipo de coisa que um script usa para encher a caixa de alguém, ou para gastar
  a quota do Resend numa tarde. Três limites, pela mesma lógica dos do painel
  (`lib/painel/limites.ts`):

  | limite | quanto | porquê |
  |---|---|---|
  | por email | 2 em 24 h | quem não recebeu pode pedir outra vez; mais do que isso é alguém a insistir num endereço que não é o seu |
  | por IP | 5 por hora | uma mesa de amigos a inscrever-se no mesmo wi-fi passa; um script não |
  | ao todo | 30 por dia | o teto que os outros dois não veem |

  ## O teto de 30 existe por causa da conta partilhada

  Enquanto a newsletter usar a conta do Resend da agência, a quota de 100 envios
  por dia é a mesma dos códigos do painel, que têm o seu próprio teto de 40.
  30 + 40 fica abaixo dos 100, e um ataque ao pop-up nunca deixa o Rafael à porta
  do painel. Quando a newsletter passar para a conta dele, o número pode subir.
*/

const HORA_S = 60 * 60;
const DIA_S = 24 * HORA_S;

const POR_EMAIL = 2;
const POR_IP = 5;
const TETO_DIARIO = 30;

/* Em hash, como os do painel: quem abrir o Redis não fica com uma lista de
   endereços de quem tentou inscrever-se. */
function chaveDoEmail(email: string): string {
  const digest = createHash("sha256").update(email).digest("hex");
  return `newsletter:pedidos:${digest.slice(0, 32)}`;
}

export async function podeConvidar(email: string): Promise<boolean> {
  const ip = await origem();
  const [porEmail, porIp, noDia] = await Promise.all([
    somar(chaveDoEmail(email), DIA_S),
    somar(`newsletter:ip:${ip}`, HORA_S),
    somar(`newsletter:dia:${new Date().toISOString().slice(0, 10)}`, DIA_S),
  ]);

  if (noDia > TETO_DIARIO) {
    console.warn(
      `[newsletter] teto diário de confirmações esgotado (${noDia}) — ${meioEscondido(email)} — de ${ip}`,
    );
    return false;
  }

  if (porEmail > POR_EMAIL || porIp > POR_IP) {
    console.warn(`[newsletter] limite de pedidos — ${meioEscondido(email)} — de ${ip}`);
    return false;
  }

  return true;
}
