import "server-only";
import { createHash } from "node:crypto";
import { apagar, guardar, ler, lerVarias, mudarPrazo } from "@/lib/painel/redis";

/*
  A prova do consentimento para a newsletter.

  ## Porque é que isto existe

  Revisão legal de 2026-10-15. Quem envia marketing por email tem de conseguir
  **demonstrar** que a pessoa consentiu (RGPD, art. 7.º, n.º 1), e a CNPD diz
  o que isso inclui: o momento, o contexto e a informação que lhe foi dada
  quando consentiu, e as condições que tinha para o retirar (Diretriz 1/2022,
  §§ 79–81). Até aqui, a única data era o `created_at` do contacto no Resend —
  que é quando o contacto nasceu, não quando a pessoa confirmou, e que não muda
  quando alguém cancela e volta a inscrever-se.

  ## O que fica

  Um registo por pessoa, no Upstash, com os acontecimentos por ordem:

  | acontecimento | campos |
  |---|---|
  | `consentimento` | quando confirmou, quando pediu, onde (convite ou carta secreta), em que língua, o texto exacto que estava ao lado do botão, a versão desse texto, e como confirmou (botão na página a que o email leva) |
  | `retirada` | quando, e por onde (painel ou link no email) |

  **Sem IP, sem browser, sem aparelho.** A dupla confirmação já prova que o
  dono da caixa carregou no botão; um IP por rotina era recolher mais para
  provar o mesmo.

  ## A chave

  `newsletter:consentimento:<sha256 do email>`. É um pseudónimo, não um
  anonimato: quem sabe um email consegue calcular o mesmo resumo — e é
  precisamente isso que deixa encontrar a prova quando alguém pergunta. Não se
  usa um HMAC com o segredo do painel porque apagar esse segredo (o botão de
  emergência de `lib/painel/chaves.ts`) deixava todas as provas órfãs.

  ## Quanto tempo

  - **Enquanto a pessoa estiver inscrita, sem prazo.** É enquanto se lhe envia
    que a prova serve.
  - **Depois de retirar, `PRAZO_DA_PROVA_S`**, contado da retirada. O Redis
    apaga-o sozinho. Voltar a inscrever-se tira o prazo outra vez.
  - **Pedido de apagamento** (`apagarProva`): sai tudo, junto com o contacto
    no Resend — ver `apagarDeVez` em `lib/newsletter/resend.ts`.

  O prazo depois da retirada **não é um prazo legal**: nenhuma norma consultada
  fixa um. É uma proposta (três anos — tempo para responder a uma reclamação ou
  a um pedido da CNPD sobre envios feitos enquanto a inscrição existia) que o
  responsável tem de confirmar. Está em `docs/decisoes-pendentes.md`.
*/

const PREFIXO = "newsletter:consentimento:";
const ANO_S = 365 * 24 * 60 * 60;
export const PRAZO_DA_PROVA_S = 3 * ANO_S;
/* Um teto para o registo de uma pessoa: dez anos de cancelar e voltar todos
   os meses cabem, um ciclo avariado não enche o armazenamento. */
const MAXIMO_DE_ACONTECIMENTOS = 100;

export type Origem = "convite" | "carta";

export type Consentimento = {
  tipo: "consentimento";
  /** Milissegundos desde 1970: quando carregou em "Confirmar". */
  quando: number;
  /** Quando escreveu o email no site (o email de confirmação saiu a seguir). */
  pedidoEm: number;
  origem: Origem;
  lingua: string;
  /** O texto que estava ao lado do botão, tal e qual. */
  texto: string;
  /** A versão desse texto — ver `VERSAO_DO_TEXTO` em `lib/newsletter/convite.ts`. */
  versao: string;
  confirmacao: "botao-depois-do-email";
};

export type Retirada = {
  tipo: "retirada";
  quando: number;
  por: "painel" | "link-no-email";
};

export type Acontecimento = Consentimento | Retirada;

/* Igual ao do aviso de cancelamento: minúsculas e sem espaços à volta, para
   "Ana@x.pt" e "ana@x.pt " serem a mesma pessoa. */
export function chaveDaProva(email: string): string {
  const resumo = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  return `${PREFIXO}${resumo}`;
}

function lerAcontecimentos(texto: string | null): Acontecimento[] {
  if (!texto) return [];
  try {
    const lido = JSON.parse(texto) as unknown;
    return Array.isArray(lido) ? (lido as Acontecimento[]) : [];
  } catch {
    return [];
  }
}

async function acrescentar(email: string, acontecimento: Acontecimento): Promise<void> {
  const chave = chaveDaProva(email);
  const todos = [...lerAcontecimentos(await ler(chave)), acontecimento].slice(-MAXIMO_DE_ACONTECIMENTOS);
  await guardar(chave, JSON.stringify(todos));
}

/** A pessoa confirmou (ou voltou a confirmar). O registo deixa de ter prazo. */
export async function registarConsentimento(
  email: string,
  dados: Omit<Consentimento, "tipo" | "quando" | "confirmacao">,
): Promise<void> {
  await acrescentar(email, {
    tipo: "consentimento",
    quando: Date.now(),
    confirmacao: "botao-depois-do-email",
    ...dados,
  });
  /* O `SET` sem `EX` já tira o prazo; isto fica para o caso de um dia a
     escrita passar a ser outra. */
  await mudarPrazo(chaveDaProva(email), null);
}

/** A pessoa retirou o consentimento. O registo passa a ter prazo. */
export async function registarRetirada(email: string, por: Retirada["por"]): Promise<void> {
  await acrescentar(email, { tipo: "retirada", quando: Date.now(), por });
  await mudarPrazo(chaveDaProva(email), PRAZO_DA_PROVA_S);
}

/** O registo de uma pessoa, do mais antigo para o mais recente. */
export async function provaDe(email: string): Promise<Acontecimento[]> {
  return lerAcontecimentos(await ler(chaveDaProva(email)));
}

/** A última confirmação de cada email (ou `null`), pela ordem pedida. */
export async function ultimasConfirmacoes(emails: string[]): Promise<(Consentimento | null)[]> {
  const textos = await lerVarias(emails.map(chaveDaProva));
  return textos.map(
    (t) =>
      lerAcontecimentos(t)
        .filter((a): a is Consentimento => a.tipo === "consentimento")
        .at(-1) ?? null,
  );
}

/** Já há uma retirada registada depois da última confirmação? */
export async function jaRetirou(email: string): Promise<boolean> {
  return (await provaDe(email)).at(-1)?.tipo === "retirada";
}

/** Um pedido de apagamento: a prova sai também. */
export async function apagarProva(email: string): Promise<void> {
  await apagar(chaveDaProva(email));
}
