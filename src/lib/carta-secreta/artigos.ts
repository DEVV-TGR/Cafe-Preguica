import "server-only";
import type { Locale } from "@/i18n/routing";

/*
  O que está na carta secreta.

  ⚠️ **Provisório: são exemplos, para se experimentar a secção.** Nenhum destes
  cocktails existe. O passo seguinte é um campo `secreto` em cada artigo do
  `ementa.json`, que o painel liga e desliga — e, como qualquer campo novo num
  esquema de `src/data/`, **o painel tem de o saber escrever** (ver AGENTS.md).

  ## Porque é que vive aqui e não no `ementa.json`

  Porque o que está no `ementa.json` vai para o HTML da `/ementa`, que é
  estático, e aí qualquer pessoa o lia no código da página. Isto só sai do
  servidor pela `/api/carta-secreta`, depois de o Resend confirmar que o email
  está inscrito. (O repositório é público, por isso o segredo é "de bar" — ver
  `docs/NEWSLETTER.md`.)
*/

type Texto = Record<Locale, string>;

export type ArtigoSecreto = { id: string; nome: Texto; descricao: Texto; preco: number };

const ARTIGOS: ArtigoSecreto[] = [
  {
    id: "exemplo-noite-lenta",
    nome: { pt: "Noite Lenta (exemplo)", en: "Slow Night (example)" },
    descricao: {
      pt: "Rum escuro, café, baunilha e casca de laranja.",
      en: "Dark rum, coffee, vanilla and orange peel.",
    },
    preco: 7.5,
  },
  {
    id: "exemplo-ramo-verde",
    nome: { pt: "Ramo Verde (exemplo)", en: "Green Branch (example)" },
    descricao: {
      pt: "Gin, matcha, lima e água tónica.",
      en: "Gin, matcha, lime and tonic water.",
    },
    preco: 7.0,
  },
  {
    id: "exemplo-preguica-dourada",
    nome: { pt: "Preguiça Dourada (exemplo)", en: "Golden Sloth (example)" },
    descricao: {
      pt: "Whisky, mel, gengibre e limão, servido com fumo.",
      en: "Whisky, honey, ginger and lemon, served with smoke.",
    },
    preco: 8.0,
  },
  {
    id: "exemplo-sem-pressa",
    nome: { pt: "Sem Pressa (exemplo)", en: "No Rush (example)" },
    descricao: {
      pt: "Sem álcool: maracujá, manjericão e ginger ale.",
      en: "Alcohol free: passion fruit, basil and ginger ale.",
    },
    preco: 5.0,
  },
];

/** Os artigos já na língua pedida — é assim que seguem para o browser. */
export function artigosSecretos(lingua: Locale) {
  return ARTIGOS.map(({ id, nome, descricao, preco }) => ({
    id,
    nome: nome[lingua],
    descricao: descricao[lingua],
    preco,
  }));
}
