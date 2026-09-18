import { avaliacoes, type Citacao } from "@/data/avaliacoes";
import type { Locale } from "@/i18n/routing";
import { IconeEstrela } from "./Icones";

/**
 * # Os Preguiçosos — o que dizem de lá
 *
 * É como a casa trata quem lá vai, e é o nome certo para a secção das
 * avaliações: não são "testemunhos", são os clientes da casa.
 *
 * ## As citações chegam com a rolagem
 *
 * É um acto `pin`: o ecrã prende-se e as avaliações vão aparecendo como bilhetes
 * deixados numa parede. **Três estão lá à chegada** — uma secção que abre vazia
 * parece avariada — e as outras **entram uma a uma** à medida que se desce.
 *
 * ⚠️ **Há duas listas, e não é descuido.** No ecrã largo as sete cabem numa
 * grelha de quatro por dois, e as três primeiras cumprimentam logo. No
 * telemóvel não cabem, e empilham-se umas por cima das outras como um baralho;
 * aí, se três chegassem juntas, a terceira tapava as duas primeiras antes de
 * alguém as ler. Por isso o telemóvel tem a sua lista, com uma só à chegada.
 * A que não serve fica em `display: none`, que a tira também do leitor de ecrã
 * — ninguém ouve as citações duas vezes.
 *
 * Os dados e as regras sobre eles (citações literais, na língua original,
 * sem nomes de funcionários) estão em `src/data/avaliacoes.ts`.
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
  /** Onde se lêem todas — o mesmo link do "Abrir no Google Maps", que abre a ficha. */
  url: string | null;
  /** O texto alternativo das estrelas, já com a nota ("4,6 em 5"). */
  estrelasTexto: string;
}) {
  if (avaliacoes.nota === null) return null;

  const nota = new Intl.NumberFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(avaliacoes.nota);

  const { citacoes } = avaliacoes;
  const ligacao = url && (
    <a className="pg-bilhete pg-bilhete--ligacao" href={url} target="_blank" rel="noopener noreferrer">
      <span>{verTodas}</span>
      <span className="pg-bilhete__seta" aria-hidden="true">↗</span>
    </a>
  );

  return (
    <section
      id="preguicosos"
      data-sc-act="pin"
      data-sc-span={citacoes.length > 3 ? "2.8" : "1.2"}
      data-sc-drift="#100a07"
    >
      <div data-sc-stage className="pg-preguicosos">
        {/* "0 1 0 0": está no ecrã mal o acto entra e **não sai** — sem o
            quarto zero, o título desvanecia a partir de 70% do percurso. */}
        <header className="pg-preguicosos__topo" data-sc-cue="0 1 0 0">
          <div className="pg-rotulo pg-rotulo--largo">
            <h2 className="pg-rotulo__nome">{nome}</h2>
            <p className="pg-rotulo__facto">{facto}</p>
          </div>
          <div className="pg-preguicosos__nota">
            <p className="pg-preguicosos__numero">
              {nota}
              <span className="pg-preguicosos__de">/ 5</span>
            </p>
            <div>
              <Estrelas valor={avaliacoes.nota} texto={estrelasTexto} />
              {contagem && <p className="pg-rotulo__dado">{contagem}</p>}
            </div>
          </div>
        </header>

        {/* Ecrã largo: três à chegada, as outras distribuídas pelo percurso. */}
        <ul className="pg-preguicosos__mural pg-preguicosos__mural--largo">
          {citacoes.map((c, i) => (
            <li key={c.autor} data-sc-cue={i < 3 ? "0 1 0 0" : `${(0.1 + (i - 3) * 0.15).toFixed(2)}`}>
              <Bilhete citacao={c} destaque={i === 0} />
            </li>
          ))}
          {ligacao && <li data-sc-cue={`${(0.1 + Math.max(citacoes.length - 3, 0) * 0.15).toFixed(2)}`}>{ligacao}</li>}
        </ul>

        {/* Telemóvel: um baralho, uma de cada vez. */}
        <ul className="pg-preguicosos__mural pg-preguicosos__mural--baralho">
          {citacoes.map((c, i) => (
            /* O `zIndex` explícito é o que garante que o bilhete novo fica
               **por cima**: sem ele, os que têm `transform` do motor pintam
               numa camada à parte e o de baixo aparecia através do de cima. */
            <li key={c.autor} style={{ zIndex: i + 1 }} data-sc-cue={i === 0 ? "0 1 0 0" : baralho(i * 0.11)}>
              <Bilhete citacao={c} destaque={i === 0} />
            </li>
          ))}
          {ligacao && (
            <li style={{ zIndex: citacoes.length + 1 }} data-sc-cue={baralho(citacoes.length * 0.11)}>
              {ligacao}
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

/**
 * A deixa de um bilhete do baralho: entra em `inicio` e fica até ao fim.
 *
 * ⚠️ A rampa de entrada é **curta de propósito** (2% da janela). Com a rampa
 * normal, o bilhete novo passava um bom bocado meio transparente por cima do
 * anterior, e as duas citações lia-se uma por dentro da outra.
 */
const baralho = (inicio: number) => `${inicio.toFixed(2)} 1 0.03 0`;

function Bilhete({ citacao, destaque }: { citacao: Citacao; destaque: boolean }) {
  return (
    <figure className={`pg-bilhete${destaque ? " pg-bilhete--destaque" : ""}`}>
      <blockquote lang={citacao.lingua}>
        <p>{citacao.texto}</p>
      </blockquote>
      <figcaption className="pg-bilhete__autor">{citacao.autor}</figcaption>
    </figure>
  );
}

/**
 * Cinco estrelas, cheias até à nota arredondada. Para o leitor de ecrã é uma
 * frase só ("4,6 em 5"), não cinco imagens.
 */
function Estrelas({ valor, texto }: { valor: number; texto: string }) {
  const cheias = Math.round(valor);
  return (
    <span className="pg-estrelas" role="img" aria-label={texto}>
      {[1, 2, 3, 4, 5].map((n) => (
        <IconeEstrela key={n} className="pg-icone" cheia={n <= cheias} />
      ))}
    </span>
  );
}
