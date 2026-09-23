import type { Artigo } from "@/data/ementa";

/**
 * O que mudou na carta entre duas versões, contado em **gestos** e não em
 * bytes: um preço mudado é um, um artigo novo é um, uma categoria reordenada é
 * um.
 *
 * Tem dois leitores, e é por isso que não importa `server-only`: o editor usa-o
 * para o número no botão de publicar ("Publicar (3)"), e a server action para a
 * mensagem do commit. A mensagem é calculada **no servidor**, a partir do que
 * está no repositório — não é texto que o browser mande e o commit aceite.
 */
export type Alteracoes = {
  precos: number;
  novos: number;
  apagados: number;
  textos: number;
  escondidos: number;
  mostrados: number;
  /** Quantas categorias mudaram de ordem. */
  ordem: number;
};

function mesmoTexto(a: Artigo["nome"] | null, b: Artigo["nome"] | null): boolean {
  if (a === null || b === null) return a === b;
  return a.pt === b.pt && a.en === b.en;
}

export function compararCartas(antes: Artigo[], depois: Artigo[]): Alteracoes {
  const anteriores = new Map(antes.map((a) => [a.id, a]));
  const atuais = new Set(depois.map((a) => a.id));
  const contas: Alteracoes = {
    precos: 0,
    novos: 0,
    apagados: 0,
    textos: 0,
    escondidos: 0,
    mostrados: 0,
    ordem: 0,
  };

  for (const artigo of depois) {
    const era = anteriores.get(artigo.id);
    if (!era) {
      contas.novos += 1;
      continue;
    }
    if (era.preco !== artigo.preco || era.precoSecundario !== artigo.precoSecundario) {
      contas.precos += 1;
    }
    if (!mesmoTexto(era.nome, artigo.nome) || !mesmoTexto(era.descricao, artigo.descricao)) {
      contas.textos += 1;
    }
    if (era.escondido !== artigo.escondido) {
      if (artigo.escondido) contas.escondidos += 1;
      else contas.mostrados += 1;
    }
  }
  for (const id of anteriores.keys()) if (!atuais.has(id)) contas.apagados += 1;

  /* A ordem compara-se só entre os artigos que estão dos dois lados: um artigo
     novo no fim ou um apagado a meio não é "mudar a ordem". */
  const categorias = new Set(depois.map((a) => a.categoria));
  for (const categoria of categorias) {
    const ordemAntes = antes
      .filter((a) => a.categoria === categoria && atuais.has(a.id))
      .map((a) => a.id);
    const ordemDepois = depois
      .filter((a) => a.categoria === categoria && anteriores.has(a.id))
      .map((a) => a.id);
    if (ordemAntes.join() !== ordemDepois.join()) contas.ordem += 1;
  }

  return contas;
}

export function totalDeAlteracoes(contas: Alteracoes): number {
  return Object.values(contas).reduce((soma, n) => soma + n, 0);
}

/** `"2 preços, 1 artigo novo, ordem de 1 categoria"` — para a mensagem do commit. */
export function resumirAlteracoes(contas: Alteracoes): string {
  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  const partes: string[] = [];
  if (contas.precos) partes.push(plural(contas.precos, "preço", "preços"));
  if (contas.novos) partes.push(plural(contas.novos, "artigo novo", "artigos novos"));
  if (contas.apagados) partes.push(plural(contas.apagados, "apagado", "apagados"));
  if (contas.textos) partes.push(plural(contas.textos, "texto", "textos"));
  if (contas.escondidos) partes.push(plural(contas.escondidos, "escondido", "escondidos"));
  if (contas.mostrados) partes.push(plural(contas.mostrados, "de volta", "de volta"));
  if (contas.ordem) partes.push(`ordem de ${plural(contas.ordem, "categoria", "categorias")}`);
  return partes.join(", ") || "sem alterações";
}
