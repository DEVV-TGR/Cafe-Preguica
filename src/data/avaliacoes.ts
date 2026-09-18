import { z } from "zod";
import { erroDeFicheiro } from "./erros";
import dados from "./avaliacoes.json";

/**
 * As avaliações da casa no Google — a nota, o total e algumas citações.
 *
 * ## As citações são literais, ou não entram
 *
 * ⚠️ O `texto` é copiado **tal e qual** do Google: sem corrigir a ortografia,
 * sem "melhorar" a frase, sem juntar duas avaliações numa. Um corte a meio
 * marca-se com `[…]`; um corte no fim não se marca, desde que a frase acabe
 * inteira. Uma citação editada deixa de ser de quem a escreveu — e uma
 * inventada é publicidade enganosa com o nome de um cliente por baixo.
 *
 * ## Porque é que não há estrelas nem data em cada uma
 *
 * O Google mostra a data como "há um mês", que daqui a um ano é mentira, e não
 * mostra as estrelas no texto que se copia. Pôr qualquer um dos dois era
 * deduzir. Fica o nome, que é o que dá a cara pela frase.
 *
 * Só entram avaliações **sem nomes de funcionários**: quem lá trabalha não
 * escolheu aparecer num site.
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
        /* 220 é o que cabe num cartão sem o ecrã fixo transbordar: duas por
           coluna têm de caber num ecrã de portátil ao mesmo tempo. */
        texto: z.string().min(1).max(220, "citação longa demais; cortar com […]"),
        /** Primeiro nome e inicial do apelido — nunca o apelido inteiro. */
        autor: z.string().min(1),
        lingua: z.enum(["pt", "en", "es", "fr"]),
      }),
    )
    /* A secção tem quatro lugares à volta da nota, e cada um troca uma vez
       de citação ao longo da rolagem: oito é o que enche as duas voltas. Com
       menos, os lugares a mais ficam simplesmente vazios na segunda volta. */
    .max(8, "oito no máximo: quatro lugares, duas voltas"),
});

export type Avaliacoes = z.infer<typeof Esquema>;
export type Citacao = Avaliacoes["citacoes"][number];

const validado = Esquema.safeParse(dados);
if (!validado.success) {
  throw erroDeFicheiro("avaliacoes.json", validado.error, null);
}

export const avaliacoes: Avaliacoes = validado.data;
