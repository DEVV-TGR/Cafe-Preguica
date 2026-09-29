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
  /** Cocktails que foram para a carta secreta, e que voltaram dela à carta. */
  paraSecreta: number;
  daSecreta: number;
  /** 1 se a carta secreta mudou de ordem (e nada entrou nem saiu). */
  ordemSecreta: number;
};

/** O que se compara: os artigos e a lista da carta secreta. */
export type Carta = { artigos: Artigo[]; secretos?: string[] };

function mesmoTexto(a: Artigo["nome"] | null, b: Artigo["nome"] | null): boolean {
  if (a === null || b === null) return a === b;
  return a.pt === b.pt && a.en === b.en;
}

export function compararCartas(cartaAntes: Carta, cartaDepois: Carta): Alteracoes {
  const antes = cartaAntes.artigos;
  const depois = cartaDepois.artigos;
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
    paraSecreta: 0,
    daSecreta: 0,
    ordemSecreta: 0,
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

  /* A carta secreta: quem entrou, quem saiu (menos os novos e os apagados, que
     já contam como tal), e a ordem — só entre os que estão nas duas versões. A lista
     pode faltar num ficheiro de antes de a carta secreta existir. */
  const secretosAntes = cartaAntes.secretos ?? [];
  const secretosDepois = cartaDepois.secretos ?? [];
  const eraSecreto = new Set(secretosAntes);
  const eSecreto = new Set(secretosDepois);
  /* Um cocktail criado já na carta secreta conta uma vez, como artigo novo:
     para quem o criou foi um gesto só. */
  contas.paraSecreta = secretosDepois.filter(
    (id) => !eraSecreto.has(id) && anteriores.has(id),
  ).length;
  contas.daSecreta = secretosAntes.filter((id) => !eSecreto.has(id) && atuais.has(id)).length;
  const ficaram = (lista: string[], outra: Set<string>) => lista.filter((id) => outra.has(id)).join();
  if (ficaram(secretosAntes, eSecreto) !== ficaram(secretosDepois, eraSecreto)) {
    contas.ordemSecreta = 1;
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
  if (contas.paraSecreta) partes.push(`${contas.paraSecreta} para a carta secreta`);
  if (contas.daSecreta) partes.push(`${contas.daSecreta} de volta da carta secreta`);
  if (contas.ordemSecreta) partes.push("ordem da carta secreta");
  return partes.join(", ") || "sem alterações";
}
