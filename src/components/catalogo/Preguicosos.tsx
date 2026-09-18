import { avaliacoes, type Citacao } from "@/data/avaliacoes";
import type { Locale } from "@/i18n/routing";
import { IconeEstrela } from "./Icones";

/**
 * # Os Preguiçosos — o que dizem de lá
 *
 * É como a casa trata quem lá vai, e é o nome certo para a secção das
 * avaliações: não são "testemunhos", são os clientes da casa.
 *
 * Vem logo antes da porta de propósito. Quem chegou até aqui já viu os
 * cocktails e os pratos; o que falta para ligar é saber que outros gostaram.
 *
 * Os dados e as regras sobre eles (citações literais, na língua original)
 * estão em `src/data/avaliacoes.ts`. Aqui só se decide a forma:
 *
 * - **Sem nota, não há secção.** Mesma regra do `null` no `cafe.json`.
 * - **Sem citações, fica a nota sozinha**, maior e ao centro, em vez de uma
 *   grelha vazia à espera.
 * - A primeira citação vai em destaque, maior. Por isso a ordem no JSON é a
 *   ordem de importância.
 */
export function Preguicosos({
  locale,
  nome,
  facto,
  contagem,
  verTodas,
  url,
  estrelasTexto,
}: {
  locale: Locale;
  nome: string;
  facto: string;
  /** "1053 avaliações no Google", já com o número. */
  contagem: string | null;
  verTodas: string;
  /** Onde se lêem todas — o mesmo link do "Como chegar", que abre a ficha. */
  url: string | null;
  /** O texto alternativo das estrelas, já com a nota ("4,6 em 5"). */
  estrelasTexto: string;
}) {
  if (avaliacoes.nota === null) return null;

  const nota = new Intl.NumberFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(avaliacoes.nota);

  const temCitacoes = avaliacoes.citacoes.length > 0;

  return (
    <section
      id="preguicosos"
      className={`pg-preguicosos${temCitacoes ? "" : " pg-preguicosos--so-nota"}`}
      data-sc-act="flow"
      data-sc-drift="#100a07"
    >
      <div className="pg-preguicosos__resumo" data-sc-in data-sc-stagger="80">
        <div className="pg-rotulo">
          <h2 className="pg-rotulo__nome">{nome}</h2>
          <p className="pg-rotulo__facto">{facto}</p>
        </div>

        <p className="pg-preguicosos__nota">
          <span className="pg-preguicosos__numero">{nota}</span>
          <span className="pg-preguicosos__de">/ 5</span>
        </p>
        <Estrelas valor={avaliacoes.nota} texto={estrelasTexto} />
        {contagem && <p className="pg-rotulo__dado">{contagem}</p>}

        {url && (
          <p className="mt-2">
            <a className="pg-botao" href={url} target="_blank" rel="noopener noreferrer">
              {verTodas}
            </a>
          </p>
        )}
      </div>

      {temCitacoes && (
        <ul className="pg-preguicosos__mural">
          {avaliacoes.citacoes.map((c, i) => (
            <li key={`${c.autor}-${c.data}`} data-sc-reveal="up" data-sc-reveal-at={`${0.05 + i * 0.06} ${0.35 + i * 0.06}`}>
              <CartaoCitacao citacao={c} locale={locale} destaque={i === 0} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CartaoCitacao({
  citacao,
  locale,
  destaque,
}: {
  citacao: Citacao;
  locale: Locale;
  destaque: boolean;
}) {
  /* Mês e ano e mais nada: o dia exacto não interessa a ninguém e faz a
     citação parecer mais velha do que é. */
  const [ano, mes] = citacao.data.split("-").map(Number);
  const quando = new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(ano, mes - 1, 1));

  return (
    <figure className={`pg-citacao${destaque ? " pg-citacao--destaque" : ""}`}>
      <blockquote lang={citacao.lingua}>
        <p>{citacao.texto}</p>
      </blockquote>
      <figcaption>
        <Estrelas valor={citacao.estrelas} texto={`${citacao.estrelas}/5`} pequena />
        <span className="pg-citacao__autor">{citacao.autor}</span>
        <span className="pg-citacao__quando">{quando}</span>
      </figcaption>
    </figure>
  );
}

/**
 * Cinco estrelas, cheias até à nota arredondada. Para o leitor de ecrã é uma
 * frase só ("4,6 em 5"), não cinco imagens.
 */
function Estrelas({
  valor,
  texto,
  pequena = false,
}: {
  valor: number;
  texto: string;
  pequena?: boolean;
}) {
  const cheias = Math.round(valor);
  return (
    <span className={`pg-estrelas${pequena ? " pg-estrelas--pequena" : ""}`} role="img" aria-label={texto}>
      {[1, 2, 3, 4, 5].map((n) => (
        <IconeEstrela key={n} className="pg-icone" cheia={n <= cheias} />
      ))}
    </span>
  );
}
