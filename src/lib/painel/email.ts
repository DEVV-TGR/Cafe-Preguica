import "server-only";
import { comEspaco } from "./codigo";
import { meioEscondido } from "./utilizadores";

/*
  Mandar o código por email.

  Um `fetch` ao Resend, e mais nada — o SDK deles faria isto com menos linhas e
  traria uma árvore de dependências para um pedido HTTP, que é a mesma razão
  pela qual o `lib/painel/github.ts` não usa o Octokit.

  A CSP não muda por causa disto: a chamada é feita no servidor e o browser
  nunca fala com o Resend. Se alguém alguma vez precisar de acrescentar
  `api.resend.com` ao `connect-src`, é sinal de que a chave de API está a passar
  pelo cliente — que é a mesma nota que está escrita no `src/lib/cabecalhos.ts` a
  propósito do GitHub.

  ## O remetente vem de uma variável

  `RESEND_REMETENTE`, com o formato `Nome <endereco@dominio>`.

  Não está fixo no código porque o domínio a usar é o da agência, e não o da
  casa: o domínio verificado governa o **remetente**, não o destinatário — dá
  para enviar para qualquer endereço a partir de um domínio já verificado.
  Verificar o `cafepreguica.pt` gastava a única vaga de domínio do plano
  gratuito e obrigava a mexer no DNS do cliente, sem ganho nenhum para um email
  interno de seis algarismos.

  ## O domínio tem de bater certo à letra

  E é aqui que isto já custou uma noite. O que está verificado no Resend é
  `send.devplus.pt` — um **subdomínio**. Um remetente em `@devplus.pt` é
  recusado com 403, porque para o Resend a raiz e o subdomínio são dois domínios
  diferentes e só um deles foi verificado.

  A regra, sem rodeios: o que vem depois do `@` tem de ser, caracter a caracter,
  o que aparece como *Verified* no painel do Resend.

  A caixa não recebe respostas. O `reply_to` aponta ao próprio remetente e o
  texto do email diz que não vale a pena responder.
*/

/*
  Não é um estado do Resend — o pedido nem chega a sair. É um número fora da gama
  do HTTP de propósito, para nunca colidir com uma resposta real. Mesma convenção
  do `SEM_TOKEN` do `lib/painel/github.ts`, e pela mesma razão: **falta
  configurar não é o mesmo que está mal configurado**, e um erro que descreve mal
  a causa manda procurar no sítio errado.
*/
const SEM_CONFIGURACAO = 0;

/*
  A resposta do Resend com os endereços mascarados, e cortada.

  O corpo de um erro do Resend leva o destinatário com frequência — *"You can
  only send testing emails to your own email address (tomas@…)"* é a mais comum
  de todas. Isso é o endereço de quem está a entrar no painel, e não tem nada que
  ficar por extenso no registo da Vercel; o mesmo `meioEscondido()` do
  `anotar()`, e pela mesma razão.

  O corte aos 300 caracteres é contra outra coisa: uma resposta que não seja JSON
  — uma página de erro de um proxy pelo meio, por exemplo — despejava kilobytes
  de HTML para dentro do registo.
*/
export function semEnderecos(detalhe: string): string {
  const limpo = detalhe.replace(
    /[^\s"'<>@]+@[^\s"'<>@]+\.[a-z]{2,}/gi,
    (endereco) => meioEscondido(endereco),
  );

  return limpo.length > 300 ? `${limpo.slice(0, 300)}…` : limpo;
}

/*
  Atira, e deixa o detalhe no registo.

  O detalhe é a única coisa que distingue "o domínio não está verificado" de "a
  chave expirou", e o ecrã nunca o pode mostrar — mostra a frase educada. Se não
  ficar aqui, não fica em lado nenhum.

  Isto não estava a acontecer, apesar de o comentário da classe dizer que sim: o
  `catch` das acções devolvia a frase do ecrã e deitava o erro fora. O diagnóstico
  acabou por ser feito no painel do Resend, que é o sítio onde não devia ter sido
  preciso ir.

  O que se escreve é o detalhe já passado pelo `semEnderecos()` — e o que a
  excepção leva também, porque a mensagem de um `Error` acaba, mais dia menos
  dia, em cima de outro registo.
*/
function rebentar(estado: number, detalhe: string): never {
  const seguro = semEnderecos(detalhe);
  console.error(`[painel] o envio do código falhou — ${estado} — ${seguro}`);
  throw new ErroAoEnviar(estado, seguro);
}

function remetente(): string {
  const valor = process.env.RESEND_REMETENTE;
  if (!valor) rebentar(SEM_CONFIGURACAO, "RESEND_REMETENTE em falta.");
  return valor;
}

export class ErroAoEnviar extends Error {
  readonly estado: number;
  readonly detalhe: string;

  constructor(estado: number, detalhe: string) {
    super(`O Resend respondeu ${estado}: ${detalhe}`);
    this.name = "ErroAoEnviar";
    this.estado = estado;
    this.detalhe = detalhe;
  }

  /*
    O que se mostra a quem está à espera do código. Nunca o erro cru do Resend —
    esse vai para o registo pelo `rebentar()`, onde é útil, e não para um ecrã
    onde só assusta.

    ## Quatro causas, quatro frases

    Isto já disse *"a chave parece estar errada ou expirada"* para três coisas
    diferentes, porque as duas variáveis em falta também atiravam com `401`. E a
    causa verdadeira não era nenhuma das três — era o domínio do remetente, que
    esta frase nem sequer mencionava.

    Uma mensagem errada é pior do que uma genérica: a genérica faz perguntar, a
    errada faz procurar no sítio errado durante uma hora.
  */
  get paraOEcra(): string {
    if (this.estado === SEM_CONFIGURACAO) {
      return (
        `O painel ainda não consegue enviar emails — ${this.detalhe} ` +
        `Ver docs/PAINEL.md.`
      );
    }
    /*
      O 403 do Resend é, quase sempre, um remetente cujo domínio não está
      verificado. A resposta dele até o diz por extenso — mas ninguém a lia,
      porque era deitada fora antes de chegar ao registo.
    */
    if (this.estado === 403) {
      return (
        "O painel não conseguiu enviar o código — o domínio do remetente não " +
        "está verificado no Resend. O RESEND_REMETENTE tem de usar, à letra, o " +
        "domínio que lá aparece como Verified. Fala com o Tomás."
      );
    }
    if (this.estado === 401) {
      return (
        "O painel não conseguiu enviar o código — a chave do serviço de email " +
        "foi recusada. O mais provável é ter sido revogada. Fala com o Tomás."
      );
    }
    /*
      O plano gratuito do Resend pausa o envio ao atingir o limite diário, em vez
      de cobrar. Para quem está à espera do código isso é indistinguível de uma
      avaria — daí valer uma frase própria.
    */
    if (this.estado === 429) {
      return (
        "Já se enviaram códigos a mais por hoje e o serviço de email travou o " +
        "envio. Espera uns minutos; se continuar, fala com o Tomás."
      );
    }
    return (
      "Não foi possível enviar o código agora. Tenta daqui a um minuto; se " +
      "continuar, fala com o Tomás."
    );
  }
}

/*
  Lido dentro da função, como tudo o resto que toca no ambiente: o `next build`
  da CI corre sem uma única variável definida.
*/
function chaveDeApi(): string {
  const valor = process.env.RESEND_API_KEY;
  if (!valor) rebentar(SEM_CONFIGURACAO, "RESEND_API_KEY em falta.");
  return valor;
}

/*
  Em desenvolvimento, sem chave do Resend, o código vai para o terminal.

  Sem isto não há forma de entrar no painel na própria máquina sem montar uma
  conta de email — e montar uma conta de email para carregar num botão e ver se
  o ecrã está direito é fricção a mais.

  **Isto não é uma porta traseira.** O código continua a ser gerado, continua a
  ser exigido, e continua a ter de bater certo. O que muda é por onde ele sai:
  em vez de um email, sai no terminal de quem está a correr o `npm run dev`, que
  é a mesma pessoa que está a tentar entrar.

  Duas condições, e as duas têm de se verificar:

  - `NODE_ENV !== "production"` — na Vercel o build de produção é sempre
    `production`, portanto este ramo não existe lá;
  - **não haver `RESEND_API_KEY`** — se houver chave, manda-se o email a sério,
    mesmo em desenvolvimento.

  Se um dia isto aparecer a disparar em produção, é sinal de que o `NODE_ENV`
  está errado — e aí o problema é esse, não este ficheiro.
*/
function paraOTerminal(para: string, legivel: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.RESEND_API_KEY) return false;

  console.log(
    [
      "",
      "┌────────────────────────────────────────────────┐",
      "│  DESENVOLVIMENTO — sem RESEND_API_KEY          │",
      "│  O código não foi enviado por email.           │",
      "├────────────────────────────────────────────────┤",
      `│  para:   ${para.padEnd(38)}│`,
      `│  código: ${legivel.padEnd(38)}│`,
      "└────────────────────────────────────────────────┘",
      "",
    ].join("\n"),
  );

  return true;
}

export async function enviarCodigo({
  para,
  codigo,
}: {
  para: string;
  codigo: string;
}): Promise<void> {
  const legivel = comEspaco(codigo);

  if (paraOTerminal(para, legivel)) return;

  const de = remetente();

  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${chaveDeApi()}`,
      "Content-Type": "application/json",
      /*
        Dois cliques no botão de enviar dão dois pedidos iguais; com esta chave
        o Resend manda um email só. É por código e por destinatário, portanto um
        código novo continua a produzir um email novo.
      */
      "Idempotency-Key": `painel-${para}-${codigo}`,
    },
    body: JSON.stringify({
      from: de,
      to: [para],
      reply_to: de,
      /*
        O código vai no **assunto** de propósito. Quem estiver no telemóvel
        lê-o na notificação, sem desbloquear e sem abrir o email — que é como
        isto vai ser usado, ao balcão e com uma mão só.
      */
      subject: `${legivel} — entrar no painel do Preguiça`,
      text: [
        `O teu código para entrar no painel é ${legivel}.`,
        "",
        "Vale 10 minutos e serve uma vez só.",
        "",
        "Se não foste tu a pedir este código, alguém escreveu o teu endereço",
        "no ecrã de entrada do painel. Não há nada a fazer — sem o código não",
        "se entra — mas vale a pena avisares o Tomás se acontecer muitas vezes.",
        "",
        "Esta caixa não lê respostas.",
      ].join("\n"),
    }),
  });

  if (!resposta.ok) {
    rebentar(resposta.status, await resposta.text());
  }
}
