import { avaliacoes, type Citacao } from "@/data/avaliacoes";
import type { Locale } from "@/i18n/routing";
import { IconeEstrela } from "./Icones";

/**
 * # Os Preguiçosos — o que dizem de lá
 *
 * É como a casa trata quem lá vai, e é o nome certo para a secção das
 * avaliações: não são "testemunhos", são os clientes da casa.
 *
 * ## A nota ao centro, as vozes à volta
 *
 * É um acto `pin`. O título e a nota ficam **no meio do ecrã**, parados, e à
 * volta há **lugares** espalhados, cada um com uma citação. À medida que se
 * desce, cada lugar **troca a sua citação por outra** — não todos ao mesmo
 * tempo, um de cada vez, para parecer uma sala onde vão falando pessoas
 * diferentes e não um diapositivo a mudar.
 *
 * - Ecrã largo: **quatro lugares, duas voltas** (as oito citações).
 * - Telemóvel: **dois lugares, quatro voltas**. Quatro cartões à volta de um
 *   título não cabem num ecrã de 390 px.
 *
 * ⚠️ **Por isso há duas listas, e não é descuido**: o horário das trocas é
 * diferente. A que não serve fica em `display: none`, que a tira também do
 * leitor de ecrã — ninguém ouve as citações duas vezes.
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

  return (
    <section
      id="preguicosos"
      data-sc-act="pin"
      data-sc-span={citacoes.length > 4 ? "2.6" : "1.2"}
      data-sc-drift="#100a07"
    >
      <div data-sc-stage className="pg-preguicosos">
        {/* "0 1 0 0": está no ecrã mal o acto entra e **não sai**. */}
        <div className="pg-preguicosos__centro" data-sc-cue="0 1 0 0">
          <h2 className="pg-preguicosos__titulo">{nome}</h2>
          <p className="pg-preguicosos__numero">
            {nota}
            <span className="pg-preguicosos__de">/ 5</span>
          </p>
          <Estrelas valor={avaliacoes.nota} texto={estrelasTexto} />
          {contagem && <p className="pg-rotulo__dado">{contagem}</p>}
          <p className="pg-preguicosos__facto">{facto}</p>
          {url && (
            <p>
              <a className="pg-botao" href={url} target="_blank" rel="noopener noreferrer">
                {verTodas} <span aria-hidden="true">↗</span>
              </a>
            </p>
          )}
        </div>

        <Lugares citacoes={citacoes} lugares={4} variante="largo" />
        <Lugares citacoes={citacoes} lugares={2} variante="estreito" />
      </div>
    </section>
  );
}

/**
 * Os lugares à volta da nota. A citação `q` vai para o lugar `q % lugares`, na
 * volta `floor(q / lugares)`: com quatro lugares, a 0 e a 4 partilham o mesmo
 * sítio, uma antes e outra depois.
 */
function Lugares({
  citacoes,
  lugares,
  variante,
}: {
  citacoes: Citacao[];
  lugares: number;
  variante: "largo" | "estreito";
}) {
  const voltas = Math.ceil(citacoes.length / lugares);

  return (
    <ul className={`pg-preguicosos__lugares pg-preguicosos__lugares--${variante}`}>
      {Array.from({ length: lugares }, (_, lugar) => (
        <li key={lugar} className={`pg-lugar pg-lugar--${lugar}`}>
          {Array.from({ length: voltas }, (_, volta) => {
            const c = citacoes[volta * lugares + lugar];
            if (!c) return null;
            return (
              <div key={c.autor} className="pg-lugar__vez" data-sc-cue={deixa(volta, voltas, lugar)}>
                <Bilhete citacao={c} destaque={volta === 0 && lugar === 0} />
              </div>
            );
          })}
        </li>
      ))}
    </ul>
  );
}

/**
 * Quando uma citação está no ecrã, no formato do motor:
 * `início fim rampa-de-entrada rampa-de-saída` (as rampas em fracção da janela).
 *
 * As voltas dividem o percurso em partes iguais, e cada lugar troca **um pouco
 * depois do anterior** (`DESFASAGEM`), para as trocas não serem em bloco.
 *
 * ⚠️ A citação que sai acaba exactamente onde a seguinte começa, e as duas
 * rampas são curtas (`RAMPA`). Se se sobrepusessem, via-se uma por dentro da
 * outra durante a troca.
 *
 * A primeira volta começa em `0` com rampa `0`: já está lá quando o acto
 * chega, e uma secção que abre vazia parece avariada. A última acaba em `1`
 * com rampa `0`: fica até ao fim.
 */
const RAMPA = 0.06;
const DESFASAGEM = 0.05;

function deixa(volta: number, voltas: number, lugar: number): string {
  const fronteira = (v: number) => (v / voltas) * 0.9 + lugar * DESFASAGEM;
  const inicio = volta === 0 ? 0 : fronteira(volta);
  const fim = volta === voltas - 1 ? 1 : fronteira(volta + 1);
  const janela = Math.max(fim - inicio, 0.001);
  const entrada = volta === 0 ? 0 : Math.min(RAMPA / janela, 0.5);
  const saida = volta === voltas - 1 ? 0 : Math.min(RAMPA / janela, 0.5);
  return [inicio, fim, entrada, saida].map((n) => n.toFixed(3)).join(" ");
}

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
