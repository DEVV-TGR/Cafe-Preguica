import { z } from "zod";
import { erroDeFicheiro } from "./erros";
import dados from "./ementa.json";

/**
 * A ementa inteira vive em `ementa.json`, onde `categoria` decide a secção e a
 * ordem, e o `id` é a chave.
 *
 * **Acrescentar, tirar ou mudar o preço de um artigo é editar esse ficheiro e
 * mais nada.** Não há base de dados nem área de administração: para uma carta
 * que muda duas ou três vezes por ano, um ficheiro versionado ganha a um CMS —
 * histórico no git, sem palavra-passe para esquecer, sem custo mensal, e sem
 * mais um serviço com sessão iniciada a poder ser comprometido.
 *
 * O ficheiro é editado à mão, por isso é validado com `zod` no arranque. Um
 * preço escrito como texto rebenta o `npm run build` com o artigo e o campo
 * identificados, em vez de chegar a produção como `NaN €`.
 */

/**
 * ⚠️ **Os artigos que lá estão são de demonstração e os preços são inventados.**
 * Servem para a estrutura se ver de pé e para o `build` ter o que validar.
 * Nenhum deles foi confirmado com a casa.
 *
 * É isso que o `confirmada: false` no topo do JSON diz, e enquanto for `false` a
 * página da ementa mostra o aviso a dizê-lo. **Passar a `true` é uma decisão, e
 * faz-se com a carta da casa à frente** — não por o site já parecer pronto.
 */
export const CARTA_CONFIRMADA: boolean = dados.confirmada;

/**
 * A ordem do enum **é** a ordem em que as secções saem na página — mudar uma
 * linha de sítio aqui muda o site. Está pela ordem do dia: começa no
 * pequeno-almoço e acaba no que se bebe ao fim da tarde.
 */
export const CATEGORIAS = [
  "pequenos-almocos",
  "cafetaria",
  "padaria-pastelaria",
  "salgados",
  "sandes-e-tostas",
  "pratos-do-dia",
  "bebidas-frias",
  "cervejas-e-vinhos",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

/**
 * As categorias que são **listas de nome e preço**, sem descrição — ninguém
 * escreve uma frase sobre um café ou sobre uma água de 50 cl, e inventar-lhe uma
 * é escrever ementa que a casa não escreveu.
 *
 * A regra é imposta pelo `superRefine` mais abaixo, nos dois sentidos: uma
 * descrição aqui dá erro, e a falta dela nas outras categorias também.
 */
const SEM_DESCRICAO: readonly Categoria[] = [
  "cafetaria",
  "padaria-pastelaria",
  "salgados",
  "bebidas-frias",
  "cervejas-e-vinhos",
];

/**
 * Os 14 alergénios de declaração obrigatória do Anexo II do Regulamento (UE)
 * n.º 1169/2011. A lista é fechada de propósito: escrita à mão, daí a três
 * meses havia `gluten`, `glúten` e `Glúten` no mesmo ficheiro e nenhum filtro
 * funcionava.
 */
export const ALERGENIOS = [
  "gluten",
  "crustaceos",
  "ovos",
  "peixe",
  "amendoins",
  "soja",
  "leite",
  "frutos-de-casca-rija",
  "aipo",
  "mostarda",
  "sesamo",
  "sulfitos",
  "tremoco",
  "moluscos",
] as const;

export type Alergenio = (typeof ALERGENIOS)[number];

const Texto = z.object({ pt: z.string().min(1), en: z.string().min(1) });

const EsquemaArtigo = z
  .object({
    /* Minúsculas e hífenes: o `id` vai para o `key` do React e para a âncora da
       secção, e um espaço ou um acento num `href="#..."` parte a navegação. */
    id: z
      .string()
      .regex(/^[a-z0-9-]+$/, "só minúsculas, números e hífenes"),
    categoria: z.enum(CATEGORIAS),
    nome: Texto,
    descricao: Texto.nullable(),
    /**
     * `null` é **preço por confirmar ou variável** (o prato do dia), e o site
     * escreve-o em vez de mostrar um número errado.
     *
     * O `multipleOf(0.01)` apanha o `1.333` que vem de uma conta feita à mão: um
     * preço com três casas decimais arredonda na apresentação e passa a haver
     * dois preços para o mesmo artigo, o do site e o do balcão.
     */
    preco: z
      .number()
      .positive("tem de ser maior que zero")
      .multipleOf(0.01, "no máximo duas casas decimais")
      .nullable(),
    alergenios: z.array(z.enum(ALERGENIOS)),
  })
  .superRefine((artigo, ctx) => {
    const eLista = SEM_DESCRICAO.includes(artigo.categoria);

    if (eLista && artigo.descricao !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["descricao"],
        message: `a categoria "${artigo.categoria}" é uma lista de nome e preço — a descrição tem de ser null`,
      });
    }

    if (!eLista && artigo.descricao === null) {
      ctx.addIssue({
        code: "custom",
        path: ["descricao"],
        message: `a categoria "${artigo.categoria}" leva descrição nas duas línguas`,
      });
    }
  });

export type Artigo = z.infer<typeof EsquemaArtigo>;

const EsquemaEmenta = z.object({
  confirmada: z.boolean(),
  artigos: z
    .array(EsquemaArtigo)
    .min(1)
    /* Um `id` repetido dá duas âncoras iguais e um aviso de `key` duplicada no
       React — e é o erro mais fácil de cometer a copiar uma linha para criar a
       seguinte. */
    .superRefine((artigos, ctx) => {
      const vistos = new Set<string>();
      artigos.forEach((artigo, indice) => {
        if (vistos.has(artigo.id)) {
          ctx.addIssue({
            code: "custom",
            path: [indice, "id"],
            message: `o id "${artigo.id}" está repetido`,
          });
        }
        vistos.add(artigo.id);
      });
    }),
});

const validado = EsquemaEmenta.safeParse(dados);
if (!validado.success) {
  throw erroDeFicheiro("ementa.json", validado.error, dados.artigos);
}

export const artigos: Artigo[] = validado.data.artigos;

/**
 * Os artigos agrupados por categoria, **pela ordem do enum** e já sem as
 * categorias vazias — uma secção sem artigos não aparece na página em vez de
 * aparecer como um título solto.
 *
 * É uma função e não uma constante porque depende do JSON validado acima; se
 * fosse avaliada antes, apanhava o array vazio.
 */
export function porCategoria(): { categoria: Categoria; artigos: Artigo[] }[] {
  return CATEGORIAS.map((categoria) => ({
    categoria,
    artigos: artigos.filter((artigo) => artigo.categoria === categoria),
  })).filter((seccao) => seccao.artigos.length > 0);
}

/**
 * Se **algum** artigo já tem alergénios declarados.
 *
 * Enquanto for `false`, a página mostra o aviso de que a informação está
 * disponível no balcão — que é o que a lei aceita, e é honesto. O que não se
 * pode é deduzir alergénios das descrições: isso é informação de saúde inventada
 * por quem não está na cozinha.
 */
export function temAlergeniosDeclarados(): boolean {
  return artigos.some((artigo) => artigo.alergenios.length > 0);
}
