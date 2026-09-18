import { z } from "zod";
import { erroDeFicheiro } from "./erros";
import dados from "./avaliacoes.json";

/**
 * As avaliações da casa no Google — a nota, o total e algumas citações.
 *
 * ## As citações são literais, ou não entram
 *
 * ⚠️ O `texto` é copiado **tal e qual** do Google: sem corrigir a ortografia,
 * sem "melhorar" a frase, sem juntar duas avaliações numa. Cortes marcam-se com
 * `…`. Uma citação editada deixa de ser de quem a escreveu — e uma inventada é
 * publicidade enganosa com o nome de um cliente por baixo.
 *
 * Ficam na **língua em que foram escritas**, também na versão inglesa do site:
 * traduzir uma citação é pôr palavras na boca de alguém. O campo `lingua` vai
 * para o atributo `lang`, para o leitor de ecrã as ler com a pronúncia certa.
 *
 * ## A nota envelhece
 *
 * O número de avaliações sobe todas as semanas. `consultadoEm` diz de quando é
 * o que está aqui, para quem o atualizar saber se vale a pena. `nota` a `null`
 * esconde a secção inteira — a mesma regra do `cafe.json`.
 *
 * ## Porque é que não é o widget da Google
 *
 * O widget carrega script e cookies da Google em cada visita, obrigava a abrir
 * a CSP e fazia a página `/cookies` mentir. Assim é texto nosso, e o link para
 * as ler todas é um `<a>` normal.
 */
const Esquema = z.object({
  nota: z.number().min(1).max(5).nullable(),
  total: z.number().int().positive().nullable(),
  consultadoEm: z.iso.date(),
  citacoes: z
    .array(
      z.object({
        texto: z.string().min(1).max(320, "citação longa demais; cortar com …"),
        /** Primeiro nome e inicial, como aparece no Google — nunca o apelido. */
        autor: z.string().min(1),
        estrelas: z.number().int().min(1).max(5),
        /** Mês e ano, `AAAA-MM`. */
        data: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "data em AAAA-MM"),
        lingua: z.enum(["pt", "en", "es", "fr"]),
      }),
    )
    .max(6, "seis no máximo; mais do que isso é um mural, não uma escolha"),
});

export type Avaliacoes = z.infer<typeof Esquema>;
export type Citacao = Avaliacoes["citacoes"][number];

const validado = Esquema.safeParse(dados);
if (!validado.success) {
  throw erroDeFicheiro("avaliacoes.json", validado.error, null);
}

export const avaliacoes: Avaliacoes = validado.data;
