import { Link } from "@/i18n/navigation";

/**
 * # O herói: a fachada
 *
 * A primeira coisa que se vê é a casa, de dia, com a árvore florida por cima.
 * Por cima dela apenas quatro coisas: o logótipo, onde fica, uma linha, e os
 * dois botões — a ementa e "onde estamos". Mais do que isso e a fotografia
 * deixa de ser a primeira impressão para ser o fundo de um cartaz.
 *
 * ⚠️ **Não há "reservar" aqui, e é de propósito.** Esteve, e ficava ao lado do
 * "Reservar" da barra no primeiro ecrã — dois botões para a mesma coisa. A
 * barra fica presa ao topo e leva o de reservar; o herói leva a ementa, que é
 * o que mais se procura, e "onde estamos", que saiu da barra.
 *
 * ## A fotografia é de dia e a página é de noite
 *
 * ⚠️ **Não se resolve escurecendo a imagem toda.** É o atalho óbvio e mata
 * exactamente o que a torna boa: a árvore em flor e o céu azul. O que está aqui
 * é um **véu só onde o texto assenta** — um gradiente que sobe do fundo da
 * página e se desvanece a meia altura, como o `taste.md` manda (uma cortina só
 * onde o texto se senta, nunca sobre o quadro inteiro).
 *
 * O acto seguinte volta ao escuro, e é por isso que isto funciona: a fachada
 * fica a ser a única coisa clara do site. Abre-se a porta e entra-se para
 * dentro.
 *
 * ## As camadas
 *
 * A fotografia move-se mais devagar do que o texto (`data-sc-parallax`), e é a
 * diferença entre as duas velocidades que dá profundidade. É o sinal de
 * acabamento mais barato que há numa página, e não custa um único pedido a mais.
 */
export function Heroi({
  ondeFica,
  linha,
  acao,
  ondeEstamos,
  alt,
  nome,
}: {
  ondeFica: string;
  linha: string;
  acao: string;
  /** O texto do botão que desce até "onde estamos", no fim da página. */
  ondeEstamos: string;
  alt: string;
  nome: string;
}) {
  return (
    <section className="pg-heroi" data-sc-act="flow">
      <div className="pg-heroi__foto" data-sc-parallax="0.16">
        <img
          src="/casa/fachada.webp"
          srcSet="/casa/fachada-640.webp 640w, /casa/fachada-1280.webp 1280w, /casa/fachada.webp 2000w"
          sizes="100vw"
          width={2000}
          height={1993}
          alt={alt}
          /* A única imagem da página que não é `lazy`: é a primeira coisa no
             ecrã e o que o browser mede para o LCP. */
          fetchPriority="high"
        />
      </div>

      {/* O véu. `aria-hidden` porque é pintura e não conteúdo. */}
      <div className="pg-heroi__veu" aria-hidden="true" />

      <div className="pg-heroi__texto">
        {/* O logótipo é a marca desenhada, não o nome composto numa fonte
            qualquer. O `h1` continua lá para quem lê com os ouvidos e para o
            Google — o texto vive no `alt`. */}
        <h1 className="pg-heroi__marca">
          <img
            src="/marca/marca.webp"
            width={819}
            height={507}
            alt={nome}
            fetchPriority="high"
          />
        </h1>
        <p className="pg-heroi__onde">{ondeFica}</p>
        <p className="pg-heroi__linha">{linha}</p>
        {/* A ementa vai primeiro e cheia: é o que a maioria vem procurar.
            "Onde estamos" fica ao lado, contornado, com a seta a dizer que
            desce na própria página em vez de abrir outra. */}
        <p className="pg-heroi__botoes">
          <Link href="/ementa" className="pg-botao pg-botao--cheio">
            {acao}
          </Link>
          <a href="#onde" className="pg-botao">
            {ondeEstamos} <span aria-hidden="true">↓</span>
          </a>
        </p>
      </div>
    </section>
  );
}
