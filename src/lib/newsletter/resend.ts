import "server-only";
import { semEnderecos } from "@/lib/painel/email";

/*
  A newsletter no Resend: contactos, envios de teste e envios a toda a gente.

  ## Uma conta à parte da do painel

  O painel manda os códigos de entrada pela conta da agência (`RESEND_API_KEY`).
  A newsletter tem as suas próprias três variáveis, e é de propósito, mesmo
  quando — como agora, em testes — apontam à mesma conta:

  - os contactos são da casa, e vão acabar na conta do Rafael. Passar para lá é
    trocar estas três variáveis na Vercel, sem tocar em código;
  - uma newsletter grande nunca pode gastar a quota de que o Rafael precisa para
    receber o código e entrar no painel.

  | variável | o quê |
  |---|---|
  | `RESEND_NEWSLETTER_API_KEY` | a chave da conta onde vivem os contactos |
  | `RESEND_NEWSLETTER_REMETENTE` | `Café Preguiça <novidades@…>`, num domínio verificado nessa conta |
  | `RESEND_NEWSLETTER_SEGMENTO` | o id do segmento "Newsletter" (Resend → Audience → Segments) |

  ## Não há base de dados nossa

  A lista é a do Resend. O painel pergunta-lha de cada vez que abre, e quem
  cancela a inscrição (pelo link que o Resend põe em cada envio) deixa de receber
  sem nós fazermos nada. É também por isso que os emails de quem se inscreve
  nunca passam pelo repositório, que é público.

  Só `fetch`, sem SDK — a mesma razão do `lib/painel/email.ts`.
*/

const API = "https://api.resend.com";

/* Mesma convenção do `lib/painel/email.ts`: não é um estado HTTP, é "o pedido
   nem saiu", e falta configurar não é o mesmo que estar mal configurado. */
const SEM_CONFIGURACAO = 0;

export class ErroDaNewsletter extends Error {
  readonly estado: number;
  readonly detalhe: string;

  constructor(estado: number, detalhe: string) {
    super(`O Resend respondeu ${estado}: ${detalhe}`);
    this.name = "ErroDaNewsletter";
    this.estado = estado;
    this.detalhe = detalhe;
  }

  /** A frase para o painel. Quem lê é o Rafael, ao balcão. */
  get paraOEcra(): string {
    if (this.estado === SEM_CONFIGURACAO) {
      return `A newsletter ainda não está ligada — ${this.detalhe} Ver docs/NEWSLETTER.md.`;
    }
    if (this.estado === 401) {
      return "O serviço de email recusou a chave da newsletter. O mais provável é ter sido revogada. Fala com o Tomás.";
    }
    if (this.estado === 403) {
      return "O serviço de email recusou o remetente — o domínio não está verificado na conta da newsletter. Fala com o Tomás.";
    }
    if (this.estado === 404) {
      return "O serviço de email não encontra a lista de contactos. O RESEND_NEWSLETTER_SEGMENTO está errado ou o segmento foi apagado. Fala com o Tomás.";
    }
    if (this.estado === 429) {
      return "O serviço de email travou os envios por agora (limite atingido). Espera uns minutos e tenta outra vez.";
    }
    return "O serviço de email não respondeu como devia. Tenta daqui a um minuto; se continuar, fala com o Tomás.";
  }
}

function rebentar(estado: number, detalhe: string): never {
  const seguro = semEnderecos(detalhe);
  console.error(`[newsletter] o Resend falhou — ${estado} — ${seguro}`);
  throw new ErroDaNewsletter(estado, seguro);
}

type Configuracao = { chave: string; remetente: string; segmento: string };

/** O que falta configurar, ou `null` se estiver tudo. Para o painel o poder dizer
    antes de alguém escrever uma newsletter inteira para nada. */
export function oQueFalta(): string | null {
  const faltam = [
    "RESEND_NEWSLETTER_API_KEY",
    "RESEND_NEWSLETTER_REMETENTE",
    "RESEND_NEWSLETTER_SEGMENTO",
  ].filter((nome) => !process.env[nome]?.trim());

  return faltam.length ? `${faltam.join(", ")} em falta.` : null;
}

/* Lido dentro da função: o `next build` da CI corre sem variável nenhuma. */
function configuracao(): Configuracao {
  const falta = oQueFalta();
  if (falta) rebentar(SEM_CONFIGURACAO, falta);

  return {
    chave: process.env.RESEND_NEWSLETTER_API_KEY!.trim(),
    remetente: process.env.RESEND_NEWSLETTER_REMETENTE!.trim(),
    segmento: process.env.RESEND_NEWSLETTER_SEGMENTO!.trim(),
  };
}

async function pedir<T>(
  caminho: string,
  { metodo = "GET", corpo, cabecalhos }: {
    metodo?: string;
    corpo?: unknown;
    cabecalhos?: Record<string, string>;
  } = {},
): Promise<T> {
  const { chave } = configuracao();

  const resposta = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${chave}`,
      ...(corpo === undefined ? {} : { "Content-Type": "application/json" }),
      ...cabecalhos,
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    cache: "no-store",
  });

  if (!resposta.ok) rebentar(resposta.status, await resposta.text());
  return (await resposta.json()) as T;
}

/* ------------------------------------------------------------ o pop-up -- */

/*
  Em desenvolvimento, sem chave, o convite e a confirmação vão para o terminal —
  a mesma porta do `lib/painel/email.ts`, e com as mesmas duas condições. Sem
  isto, experimentar o convite na própria máquina, do princípio ao fim, obrigava
  a montar uma conta de email.
*/
function paraOTerminal(...linhas: string[]): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.RESEND_NEWSLETTER_API_KEY) return false;

  console.log(
    ["", "── DESENVOLVIMENTO — sem RESEND_NEWSLETTER_API_KEY ──", ...linhas.map((l) => `   ${l}`), ""].join(
      "\n",
    ),
  );
  return true;
}

export async function enviarConfirmacao({
  para,
  link,
  assunto,
  texto,
}: {
  para: string;
  link: string;
  assunto: string;
  texto: string;
}): Promise<void> {
  if (paraOTerminal(`confirmação da newsletter para ${para}:`, link)) return;

  const { remetente } = configuracao();
  await pedir("/emails", {
    metodo: "POST",
    corpo: { from: remetente, to: [para], subject: assunto, text: texto },
  });
}

/*
  O contacto nasce aqui, e só aqui — depois de o dono da caixa carregar no link.

  Se já existir (inscreveu-se antes, ou cancelou e voltou), o `POST` é recusado.
  Nesse caso volta-se a pô-lo como inscrito e no segmento: quem confirma pela
  segunda vez está a dizer, de novo e por escrito, que quer receber.
*/
export async function criarContacto(email: string): Promise<void> {
  if (paraOTerminal(`${email} confirmou — em produção entrava agora no segmento.`)) return;

  const { segmento } = configuracao();

  try {
    await pedir("/contacts", {
      metodo: "POST",
      corpo: { email, unsubscribed: false, segments: [{ id: segmento }] },
    });
    return;
  } catch (erro) {
    if (!(erro instanceof ErroDaNewsletter) || ![400, 409, 422].includes(erro.estado)) {
      throw erro;
    }
  }

  const alvo = encodeURIComponent(email);
  await pedir(`/contacts/${alvo}`, { metodo: "PATCH", corpo: { unsubscribed: false } });
  await pedir(`/contacts/${alvo}/segments/${encodeURIComponent(segmento)}`, { metodo: "POST" });
}

/* ------------------------------------------------------------ o painel -- */

export type Contacto = {
  email: string;
  criadoEm: string;
  cancelou: boolean;
};

type ListaDoResend<T> = { has_more: boolean; data: T[] };

/*
  A lista inteira, de 100 em 100.

  Pára às 5000 — o plano gratuito deixa ter 1000 contactos, e um ciclo sem teto
  a falar com uma API é um ciclo que um dia não acaba.
*/
export async function listarContactos(): Promise<Contacto[]> {
  const { segmento } = configuracao();
  const todos: Contacto[] = [];
  let depois: string | undefined;

  for (let pagina = 0; pagina < 50; pagina++) {
    const consulta = new URLSearchParams({ limit: "100", ...(depois ? { after: depois } : {}) });
    const lista = await pedir<
      ListaDoResend<{ id: string; email: string; created_at: string; unsubscribed: boolean }>
    >(`/segments/${encodeURIComponent(segmento)}/contacts?${consulta}`);

    for (const c of lista.data) {
      todos.push({ email: c.email, criadoEm: c.created_at, cancelou: c.unsubscribed });
    }
    if (!lista.has_more || lista.data.length === 0) break;
    depois = lista.data.at(-1)!.id;
  }

  return todos;
}

export type Envio = {
  id: string;
  assunto: string;
  estado: string;
  enviadoEm: string | null;
  criadoEm: string;
};

/** Os últimos envios deste segmento. O `name` de cada broadcast é o assunto —
    é o que o `enviarATodos` lá põe, porque a listagem não devolve o assunto. */
export async function listarEnvios(): Promise<Envio[]> {
  const { segmento } = configuracao();
  const lista = await pedir<
    ListaDoResend<{
      id: string;
      name: string | null;
      segment_id: string | null;
      status: string;
      created_at: string;
      sent_at: string | null;
    }>
  >("/broadcasts?limit=50");

  return lista.data
    .filter((b) => b.segment_id === segmento)
    .map((b) => ({
      id: b.id,
      assunto: b.name ?? "(sem assunto)",
      estado: b.status,
      enviadoEm: b.sent_at,
      criadoEm: b.created_at,
    }));
}

type Mensagem = { assunto: string; html: string; texto: string; responderPara?: string | null };

/** Um email só, para quem está no painel ver como fica antes de mandar a todos. */
export async function enviarTeste(para: string, m: Mensagem): Promise<void> {
  const { remetente } = configuracao();
  await pedir("/emails", {
    metodo: "POST",
    corpo: {
      from: remetente,
      to: [para],
      subject: `[Teste] ${m.assunto}`,
      html: m.html,
      text: m.texto,
      ...(m.responderPara ? { reply_to: m.responderPara } : {}),
    },
  });
}

/*
  O envio a sério: um broadcast para o segmento, criado e enviado de uma vez.

  O Resend só manda a quem está inscrito, e troca a marca do cancelamento pelo
  link de cada pessoa. O `reply_to` é o email da casa: quem responder a uma
  newsletter está a falar com o Rafael, não com uma caixa `novidades@` que
  ninguém lê.
*/
export async function enviarATodos(m: Mensagem): Promise<string> {
  const { remetente, segmento } = configuracao();
  const { id } = await pedir<{ id: string }>("/broadcasts", {
    metodo: "POST",
    corpo: {
      segment_id: segmento,
      from: remetente,
      subject: m.assunto,
      name: m.assunto,
      html: m.html,
      text: m.texto,
      send: true,
      ...(m.responderPara ? { reply_to: m.responderPara } : {}),
    },
  });
  return id;
}

export type EnvioCompleto = Envio & { html: string; texto: string | null; de: string };

/*
  Um envio inteiro, para o painel o mostrar tal como saiu.

  O conteúdo não é guardado por nós: é o Resend que o tem, e é-lhe pedido cada
  vez. O `id` vem do endereço da página, por isso confere-se o formato antes de
  o pôr num caminho — e o segmento depois, para o painel só mostrar envios desta
  newsletter e não outros que a mesma conta tenha.
*/
export async function obterEnvio(id: string): Promise<EnvioCompleto | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const { segmento } = configuracao();
  let b: {
    id: string;
    subject: string | null;
    name: string | null;
    from: string;
    segment_id: string | null;
    status: string;
    html: string | null;
    text: string | null;
    created_at: string;
    sent_at: string | null;
  };
  try {
    b = await pedir(`/broadcasts/${id}`);
  } catch (erro) {
    if (erro instanceof ErroDaNewsletter && erro.estado === 404) return null;
    throw erro;
  }

  if (b.segment_id !== segmento) return null;

  return {
    id: b.id,
    assunto: b.subject ?? b.name ?? "(sem assunto)",
    estado: b.status,
    enviadoEm: b.sent_at,
    criadoEm: b.created_at,
    html: b.html ?? "",
    texto: b.text,
    de: b.from,
  };
}
