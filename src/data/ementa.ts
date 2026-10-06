import { z } from "zod";
import { erroDeFicheiro } from "./erros";
import dados from "./ementa.json";

/**
 * A ementa inteira vive em `ementa.json`, onde `categoria` decide a secção e a
 * ordem, e o `id` é a chave.
 *
 * **Acrescentar, tirar ou mudar o preço de um artigo é editar esse ficheiro e
 * mais nada** — à mão, ou pelo painel (`/painel/ementa`), que faz exatamente o
 * mesmo: grava o ficheiro no repositório com um commit, e a Vercel reconstrói o
 * site. Não há base de dados: para uma carta que muda umas vezes por ano, um
 * ficheiro versionado ganha — histórico no git, sem custo mensal, e o site
 * continua estático. Ver `docs/PAINEL.md`.
 *
 * O ficheiro é validado com `zod` no arranque, e **o painel valida com o mesmo
 * esquema** antes de gravar (é por isso que `EsquemaEmenta` é exportado). Um
 * preço escrito como texto rebenta o `npm run build` com o artigo e o campo
 * identificados, em vez de chegar a produção como `NaN €`.
 */

/**
 * ⚠️ **Os artigos foram transcritos do PDF do menu digital da casa, mas
 * ninguém da casa os reviu.** Uma transcrição à mão de 125 linhas tem erros, e
 * o PDF não tem data — pode já não ser o que está nas mesas.
 *
 * É isso que o `confirmada: false` no topo do JSON diz, e enquanto for `false` a
 * página da ementa mostra o aviso a dizê-lo. **Passar a `true` é uma decisão, e
 * faz-se com a carta da casa à frente** — não por o site já parecer pronto.
 */
export const CARTA_CONFIRMADA: boolean = dados.confirmada;

/**
 * A ordem do enum **é** a ordem em que as secções saem na página — mudar uma
 * linha de sítio aqui muda o site.
 *
 * É a ordem que a casa pediu na reunião de 2026-09-23: come-se primeiro, depois
 * os cocktails, os sem álcool, a garrafeira, as águas e, a fechar, o café. **O
 * Cocktail Preguiça vem à frente dos clássicos** por ser o que dá nome à casa, e
 * **o Unicórnio à frente das águas** pela mesma razão — são a mesma bebida, um
 * com álcool e o outro sem.
 */
export const CATEGORIAS = [
  "tostas-e-snacks",
  "tabuas",
  "tacas",
  "sobremesas",
  "cocktail-preguica",
  "cocktails-classicos",
  "cocktails-special",
  "sangrias-e-espumantes",
  "mocktails",
  "gin",
  "whisky",
  "shots",
  "licores",
  "cervejas",
  "vinhos",
  "unicornio",
  "aguas-e-refrigerantes",
  "cafetaria",
  "chas",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

/**
 * Os seis capítulos da carta, e as secções de cada um — pela ordem que a casa
 * pediu.
 *
 * Existem por causa de **quem lê a carta: alguém sentado à mesa, com o
 * telemóvel, que acabou de ler o QR.** Dezanove secções num índice são dezanove
 * botões para percorrer de lado; seis cabem no ecrã e respondem à pergunta que
 * a pessoa traz — "quero comer", "quero um cocktail", "sem álcool".
 *
 * O Unicórnio está nas águas e não nos cocktails: é um sumo, não leva álcool, e
 * quem procura uma bebida sem álcool não a vai procurar entre os cocktails.
 *
 * ⚠️ **A ordem das secções vem de `CATEGORIAS`, não daqui.** Esta lista diz só a
 * que capítulo pertence cada uma, e a verificação logo abaixo rebenta o `build`
 * se uma categoria nova ficar sem capítulo — senão desaparecia da carta sem
 * erro nenhum.
 */
export const CAPITULOS = {
  comer: ["tostas-e-snacks", "tabuas", "tacas", "sobremesas"],
  cocktails: [
    "cocktail-preguica",
    "cocktails-classicos",
    "cocktails-special",
    "sangrias-e-espumantes",
  ],
  mocktails: ["mocktails"],
  garrafeira: ["gin", "whisky", "shots", "licores", "cervejas", "vinhos"],
  aguas: ["unicornio", "aguas-e-refrigerantes"],
  cafetaria: ["cafetaria", "chas"],
} as const satisfies Record<string, readonly Categoria[]>;

export type Capitulo = keyof typeof CAPITULOS;

{
  const arrumadas: Categoria[] = Object.values(CAPITULOS).flat();
  const semCapitulo = CATEGORIAS.filter((c) => !arrumadas.includes(c));
  const repetidas = arrumadas.filter((c, i) => arrumadas.indexOf(c) !== i);
  if (semCapitulo.length > 0 || repetidas.length > 0) {
    throw new Error(
      `ementa.ts: CAPITULOS tem de ter cada categoria uma vez só — ` +
        `sem capítulo: [${semCapitulo.join(", ")}], repetidas: [${repetidas.join(", ")}]`,
    );
  }
}

/**
 * As categorias que são **listas de nome e preço**, sem descrição — ninguém
 * escreve uma frase sobre um café ou sobre uma água de 50 cl, e inventar-lhe uma
 * é escrever ementa que a casa não escreveu.
 *
 * A regra é imposta pelo `superRefine` mais abaixo, nos dois sentidos: uma
 * descrição aqui dá erro, e a falta dela nas outras categorias também.
 */
export const SEM_DESCRICAO: readonly Categoria[] = [
  "tostas-e-snacks",
  "tacas",
  "sobremesas",
  "gin",
  "whisky",
  "shots",
  "licores",
  "cervejas",
  "vinhos",
  "cafetaria",
  "chas",
  "aguas-e-refrigerantes",
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

/**
 * O que é próprio de cada secção e não de cada artigo: a dose em que se serve, e
 * o que querem dizer as duas colunas de preço (tostas e vinhos).
 *
 * Vem antes do esquema porque o esquema a usa: só uma secção com `colunas`
 * aceita segundo preço.
 *
 * Vive aqui e não nas mensagens porque **é facto, não texto** — `5 cl` é `5 cl`
 * em português e em inglês. O que muda com a língua são os nomes das secções, e
 * esses estão em `messages/`.
 *
 * As categorias que não aparecem aqui não têm nada de especial a dizer, e o
 * `Partial` é o que deixa isso ser verdade sem obrigar a escrever `undefined`
 * dezoito vezes.
 */
export const METADADOS: Partial<
  Record<Categoria, { dose?: string; colunas?: [string, string] }>
> = {
  "tostas-e-snacks": { colunas: ["Pão saloio", "Pão de forma"] },
  vinhos: { colunas: ["Copo", "Garrafa"] },
  gin: { dose: "5 cl" },
  whisky: { dose: "5 cl" },
  shots: { dose: "3 cl" },
};

/**
 * Os artigos que as páginas pedem **pelo `id`**: as legendas das fotografias da
 * inicial (o carril, "Para partilhar") e as aberturas de capítulo da ementa.
 *
 * Existe para o painel: **estes não se podem apagar por lá.** Apagar um deles
 * partia o `build` da ementa ou deixava um buraco na página inicial, e quem
 * está ao balcão não tem como saber que aquele cocktail tem fotografia. Podem
 * ser escondidos, que não parte nada.
 *
 * ⚠️ Quem pede um `id` novo numa página tem de o pôr aqui — e se não puser, o
 * `build` rebenta a dizer qual (ver as verificações em `CartaoCarril`, em
 * `Pratos` e na página da ementa).
 */
export const EM_DESTAQUE: readonly string[] = [
  "negroni",
  "blue-lagoon",
  "cocktail-preguica",
  "bocadinhos-de-pao-com-chourico",
  "torrada-com-compota",
  "caf-chocolate-quente-com-chantilly",
  /* A sessão do Rafael (2026-10). */
  "preguicinhas-com-queijo",
  "petit-gateau-com-gelado-de-baunilha",
  "aperol-spritz",
  "mojito",
  "mojito-melancia",
  "caipirinha",
  "margarita",
  "long-island-ice-tea",
  "gin-tanqueray",
  "gin-tanqueray-sevilla",
  "sho-b52",
  "caf-gluehwein",
];

/**
 * As categorias de onde podem sair os cocktails da **carta secreta** — a que só
 * abre a quem recebe a newsletter (`components/ementa/CartaSecreta.tsx`).
 *
 * Só cocktails, por decisão do Tomás. O Cocktail Preguiça fica de fora: é o da
 * casa, tem o jogo dos sabores e fotografia na inicial.
 */
export const CATEGORIAS_SECRETAS: readonly Categoria[] = ["cocktails-classicos", "cocktails-special"];

/* Os tetos não vêm de nenhuma regra da casa — o nome mais comprido da carta tem
   42 letras e a descrição mais comprida 136. Existem por causa do painel: um
   texto colado de outro sítio sem querer passava a ser um artigo com um
   parágrafo por nome, e partia a coluna da ementa no telemóvel. */
function texto(maximo: number) {
  return z.object({
    pt: z.string().trim().min(1).max(maximo, `no máximo ${maximo} caracteres`),
    en: z.string().trim().min(1).max(maximo, `no máximo ${maximo} caracteres`),
  });
}

const EsquemaArtigo = z
  .object({
    /* Minúsculas e hífenes: o `id` vai para o `key` do React e para a âncora da
       secção, e um espaço ou um acento num `href="#..."` parte a navegação. */
    id: z
      .string()
      .regex(/^[a-z0-9-]+$/, "só minúsculas, números e hífenes"),
    categoria: z.enum(CATEGORIAS),
    nome: texto(80),
    descricao: texto(300).nullable(),
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
    /**
     * O segundo preço, para as secções que no menu impresso têm **duas colunas
     * de números à volta do mesmo nome**: as tostas (pão saloio e pão de forma)
     * e os vinhos (copo e garrafa).
     *
     * Fica `null` em tudo o resto — e também num artigo dessas secções que não
     * tem o segundo (o Vinho do Porto não se vende à garrafa). O que cada coluna
     * quer dizer não vive aqui: vive em `METADADOS`, por categoria, porque é uma
     * propriedade da secção e não de cada artigo.
     */
    precoSecundario: z
      .number()
      .positive("tem de ser maior que zero")
      .multipleOf(0.01, "no máximo duas casas decimais")
      .nullable(),
    alergenios: z.array(z.enum(ALERGENIOS)),
    /**
     * Fora da carta por agora, sem ser apagado — o que acabou, o que é da
     * estação. É o painel que o liga e desliga; apagar e voltar a criar perdia
     * as traduções e o lugar na lista.
     *
     * Sai da `/ementa` (`porCategoria`) mas **não** do `artigoPorId`, e é de
     * propósito: as legendas das fotografias da página inicial pedem-no pelo
     * `id`, e um artigo esgotado não deve deixar um buraco no carril.
     */
    escondido: z.boolean(),
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

    /* Um segundo preço numa secção sem colunas é quase de certeza um engano de
       quem copiou a linha de cima para criar a seguinte — e passaria
       despercebido, porque a página mostraria dois números sem dizer de quê. */
    if (artigo.precoSecundario !== null && !METADADOS[artigo.categoria]?.colunas) {
      ctx.addIssue({
        code: "custom",
        path: ["precoSecundario"],
        message: `a categoria "${artigo.categoria}" não tem duas colunas de preço; aqui tem de ser null`,
      });
    }

    /* E um segundo preço sem o primeiro não quer dizer nada. */
    if (artigo.precoSecundario !== null && artigo.preco === null) {
      ctx.addIssue({
        code: "custom",
        path: ["preco"],
        message: "há segundo preço mas não há primeiro",
      });
    }
  });

export type Artigo = z.infer<typeof EsquemaArtigo>;

/**
 * Um sabor do Cocktail Preguiça e do Unicórnio.
 *
 * ⚠️ **Não são artigos da ementa, e é de propósito.** A casa vende duas bebidas
 * — uma com álcool, outra sem — e o sabor escolhe-se depois, ao balcão. Pô-los
 * como artigos dava duas entradas por sabor e outros tantos sítios para o preço
 * ficar desactualizado. A lista é **uma só para as duas bebidas**, como no menu
 * impresso.
 *
 * Viviam no código (`sabores.ts`) e passaram para aqui para o painel os poder
 * mudar, acrescentar e tirar.
 */
const EsquemaSabor = z.object({
  /* Só para o `key` do React; o painel tira-o do nome. */
  id: z.string().regex(/^[a-z0-9-]+$/, "só minúsculas, números e hífenes"),
  nome: texto(30),
  /**
   * A cor do copo no jogo dos sabores. **É decoração, não a cor da bebida** —
   * ninguém a mediu (ver `components/ementa/Sabores.tsx`).
   *
   * `null` é o arco-íris da "Surpresa": não há uma cor que diga "qualquer um".
   */
  cor: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "uma cor como #e3d34a")
    .nullable(),
});

export type Sabor = z.infer<typeof EsquemaSabor>;

export const EsquemaEmenta = z
  .object({
    confirmada: z.boolean(),
    /**
     * Os `id` dos cocktails da **carta secreta**, pela ordem em que lá
     * aparecem. Um artigo desta lista **sai da carta normal** e só se mostra a
     * quem está na newsletter; tirá-lo daqui devolve-o à carta, no sítio onde
     * estava. É o painel que a escreve.
     *
     * Uma lista, e não um campo em cada artigo, porque a carta secreta tem a sua
     * própria ordem — e porque assim sair dela não mexe no artigo.
     */
    secretos: z.array(z.string()),
    /**
     * Os sabores, pela ordem em que aparecem no jogo — a do menu impresso, que
     * lê em duas colunas. Pelo menos um: o jogo sem sabores era um botão que
     * não fazia nada.
     */
    sabores: z
      .array(EsquemaSabor)
      .min(1, "tem de haver pelo menos um sabor")
      .superRefine((sabores, ctx) => {
        const vistos = new Set<string>();
        sabores.forEach((sabor, indice) => {
          if (vistos.has(sabor.id)) {
            ctx.addIssue({
              code: "custom",
              path: [indice, "id"],
              message: `o sabor "${sabor.nome.pt}" está repetido`,
            });
          }
          vistos.add(sabor.id);
        });
      }),
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
  })
  /* A carta secreta só com cocktails que existem, uma vez cada, e nenhum com
     fotografia no site: a legenda da fotografia contava o segredo na inicial. */
  .superRefine(({ secretos, artigos: lista }, ctx) => {
    const porId = new Map(lista.map((a) => [a.id, a]));
    secretos.forEach((id, indice) => {
      const artigo = porId.get(id);
      const erro = (message: string) =>
        ctx.addIssue({ code: "custom", path: ["secretos", indice], message });
      if (secretos.indexOf(id) !== indice) erro(`"${id}" está duas vezes na carta secreta`);
      else if (!artigo) erro(`"${id}" está na carta secreta mas não existe na carta`);
      else if (!CATEGORIAS_SECRETAS.includes(artigo.categoria)) {
        erro(`"${artigo.nome.pt}" não é um cocktail — a carta secreta só leva cocktails`);
      } else if (EM_DESTAQUE.includes(id)) {
        erro(`"${artigo.nome.pt}" tem fotografia no site e não pode ir para a carta secreta`);
      }
    });
  });

export type Ementa = z.infer<typeof EsquemaEmenta>;

const validado = EsquemaEmenta.safeParse(dados);
if (!validado.success) {
  throw erroDeFicheiro("ementa.json", validado.error, dados.artigos);
}

export const artigos: Artigo[] = validado.data.artigos;

/** Os sabores do jogo, pela ordem do ficheiro. */
export const sabores: Sabor[] = validado.data.sabores;

const idsSecretos: string[] = validado.data.secretos;
const secretos = new Set(idsSecretos);

/**
 * Os cocktails da carta secreta, pela ordem dela, sem os escondidos.
 *
 * ⚠️ **Só para o servidor.** Quem os mostra é a `/api/carta-secreta`,
 * depois de o Resend confirmar o email; a `/ementa` só pergunta se há algum
 * (para mostrar ou não a secção), e nunca os põe no HTML.
 */
export function artigosDaCartaSecreta(): Artigo[] {
  return idsSecretos
    .map((id) => artigos.find((a) => a.id === id))
    .filter((a): a is Artigo => a !== undefined && !a.escondido);
}

/**
 * Os artigos agrupados por categoria, **pela ordem do enum**, sem os escondidos,
 * sem os da carta secreta, e já sem as categorias vazias — uma secção sem artigos não aparece na página em vez de
 * aparecer como um título solto.
 *
 * É uma função e não uma constante porque depende do JSON validado acima; se
 * fosse avaliada antes, apanhava o array vazio.
 */
export function porCategoria(): { categoria: Categoria; artigos: Artigo[] }[] {
  return CATEGORIAS.map((categoria) => ({
    categoria,
    artigos: artigos.filter(
      (artigo) =>
        artigo.categoria === categoria && !artigo.escondido && !secretos.has(artigo.id),
    ),
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

/**
 * As secções que levam o jogo dos sabores por baixo (`components/ementa/
 * Sabores.tsx`). São duas porque são a mesma bebida — o Cocktail Preguiça com
 * álcool, o Unicórnio sem — e cada uma vive no seu capítulo.
 */
export const COM_SABORES: readonly Categoria[] = ["cocktail-preguica", "unicornio"];

/**
 * Os capítulos com as suas secções já preenchidas, pela ordem de `CATEGORIAS`,
 * e sem os capítulos que ficarem vazios.
 */
export function porCapitulo(): {
  capitulo: Capitulo;
  seccoes: { categoria: Categoria; artigos: Artigo[] }[];
}[] {
  const seccoes = porCategoria();
  return (Object.keys(CAPITULOS) as Capitulo[])
    .map((capitulo) => ({
      capitulo,
      seccoes: seccoes.filter((s) =>
        (CAPITULOS[capitulo] as readonly Categoria[]).includes(s.categoria),
      ),
    }))
    .filter((c) => c.seccoes.length > 0);
}

/**
 * Um artigo pelo `id`, para as legendas das fotografias irem buscar nome e preço
 * à carta. Devolve também os escondidos — ver `escondido`.
 */
export function artigoPorId(id: string): Artigo | undefined {
  return artigos.find((artigo) => artigo.id === id);
}


for (const id of EM_DESTAQUE) {
  if (!artigoPorId(id)) {
    throw new Error(`ementa.ts: o artigo em destaque "${id}" não existe em ementa.json`);
  }
}

/** Para as páginas confirmarem, no `build`, que um `id` que pedem está na lista. */
export function exigirEmDestaque(id: string, onde: string): void {
  if (!EM_DESTAQUE.includes(id)) {
    throw new Error(
      `${onde}: o artigo "${id}" é pedido pelo id mas não está em EM_DESTAQUE (src/data/ementa.ts) — o painel deixava apagá-lo`,
    );
  }
}
