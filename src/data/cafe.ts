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
     Ver `telefoneParaLigar`.

     Só os caracteres de um número, e não "qualquer texto com nove letras": o
     painel grava isto, e daqui segue para o `tel:` e para os dados
     estruturados de todas as páginas. Um campo livre era um sítio onde caber
     um `</script>`. */
  telefone: z
    .string()
    .regex(/^\+?[\d\s().-]{9,20}$/, "só algarismos, espaços e + ( ) - .")
    .nullable(),
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
   *
   * ⚠️ É **na esplanada** (o cliente, 2026-10-08), e os textos dizem-no. Já
   * disseram "os cães também entram", que mandava gente com o cão para a sala.
   */
  aceitaAnimais: z.boolean().nullable(),
  /**
   * Quem explora a casa — a identificação jurídica que o site tem de dar
   * (DL 7/2004, art. 10.º) e o responsável pelos dados (RGPD, art. 13.º).
   *
   * ⚠️ **O nome comercial não é isto.** "Café Preguiça" é a marca; quem
   * responde por ela é uma pessoa ou uma sociedade, com nome, NIF e sede
   * próprios, que podem não ser os da casa. Não se deduzem — nem da morada, nem
   * de um agregador, nem do Portal da Justiça: vêm da casa ou do contabilista.
   *
   * `null` é **por confirmar**, e não esconde nada em silêncio: a política de
   * privacidade e a página de informação legal dizem que a identificação está
   * por publicar, e `pendenciasLegais()` lista-o no build. Revisão legal de
   * 2026-10-15.
   *
   * Os dados de registo e o capital só se pedem a sociedades (Código das
   * Sociedades Comerciais, art. 171.º): a um empresário em nome individual
   * não se aplicam, e o esquema não os exige.
   *
   * Não é o painel que o escreve — vem do repositório, como o
   * `horarioConfirmado` (ver `gravarCasa`).
   */
  operador: z
    .object({
      /** Nome completo (empresário em nome individual) ou firma (sociedade). */
      nome: z.string().min(1),
      forma: z.enum([
        "empresario-em-nome-individual",
        "sociedade-unipessoal-por-quotas",
        "sociedade-por-quotas",
        "sociedade-anonima",
        "outra",
      ]),
      /** NIF ou NIPC, nove algarismos. */
      nif: z.string().regex(/^\d{9}$/, "nove algarismos"),
      /** A sede ou o domicílio profissional — pode não ser a morada da casa. */
      sede: z.string().min(1),
      /** Conservatória e número de matrícula. Só sociedades. */
      registo: z.string().min(1).nullable(),
      /** Capital social, escrito como o contabilista o der ("5 000,00 €"). Só sociedades. */
      capitalSocial: z.string().min(1).nullable(),
      /** O email para pedidos sobre dados pessoais. `null` usa o da casa. */
      emailPrivacidade: z.email().nullable(),
    })
    .superRefine((o, ctx) => {
      const sociedade = o.forma.startsWith("sociedade");
      if (sociedade && !o.registo) {
        ctx.addIssue({ code: "custom", path: ["registo"], message: "uma sociedade indica a conservatória e a matrícula" });
      }
      if (sociedade && !o.capitalSocial) {
        ctx.addIssue({ code: "custom", path: ["capitalSocial"], message: "uma sociedade indica o capital social" });
      }
    })
    .nullable(),
  /**
   * A entidade de resolução alternativa de litígios de consumo indicada em
   * `/informacao-legal` (Lei 144/2015, art. 18.º). A obrigação de informar
   * existe **com ou sem adesão** e com ou sem vendas online: a casa indica a
   * entidade disponível para os seus clientes.
   *
   * Hoje é o **CICAP**, por ser o centro com competência territorial para
   * Valongo (está na lista de municípios em cicap.pt) — o que não quer dizer
   * que a casa tenha aderido, nem que o centro aprecie todo e qualquer
   * conflito (tem limites de valor e de matéria; ver o site dele). **Por
   * confirmar com o cliente.** Se a casa aderir a um centro, fica `adesao: true`
   * e a página di-lo; aderir a outro não apaga a competência deste.
   *
   * `adesao: null` é **não sabemos**, e a página não diz nada sobre adesão.
   *
   * `null` no objeto inteiro é **por confirmar**: a secção fica, com o aviso de
   * que a entidade está por indicar e o link para a lista oficial — nunca
   * desaparece, porque é informação obrigatória.
   */
  litigios: z
    .object({
      nome: z.string().min(1),
      url: z.url(),
      adesao: z.boolean().nullable(),
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
 * O que falta confirmar antes de as páginas legais poderem ser dadas como
 * fechadas. Não parte o build — o site continua a poder ser publicado com a
 * pendência à vista —, mas aparece no registo do build e nas páginas. Ver
 * `docs/decisoes-pendentes.md`.
 */
export function pendenciasLegais(): string[] {
  return [
    ...(cafe.operador
      ? []
      : ["cafe.json: operador (nome ou firma, forma jurídica, NIF, sede) por confirmar"]),
    ...(cafe.operador && !cafe.operador.emailPrivacidade
      ? ["cafe.json: operador.emailPrivacidade por confirmar (usa-se o email da casa)"]
      : []),
    ...(cafe.litigios ? [] : ["cafe.json: litigios (entidade RAL) por confirmar"]),
    ...(cafe.litigios && cafe.litigios.adesao === null
      ? ["cafe.json: litigios.adesao por confirmar (a página não fala de adesão)"]
      : []),
  ];
}

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

/** O número nacional sem espaços: `229730873`. */
function numeroNacional(): string | null {
  return cafe.telefone ? cafe.telefone.replace(/\s+/g, "").replace(/^\+351/, "") : null;
}

/**
 * O número para o `href="tel:"`, com o indicativo: `+351229730873`.
 *
 * Sem o `+351`, um telemóvel com cartão estrangeiro — metade de quem abre a
 * versão inglesa — ligava para um número que no país dele não existe. Um
 * número nacional português tem nove algarismos; o que não for isso (um número
 * já escrito com indicativo, por exemplo) segue tal e qual.
 */
export function telefoneParaLigar(): string | null {
  const numero = numeroNacional();
  if (!numero) return null;
  return /^\d{9}$/.test(numero) ? `+351${numero}` : numero;
}

/** Como os dados estruturados o querem: `+351 229 730 873`. */
export function telefoneInternacional(): string | null {
  const numero = telefoneParaLigar();
  const m = numero?.match(/^\+351(\d{3})(\d{3})(\d{3})$/);
  return m ? `+351 ${m[1]} ${m[2]} ${m[3]}` : numero;
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
  const numero = numeroNacional();
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
