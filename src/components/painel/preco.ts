/**
 * Ler um preço escrito por uma pessoa.
 *
 * Aceita vírgula e ponto: em Portugal escreve-se `6,20`, mas alguns teclados
 * numéricos de telemóvel dão um ponto, e recusar `6.20` era recusar o que o
 * próprio telemóvel escreveu.
 *
 * Três respostas, e a distinção importa:
 * - um número — é um preço;
 * - `null` — o campo está **vazio**, e na carta isso quer dizer "preço por
 *   confirmar" (ver `preco` em `src/data/ementa.ts`);
 * - `undefined` — não é um preço (letras, zero, três casas decimais). O campo
 *   fica a vermelho e o valor não é mexido.
 *
 * A validação de verdade é o `EsquemaEmenta`, no servidor — esta é a que dá a
 * resposta imediata a quem está a escrever.
 */
export function lerPreco(texto: string): number | null | undefined {
  const limpo = texto.trim().replace(",", ".");
  if (limpo === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return undefined;

  const valor = Number(limpo);
  return valor > 0 ? valor : undefined;
}

/** `6.2` → `"6,20"`; `null` → `""`. Para preencher os campos a partir dos dados. */
export function escreverPreco(valor: number | null): string {
  return valor === null ? "" : valor.toFixed(2).replace(".", ",");
}

/**
 * O identificador de um artigo, tirado do nome: sem acentos, minúsculas e
 * hífenes — "Caipirinha de Maracujá" fica `caipirinha-de-maracuja`. É a regra
 * que o `EsquemaEmenta` exige ao `id`.
 *
 * O id nasce do nome e depois deixa de depender dele: mudar o nome a seguir não
 * muda o id, e é por isso que as fotografias da página inicial continuam a
 * encontrar o artigo.
 */
export function identificadorLivre(nome: string, ocupados: Set<string>): string {
  const base =
    nome
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "artigo";

  if (!ocupados.has(base)) return base;
  for (let n = 2; ; n++) {
    if (!ocupados.has(`${base}-${n}`)) return `${base}-${n}`;
  }
}
