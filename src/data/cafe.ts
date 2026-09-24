import { z } from "zod";
import { erroDeFicheiro } from "./erros";
import dados from "./cafe.json";

/**
 * A casa: onde é, a que horas abre e por onde se fala com ela. Fonte única — o
 * rodapé, a página de contactos e os dados estruturados leem todos daqui.
 *
 * ## `null` quer dizer "ainda não confirmámos"
 *
 * ⚠️ **Os campos a `null` não são esquecimento.** Um campo a `null` desaparece
 * do site em vez de aparecer vazio, e isso é o comportamento certo: mais vale
 * não dizer o horário do que mandar alguém a uma porta fechada, e mais vale não
 * ter telefone no site do que ter o número de outra pessoa.
 *
 * ⚠️ **Nunca preencher isto por dedução.** Nem a partir do Google Maps, nem do
 * Facebook, nem de um agregador — essas fontes discordam entre si e ninguém as
 * mantém. Só entra o que o cliente confirmar. Ver a lista *Antes de publicar* no
 * README.
 *
 * A distinção entre os dois `null` do horário está explicada no esquema abaixo,
 * e é de propósito que são diferentes.
 */

const HORA = z.string().regex(/^\d{2}:\d{2}$/, "formato 00:00");

/** Minutos desde a abertura — o que vem depois da meia-noite conta como do mesmo
    turno, e é por isso que o `00:30` de uma segunda vem depois do `16:00`. */
function depoisDeAbrir(hora: string, abre: string): number {
  const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
  return (minutos(hora) - minutos(abre) + 24 * 60) % (24 * 60);
}

const Horario = z
  .object({
    abre: HORA,
    fecha: HORA,
    /**
     * A que horas a cozinha deixa de aceitar pedidos. A casa pediu que isto
     * estivesse **escrito**: quem chega à meia-noite para jantar tem de saber
     * antes de se sentar que a cozinha já fechou.
     *
     * `null` quer dizer que a cozinha fecha com o bar.
     */
    cozinhaFecha: HORA.nullable(),
  })
  /* A cozinha não pode fechar depois do bar — um `01:00` num dia que fecha às
     `00:30` é quase sempre o horário de sexta copiado para a segunda. Tem de
     ficar entre a abertura e o fecho, contando com a passagem da meia-noite. */
  .superRefine((h, ctx) => {
    if (h.cozinhaFecha === null) return;
    const fecho = depoisDeAbrir(h.fecha, h.abre) || 24 * 60;
    const cozinha = depoisDeAbrir(h.cozinhaFecha, h.abre);
    if (cozinha === 0 || cozinha > fecho) {
      ctx.addIssue({
        code: "custom",
        path: ["cozinhaFecha"],
        message: `a cozinha tem de fechar entre a abertura (${h.abre}) e o fecho (${h.fecha})`,
      });
    }
  })
  /** `null` num dia é **encerrado**, e o site escreve-o com todas as letras. */
  .nullable();

/**
 * Exportado para o painel (`/painel/casa`) validar com as mesmas regras do
 * `build` antes de gravar.
 */
export const EsquemaCafe = z.object({
  nome: z.string().min(1),
  /** Rua e número. Chega para o botão de direções — ver `urlDirecoes`. */
  morada: z.string().min(1).nullable(),
  codigoPostal: z
    .string()
    .regex(/^\d{4}-\d{3}$/, "formato 0000-000")
    .nullable(),
  cidade: z.string().min(1).nullable(),
  /* Guardado como o cliente o diz, para o `tel:` limpar os espaços à frente.
     Ver `telefoneParaLigar`. */
  telefone: z.string().min(9).nullable(),
  email: z.email().nullable(),
  /**
   * Se a casa já disse que o horário está certo.
   *
   * Com esta bandeira a `false`, o site escreve por baixo do horário que está
   * sujeito a confirmação e que convém ligar antes de vir — **o dado aparece,
   * mas o site não promete o que não sabe.**
   *
   * Está a `true` desde a reunião de 2026-09-23, em que a casa deu o horário
   * novo e a hora da cozinha. Passa outra vez a `false` se alguém escrever um
   * horário que a casa não disse. Não é o painel que a muda — ver
   * `docs/PAINEL.md`.
   */
  horarioConfirmado: z.boolean(),
  /**
   * `null` no objeto inteiro significa **ainda não confirmado** e esconde a
   * secção; `null` num dia significa **encerrado nesse dia**. São duas coisas
   * diferentes e é de propósito que se distinguem: a primeira é uma falha
   * nossa, a segunda é informação a sério.
   */
  horarios: z
    .object({
      segunda: Horario,
      terca: Horario,
      quarta: Horario,
      quinta: Horario,
      sexta: Horario,
      sabado: Horario,
      domingo: Horario,
    })
    .nullable(),
  /**
   * Se a casa recebe cães. Veio do próprio cliente, que queria que o site o
   * dissesse. `null` esconde a linha em "Onde estamos"; `false` também, porque
   * um "não aceitamos animais" não é coisa que se anuncie na página inicial.
   */
  aceitaAnimais: z.boolean().nullable(),
  /**
   * A entidade de resolução alternativa de litígios de consumo, indicada em
   * `/informacao-legal` — é obrigatório (Lei 144/2015, art. 18.º). `null`
   * esconde a secção; a página fica, com o Livro de Reclamações.
   *
   * ⚠️ Hoje é o **CICAP**, por ser o centro competente para Valongo (está na
   * lista de municípios em cicap.pt). **Muda se a casa tiver aderido a outro
   * centro** — nesse caso é esse que a lei manda indicar. Por confirmar com o
   * cliente.
   */
  litigios: z
    .object({
      nome: z.string().min(1),
      url: z.url(),
    })
    .nullable(),
});

export type Cafe = z.infer<typeof EsquemaCafe>;
export type DiaDaSemana = keyof NonNullable<Cafe["horarios"]>;

/** A ordem da semana portuguesa — a segunda primeiro, não o domingo. */
export const DIAS: readonly DiaDaSemana[] = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
];

const validado = EsquemaCafe.safeParse(dados);
if (!validado.success) {
  throw erroDeFicheiro("cafe.json", validado.error, dados);
}

export const cafe: Cafe = validado.data;

/**
 * A morada numa linha, com o que existir. Devolve `null` se não houver morada
 * nenhuma — e aí quem chama esconde o bloco em vez de escrever uma vírgula
 * solta.
 */
export function moradaCompleta(): string | null {
  if (!cafe.morada) return null;
  const linhaDois = [cafe.codigoPostal, cafe.cidade].filter(Boolean).join(" ");
  return linhaDois ? `${cafe.morada}, ${linhaDois}` : cafe.morada;
}

/**
 * Link de direções para o Google Maps.
 *
 * É um link normal, e não um mapa embebido, de propósito: um `<iframe>` do Maps
 * carrega scripts e cookies da Google em cada visita, obriga a abrir a CSP e
 * traz consentimento de cookies atrás. Assim, o terceiro só vê quem carregar no
 * botão. Ver `docs/seguranca.md`.
 */
export function urlDirecoes(): string | null {
  const morada = moradaCompleta();
  if (!morada) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${cafe.nome}, ${morada}`,
  )}`;
}

/** O número sem espaços, que é o que o `href="tel:"` precisa. */
export function telefoneParaLigar(): string | null {
  return cafe.telefone ? cafe.telefone.replace(/\s+/g, "") : null;
}

/**
 * A que rede pertence o número, para a indicação do custo da chamada.
 *
 * ⚠️ **Não é enfeite, é lei**: desde o Decreto-Lei n.º 59/2021 um número
 * publicado para contacto com o consumidor tem de dizer ao lado se é chamada
 * para a rede fixa ou móvel nacional. Deduz-se do primeiro algarismo, que é
 * como o Plano Nacional de Numeração os distribui — `2` fixa, `9` móvel. Um
 * `null` quer dizer que o número não é nenhum dos dois e o aviso não aparece;
 * se isso acontecer, confirmar à mão qual é o texto certo.
 */
export function redeDoTelefone(): "fixa" | "movel" | null {
  const numero = telefoneParaLigar();
  if (!numero) return null;
  if (numero.startsWith("2")) return "fixa";
  if (numero.startsWith("9")) return "movel";
  return null;
}

/**
 * A hora a que a cozinha fecha num dia — a do bar, se não houver outra.
 * `null` se o dia estiver encerrado ou o horário por confirmar.
 */
export function cozinhaFecha(dia: DiaDaSemana): string | null {
  const h = cafe.horarios?.[dia];
  return h ? (h.cozinhaFecha ?? h.fecha) : null;
}

/**
 * A hora da cozinha em blocos de dias seguidos com a mesma hora — "segunda a
 * quinta até 00:00 · sexta e sábado até 01:00". É o que a ementa escreve em
 * "Para comer", onde a pessoa escolhe a comida.
 *
 * Os dias encerrados partem os blocos e não entram. Sai do `cafe.json`, e por
 * isso o painel muda-o sem se tocar na ementa.
 */
export function horarioDaCozinha(): { dias: DiaDaSemana[]; hora: string }[] {
  const blocos: { dias: DiaDaSemana[]; hora: string }[] = [];
  let anterior: string | null = null;

  for (const dia of DIAS) {
    const hora = cozinhaFecha(dia);
    if (hora === null) {
      anterior = null;
      continue;
    }
    if (hora === anterior) blocos.at(-1)!.dias.push(dia);
    else blocos.push({ dias: [dia], hora });
    anterior = hora;
  }

  return blocos;
}
