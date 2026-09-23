import { artigos, exigirEmDestaque, type Artigo } from "@/data/ementa";
import { formatarPreco } from "@/lib/preco";
import type { Locale } from "@/i18n/routing";

/**
 * O rótulo. **É o mesmo esquema em todos os objectos da colecção, sem
 * excepção** — nome, facto, dado — e é exactamente isso que faz disto uma
 * colecção em vez de uma grelha de cartões bonitos.
 *
 * ⚠️ O `facto` é **facto**, não venda. `Gin, vodka e rum` é um rótulo de museu;
 * `uma explosão de sabor` não é, e num sítio que é uma carta de bar seria
 * mentira mensurável. A gramática de catálogo proíbe persuasão nos rótulos e a
 * proibição é levada a sério.
 */
export function Rotulo({
  nome,
  facto,
  dado,
}: {
  nome: string;
  facto?: string;
  dado?: string;
}) {
  return (
    <div className="pg-rotulo">
      <h2 className="pg-rotulo__nome">{nome}</h2>
      {facto && <p className="pg-rotulo__facto">{facto}</p>}
      {dado && <p className="pg-rotulo__dado">{dado}</p>}
    </div>
  );
}

/**
 * Um cartão do carril, alimentado **pela ementa** e não por texto repetido nas
 * mensagens.
 *
 * É a razão de existir: o preço do Negroni vive num sítio só, em
 * `src/data/ementa.json`. Se alguém o mudar lá, muda aqui. Escrever "6,20 €" à
 * mão neste componente era criar um segundo preço para a mesma bebida — e o do
 * site nunca mais batia certo com o do balcão.
 *
 * `facto` permite substituir a descrição da carta quando o cartão diz outra
 * coisa: os três cocktails de cor não se identificam ao certo na fotografia, e
 * o rótulo diz só o que se sabe em vez de adivinhar o sabor.
 */
export function CartaoCarril({
  id,
  foto,
  alt,
  locale,
  nome,
  facto,
}: {
  /**
   * O `id` do artigo em `ementa.json`. Omite-se quando o cartão **não é um
   * artigo da carta** — o da preparação ao balcão, por exemplo, que é um objecto
   * da colecção sem preço. Nesse caso o `nome` é obrigatório.
   */
  id?: string;
  /** O nome do ficheiro em `public/casa/`, sem extensão. */
  foto: string;
  alt: string;
  locale: Locale;
  nome?: string;
  facto?: string;
}) {
  /* Rebenta o `build` se o `id` não estiver protegido contra o painel. */
  if (id) exigirEmDestaque(id, "CartaoCarril");

  const artigo: Artigo | undefined = id
    ? artigos.find((a) => a.id === id)
    : undefined;

  /* Um `id` que existe mas não bate certo é erro de quem escreveu o componente,
     e aparece como um buraco no carril em vez de rebentar a página inteira. */
  if (id && !artigo) return null;

  const titulo = nome ?? artigo?.nome[locale];
  if (!titulo) return null;

  return (
    <article className="pg-carril__item">
      <figure>
        <img
          src={`/casa/${foto}.webp`}
          srcSet={`/casa/${foto}-640.webp 640w, /casa/${foto}.webp 1080w`}
          sizes="(min-width: 48rem) 23rem, 62vw"
          width={1080}
          height={1440}
          alt={alt}
          loading="lazy"
          decoding="async"
        />
      </figure>
      <Rotulo
        nome={titulo}
        facto={facto ?? artigo?.descricao?.[locale]}
        dado={
          artigo && artigo.preco !== null
            ? formatarPreco(artigo.preco, locale)
            : undefined
        }
      />
    </article>
  );
}
