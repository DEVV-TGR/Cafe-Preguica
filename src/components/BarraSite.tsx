import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cafe, telefoneParaLigar } from "@/data/cafe";
import { MudarIdioma } from "./MudarIdioma";

/**
 * # A barra do site — a mesma em todas as páginas
 *
 * Havia três: a inicial com o índice das secções e o botão de reservar, a
 * ementa só com "Início · Ementa", e as de leitura com o `Cabecalho` antigo.
 * Quem passava de uma para a outra perdia os links que tinha acabado de ver.
 * Agora todas mostram o mesmo, e a única coisa que muda é **para onde apontam
 * os links das secções**: na inicial saltam dentro da página (`#casa`); nas
 * outras levam lá (`/#casa`).
 *
 * `/contactos` não está aqui de propósito: "Onde estamos", na inicial, já faz
 * esse papel. (Houve também uma `/sobre`, que nunca chegou a ter texto; o que
 * ela ia dizer está na secção "A casa", e o endereço leva para lá — ver o
 * `next.config.ts`.)
 *
 * O CSS está em `app/site.css`, que o `layout.tsx` carrega para todas.
 */
export function BarraSite({
  locale,
  atual,
}: {
  locale: Locale;
  /** A página onde se está. A inicial usa âncoras; a ementa fica marcada. */
  atual?: "inicio" | "ementa";
}) {
  const t = useTranslations("nav");
  const marca = useTranslations("marca");
  const telefone = telefoneParaLigar();
  const naInicial = atual === "inicio";

  /* Só três secções, por decisão do Tomás: o que se vem ver — a casa, os
     cocktails, a comida. Vídeos, avaliações e "onde estamos" descobrem-se a
     descer a página; com seis links a barra era um índice, não uma barra. */
  const seccoes = ["casa", "carril", "partilhar"] as const;

  const logotipo = (
    <img src="/marca/marca.webp" width={819} height={507} alt={marca("nome")} />
  );

  return (
    <header className="pg-barra">
      {/* Na inicial o logótipo volta ao topo. `#top` não é um id nosso: o
          HTML define-o como "o topo do documento" quando não há nenhum
          elemento com esse id — por isso não pode haver um `id="top"` no
          site. Nas outras páginas leva à inicial. */}
      {naInicial ? (
        <a href="#top" className="pg-barra__marca">
          {logotipo}
        </a>
      ) : (
        <Link href="/" className="pg-barra__marca">
          {logotipo}
        </Link>
      )}

      <nav className="pg-indice" aria-label={t("principal")}>
        {seccoes.map((id) =>
          naInicial ? (
            <a key={id} href={`#${id}`} className="pg-indice__seccao">
              {t(`seccoes.${id}`)}
            </a>
          ) : (
            <Link key={id} href={`/#${id}`} className="pg-indice__seccao">
              {t(`seccoes.${id}`)}
            </Link>
          ),
        )}
        {/* A ementa é o único link que fica no telemóvel: é o que se procura
            quando se abre o site à mesa. */}
        {atual === "ementa" ? (
          <span aria-current="page">{t("ementa")}</span>
        ) : (
          <Link href="/ementa">{t("ementa")}</Link>
        )}
      </nav>

      <span className="pg-barra__idioma">
        <MudarIdioma locale={locale} etiqueta={t("mudarIdioma")} curta={t("mudarIdiomaCurto")} />
      </span>

      {telefone && (
        <a className="pg-acao" href={`tel:${telefone}`}>
          <span className="pg-barra__curto">{t("reservar")}</span>
          <span className="pg-barra__longo">
            {/* A mesma frase do herói, com o número à vista: em ecrã largo há
                espaço, e quem está ao computador não liga com um toque. */}
            {t("reservar")} · {cafe.telefone}
          </span>
        </a>
      )}
    </header>
  );
}
