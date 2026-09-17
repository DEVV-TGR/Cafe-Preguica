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

const Horario = z
  .object({
    abre: z.string().regex(/^\d{2}:\d{2}$/, "formato 00:00"),
    fecha: z.string().regex(/^\d{2}:\d{2}$/, "formato 00:00"),
  })
  /** `null` num dia é **encerrado**, e o site escreve-o com todas as letras. */
  .nullable();

const Esquema = z.object({
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
});

export type Cafe = z.infer<typeof Esquema>;
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

const validado = Esquema.safeParse(dados);
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
