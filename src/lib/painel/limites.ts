import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { somar } from "./redis";
import { meioEscondido } from "./utilizadores";

/*
  Quantas vezes se pode pedir um código, e de onde.

  Sem password, isto deixou de ser defesa em profundidade e passou a ser **a**
  defesa. Um código de seis algarismos são um milhão de hipóteses; sem limites,
  um script testa-as numa tarde.

  ## Os dois limites, e porque é preciso os dois

  **Por código, 5 tentativas** (essa contagem vive no `lib/painel/codigo.ts`,
  ao lado do próprio código). Reduz a janela de um milhão para cinco.

  **Por email, 3 pedidos em 15 minutos.** Sem este, o anterior não vale nada:
  quem ataca faz cinco tentativas, pede outro código, mais cinco, e assim
  sucessivamente até acertar. É este limite que fecha essa porta — e é o que
  falta em quase todas as implementações de OTP que se vêem.

  Serve também para uma coisa mais prosaica: impede que alguém use o formulário
  para encher a caixa de correio do dono da casa, e que se gastem os 100 envios
  diários do plano free do Resend numa tarde.

  **Por IP, 10 pedidos em 15 minutos.** Apanha quem tenta vários endereços
  diferentes a partir do mesmo sítio — a sondagem de quem procura descobrir que
  emails têm acesso.

  **Ao todo, 40 por dia.** Os três limites de cima são todos por chave: por
  email, ou por endereço de rede. Nenhum deles vê o total. Um ataque repartido
  por muitos IPs, cada um dentro do seu limite, gasta na mesma a quota partilhada
  que interessa aqui — os **100 envios diários** do plano gratuito do Resend, que
  ao serem atingidos param o envio e fecham o painel a quem tem acesso a sério.

  Com dois endereços na lista, os limites por chave deixavam passar ~576 envios
  por dia. Este teto é o que fecha essa conta, e é o que os outros três não
  conseguem fazer por construção: é preciso um contador que não tenha chave
  nenhuma além do dia.

  Quarenta é muito acima do uso real — duas pessoas, e um aparelho lembrado
  durante 30 dias que nem chega a pedir código — e muito abaixo dos cem. Se
  alguma vez for atingido em condições normais, o número está errado; se for
  atingido por ataque, fica no registo a dizê-lo.

  ## O que isto não faz, e quem faz

  Não trava volume bruto na borda: para isso está a regra do Vercel Firewall
  (`docs/PAINEL.md`), que corre antes de haver compute. Estes limites são os que
  o firewall não consegue fazer, porque são por email e não por endereço de rede.
*/

const JANELA_S = 15 * 60;
const POR_EMAIL = 3;
const POR_IP = 10;

const TETO_DIARIO = 40;
const DIA_S = 24 * 60 * 60;

/*
  O email vai em hash para a chave do Redis.

  Não é criptografia — é para a lista de quem tem acesso ao painel não ficar
  legível em texto no armazenamento, onde não faz falta nenhuma. Quem tiver as
  chaves do Redis vê `pedidos:9f86d0…` e não `pedidos:maria@…`.
*/
function chaveDoEmail(email: string): string {
  const digest = createHash("sha256").update(email.toLowerCase()).digest("hex");
  return `pedidos:${digest.slice(0, 32)}`;
}

/*
  A chave do teto diário — uma por dia, e o Redis apaga-a sozinho ao fim de 24h.

  A data em UTC, e não a de Lisboa: o que interessa é a janela ter o tamanho
  certo e mudar num instante previsível, não coincidir com a meia-noite de
  ninguém. `toISOString()` dá `2026-08-28` sem depender do fuso da máquina que
  estiver a correr a função — que em serverless não é sempre a mesma.
*/
function chaveDoDia(): string {
  return `envios:dia:${new Date().toISOString().slice(0, 10)}`;
}

/*
  Na Vercel o `x-forwarded-for` é reescrito pela plataforma e o primeiro endereço
  é o de quem pediu — não é um cabeçalho que o cliente controle. Fora da Vercel
  vale o que valer, e é por isso que o limite por IP é o terceiro da lista e não
  o primeiro.
*/
async function origem(): Promise<string> {
  const cabecalhos = await headers();
  return (
    cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    cabecalhos.get("x-real-ip") ||
    "desconhecida"
  );
}

/*
  Consome uma unidade do orçamento e diz se ainda havia.

  **Conta sempre, mesmo para emails que não estão na lista.** É essencial: se só
  contasse para os autorizados, o tempo de resposta e o comportamento a partir do
  quarto pedido diriam a quem está do outro lado quais os endereços que existem —
  que é exactamente a enumeração que a resposta uniforme do ecrã existe para
  evitar.
*/
export async function podePedirCodigo(email: string): Promise<boolean> {
  const [porEmail, porIp, noDia] = await Promise.all([
    somar(chaveDoEmail(email), JANELA_S),
    somar(`pedidos-ip:${await origem()}`, JANELA_S),
    somar(chaveDoDia(), DIA_S),
  ]);

  /*
    O teto merece uma linha no registo à parte, e os outros dois não.

    Um limite por email ou por IP esgotado é o sistema a funcionar: alguém
    insistiu de mais, e o `anotar()` de quem o chamou já o diz. O teto diário
    esgotado é outra coisa — quer dizer que o dia inteiro ficou sem envios, para
    toda a gente, e a única forma de o saber é isto ficar escrito.
  */
  if (noDia > TETO_DIARIO) {
    await anotar(`teto diário de envios esgotado (${noDia})`, email);
    return false;
  }

  return porEmail <= POR_EMAIL && porIp <= POR_IP;
}

/*
  Fica no registo de execução da Vercel. Se algum dia houver um ataque a sério, é
  a única forma de saber que houve — e de ver de onde veio.

  ## O email vai mascarado, e continua a servir

  Já foi em claro, com o argumento de que um hash não deixa perceber o que
  aconteceu. O argumento estava certo e a conclusão não: entre o endereço
  completo e um hash há o `meioEscondido()`, que é o que o segundo ecrã da
  entrada já mostra.

  `g•••••o@dominio.pt` chega para tudo o que este registo tem de responder — de
  que domínio vem a sondagem, se é sempre o mesmo endereço a insistir, se é o
  endereço de quem tem acesso ou um inventado. O que deixa de existir é uma lista
  de endereços legível no registo da Vercel, que é onde ninguém a foi lá pôr de
  propósito e onde ela não faz falta nenhuma.
*/
export async function anotar(o_que: string, email: string): Promise<void> {
  console.warn(`[painel] ${o_que} — ${meioEscondido(email)} — de ${await origem()}`);
}
