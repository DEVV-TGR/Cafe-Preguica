import { z } from "zod";
import { erroDeFicheiro } from "./erros";
import dados from "./marca.json";

/**
 * Factos sobre a casa — e **só factos**.
 *
 * O texto que descreve o café (a frase do herói, a história, o que se diz sobre
 * o espaço) vive em `messages/pt.json` e `messages/en.json`, porque muda com o
 * idioma. Aqui fica o que é igual nas duas línguas: o nome, o ano, os endereços
 * das redes.
 *
 * Misturar as duas coisas é o erro que se paga meses depois, quando alguém
 * traduz o site e descobre metade do texto num ficheiro que não tem idioma.
 */
const Esquema = z.object({
  nome: z.string().min(1),
  /** Ano de fundação. `null` enquanto não se confirmar com o cliente. */
  fundacao: z.number().int().min(1800).max(new Date().getFullYear()).nullable(),
  /* Os perfis a `null` não aparecem no rodapé. Um link de rede social
     adivinhado leva o visitante à conta de outra pessoa. */
  instagram: z.url().nullable(),
  facebook: z.url().nullable(),
});

export type Marca = z.infer<typeof Esquema>;

const validado = Esquema.safeParse(dados);
if (!validado.success) {
  throw erroDeFicheiro("marca.json", validado.error, dados);
}

export const marca: Marca = validado.data;

/** Os perfis que existem mesmo, prontos para o rodapé e para o `sameAs`. */
export const redes: string[] = [marca.instagram, marca.facebook].filter(
  (url): url is string => url !== null,
);
