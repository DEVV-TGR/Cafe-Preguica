import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { metadataDaPagina } from "@/lib/metadata";
import { formatarPreco } from "@/lib/preco";
import {
  artigoPorId,
  exigirEmDestaque,
  porCapitulo,
  CARTA_CONFIRMADA,
  COM_SABORES,
  METADADOS,
  SABORES,
  temAlergeniosDeclarados,
  type Artigo,
  type Capitulo,
  type Categoria,
  type Sabor,
} from "@/data/ementa";
import { BarraSite } from "@/components/BarraSite";
import { Preguica } from "@/components/catalogo/Preguica";
import { RodapeSite } from "@/components/RodapeSite";
import { IndiceCapitulos } from "@/components/ementa/IndiceCapitulos";
import { Sabores } from "@/components/ementa/Sabores";
import { HorarioDaCozinha } from "@/components/HorarioDaCozinha";
import "../../catalogo.css";
import "../../ementa.css";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return metadataDaPagina(locale, "ementa", "/ementa");
}

/**
 * # A ementa — a página para onde apontam os QR das mesas
 *
 * **Quem aqui chega está sentado, com o telemóvel numa mão.** Tudo o que esta
 * página decide vem daí: o índice de quatro capítulos preso ao topo, porque
 * dezoito secções não se percorrem com o polegar; a coluna estreita e os preços
 * alinhados à direita, porque é assim que se lê uma carta; e nenhum movimento
 * preso à rolagem, porque aqui a rolagem é para ler, não para ver.
 *
 * ## A mesma casa que a página inicial
 *
 * Esta página **não usa `<Pagina>`**, e foi essa a queixa que a refez: com o
 * invólucro das páginas de leitura, carregar em "Ver a ementa" parecia abrir
 * outro site — cabeçalho diferente, coluna diferente, avisos em caixas brancas.
 * Agora usa a barra do site (`BarraSite`, a mesma da inicial) e os botões, os
 * rótulos e o rodapé do catálogo
 * (`catalogo.css`), e o que é só dela vive em `ementa.css`.
 *
 * ## A página não sabe nada sobre a carta
 *
 * Pede `porCapitulo()` e desenha o que vier. Acrescentar uma categoria é
 * acrescentá-la ao enum e a um capítulo em `data/ementa.ts`, e ao
 * `messages/*.json` — este ficheiro não muda.
 *
 * Os dois avisos no topo não são decoração. O da carta provisória desaparece
 * quando alguém puser `confirmada: true` no JSON; o dos alergénios desaparece
 * quando houver alergénios declarados.
 */

/**
 * A fotografia que abre cada capítulo, e os artigos que se vêem nela.
 *
 * A legenda "Na fotografia" vai buscar nome e preço **à carta** pelo `id` —
 * nunca escritos aqui, senão passava a haver dois preços para o mesmo prato. A
 * da garrafeira não tem legenda porque a fotografia é o balcão, não um artigo.
 */
const ABERTURAS: Record<Capitulo, { foto: string; artigos: string[] }> = {
  comer: { foto: "tabua-partilha", artigos: ["bocadinhos-de-pao-com-chourico"] },
  cocktails: { foto: "negroni-salpico", artigos: ["negroni"] },
  /* Os dois copos balão sem nome — ver a nota do `FOTOS_ARTIGO`. Abrem o
     capítulo sem legenda, que é o que não afirma que bebida são. */
  mocktails: { foto: "cocktail-turquesa", artigos: [] },
  garrafeira: { foto: "lima-espremida", artigos: [] },
  aguas: { foto: "cocktail-amarelo", artigos: [] },
  cafetaria: {
    foto: "tosta-chocolate",
    artigos: ["caf-chocolate-quente-com-chantilly", "torrada-com-compota"],
  },
};

/**
 * Os artigos que têm fotografia da casa, e qual.
 *
 * ⚠️ Só entra aqui o que **se identifica ao certo** na fotografia. Os copos
 * balão amarelo, turquesa e de coco ficaram de fora: são da casa mas ninguém
 * disse que cocktail são, e pô-los ao lado de um nome era afirmar o que não se
 * sabe. Estão no leque do topo, que não diz nome nenhum.
 */
const FOTOS_ARTIGO: Record<string, string> = {
  negroni: "negroni-fumo",
  "blue-lagoon": "cocktail-azul",
  "cocktail-preguica": "cocktail-rosa",
  "bocadinhos-de-pao-com-chourico": "tabua-partilha",
  "torrada-com-compota": "tosta-chocolate",
  "caf-chocolate-quente-com-chantilly": "tosta-chocolate",
};

/* Um `id` que deixou de existir na carta partia a legenda em silêncio. Assim
   rebenta o `build` e diz qual. */
for (const id of [
  ...Object.values(ABERTURAS).flatMap((a) => a.artigos),
  ...Object.keys(FOTOS_ARTIGO),
]) {
  if (!artigoPorId(id)) {
    throw new Error(`ementa/page.tsx: o artigo "${id}" não existe em ementa.json`);
  }
  exigirEmDestaque(id, "ementa/page.tsx");
}

/** Os copos do leque do topo — decorativos, sem nome, pela razão acima. */
const LEQUE = ["cocktail-amarelo", "cocktail-azul", "cocktail-rosa", "cocktail-turquesa", "cocktail-coco"];

export default async function Ementa({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ementa");
  const comum = await getTranslations("comum");

  const capitulos = porCapitulo();
  const seccoes = capitulos.flatMap((c) => c.seccoes);
  const totalArtigos = seccoes.reduce((soma, s) => soma + s.artigos.length, 0);

  const preco = (valor: number | null) =>
    valor === null ? comum("precoPorConfirmar") : formatarPreco(valor, locale);

  const nomesSabores = Object.fromEntries(
    SABORES.map((s) => [s, t(`sabores.${s}`)]),
  ) as Record<Sabor, string>;

  return (
    <>
      {/* A mesma preguiça pendurada da página inicial — só em ecrãs largos,
          onde há margem para ela. No telemóvel ficava por cima dos preços. */}
      <div className="em-preguica">
        <Preguica />
      </div>

      <BarraSite locale={locale} atual="ementa" />

      <IndiceCapitulos
        etiqueta={t("indice")}
        itens={capitulos.map(({ capitulo }) => ({
          id: capitulo,
          nome: t(`capitulos.${capitulo}.nome`),
        }))}
      />

      <main id="conteudo" className="em-pagina">
        <header className="em-topo">
          <div className="em-topo__texto">
            <p className="em-olho">{t("olho")}</p>
            <h1 className="em-topo__titulo">{t("titulo")}</h1>
            <p className="em-topo__intro">{t("introducao")}</p>
            <p className="pg-rotulo__dado">
              {t("contagem", { artigos: totalArtigos, seccoes: seccoes.length })}
            </p>

            <div className="em-avisos">
              {!CARTA_CONFIRMADA && (
                /* `role="status"` e não `alert`: é informação sobre o estado
                   da página, não uma emergência que interrompa quem usa leitor
                   de ecrã. */
                <p role="status" className="em-aviso">
                  {t("avisoProvisoria")}
                </p>
              )}
              {!temAlergeniosDeclarados() && (
                <p className="em-aviso">{t("avisoAlergenios")}</p>
              )}
            </div>
          </div>

          <div className="em-leque" aria-hidden="true">
            {LEQUE.map((foto, i) => (
              <img
                key={foto}
                src={`/casa/${foto}-640.webp`}
                width={640}
                height={853}
                alt=""
                style={{ "--i": i - (LEQUE.length - 1) / 2 } as React.CSSProperties}
                fetchPriority={i === 2 ? "high" : undefined}
              />
            ))}
          </div>
        </header>

        {capitulos.map(({ capitulo, seccoes }, i) => {
          const abertura = ABERTURAS[capitulo];
          const naFoto = abertura.artigos
            .map(artigoPorId)
            /* Um artigo escondido pelo painel não está na lista por baixo, e
               a legenda não o pode anunciar. */
            .filter((a): a is Artigo => a !== undefined && !a.escondido);

          return (
            <section
              key={capitulo}
              id={capitulo}
              className="em-capitulo"
              aria-labelledby={`titulo-${capitulo}`}
            >
              <header className="em-abertura">
                <figure className="em-abertura__foto">
                  <img
                    src={`/casa/${abertura.foto}.webp`}
                    srcSet={`/casa/${abertura.foto}-640.webp 640w, /casa/${abertura.foto}.webp 1080w`}
                    sizes="(min-width: 72rem) 72rem, 100vw"
                    width={1080}
                    height={1440}
                    alt={t(`fotos.${capitulo}`)}
                    loading={i === 0 ? undefined : "lazy"}
                    decoding="async"
                  />
                  {naFoto.length > 0 && (
                    <figcaption className="em-abertura__legenda">
                      <span>{t("naFotografia")}</span>
                      {naFoto.map((a) => (
                        <span key={a.id}>
                          {a.nome[locale]} · {preco(a.preco)}
                        </span>
                      ))}
                    </figcaption>
                  )}
                  <div className="em-abertura__titulo">
                    <span className="em-abertura__numero" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h2 id={`titulo-${capitulo}`}>{t(`capitulos.${capitulo}.nome`)}</h2>
                  </div>
                </figure>

                <p className="em-abertura__facto">{t(`capitulos.${capitulo}.facto`)}</p>
                {/* Onde se escolhe a comida é onde tem de estar a hora a que a
                    cozinha fecha — pedido da casa. */}
                {capitulo === "comer" && (
                  <HorarioDaCozinha locale={locale} className="em-abertura__cozinha" />
                )}
                {/* O sub-índice do capítulo: salta para a secção. Com uma
                    secção só não aparece — era um botão para o sítio onde já
                    se está. */}
                {seccoes.length > 1 && (
                  <ul className="em-abertura__seccoes">
                    {seccoes.map(({ categoria }) => (
                      <li key={categoria}>
                        <a href={`#${categoria}`}>{t(`categorias.${categoria}`)}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </header>

              {seccoes.map(({ categoria, artigos }) => (
                <Seccao
                  key={categoria}
                  categoria={categoria}
                  artigos={artigos}
                  locale={locale}
                  titulo={t(`categorias.${categoria}`)}
                  dose={comum("dose")}
                  colunas={[t("colunaPreco"), t("colunaPrecoAlt")]}
                  preco={preco}
                  extra={
                    COM_SABORES.includes(categoria) ? (
                      <Sabores
                        nomes={nomesSabores}
                        textos={{
                          titulo: t("saboresTitulo"),
                          sortear: t("sortear"),
                          aRodar: t("aRodar"),
                          escolheu: t("escolheu"),
                          escolhido: t("escolhido"),
                          nenhum: t("nenhumSabor"),
                          nota: t("saboresNota"),
                        }}
                      />
                    ) : null
                  }
                />
              ))}
            </section>
          );
        })}

        <section className="em-fecho" aria-labelledby="titulo-fecho">
          <img
            className="em-fecho__preguica"
            src="/marca/preguica.webp"
            alt=""
            width={325}
            height={286}
            loading="lazy"
          />
          <h2 id="titulo-fecho" className="pg-rotulo__nome">
            {t("fecho.nome")}
          </h2>
          <p className="pg-rotulo__facto">{t("fecho.facto")}</p>
          <p className="em-fecho__botoes">
            <a href="#conteudo" className="pg-botao">
              {t("fecho.topo")} <span aria-hidden="true">↑</span>
            </a>
            <Link href="/" className="pg-botao">
              {t("fecho.inicio")}
            </Link>
          </p>
        </section>
      </main>

      <RodapeSite />
    </>
  );
}

/**
 * Uma secção da carta. Três formas, decididas pelos dados e não pelo nome da
 * categoria escrito à mão:
 *
 * - **Com descrição** (cocktails, tábuas): nome e preço numa linha, a
 *   composição por baixo.
 * - **Lista** (gin, chás, cervejas): só nome e preço, e em duas colunas no
 *   ecrã largo — onze gins em coluna única são meio ecrã de pontinhos.
 * - **Duas colunas de preço** (as tostas): o cabeçalho diz de que pão é cada
 *   número, e cada preço leva o rótulo escondido para o leitor de ecrã, que não
 *   vê o alinhamento das colunas.
 */
function Seccao({
  categoria,
  artigos,
  locale,
  titulo,
  dose,
  colunas,
  preco,
  extra,
}: {
  categoria: Categoria;
  artigos: Artigo[];
  locale: Locale;
  titulo: string;
  dose: string;
  colunas: [string, string];
  preco: (valor: number | null) => string;
  extra: React.ReactNode;
}) {
  const meta = METADADOS[categoria];
  const comColunas = meta?.colunas !== undefined;
  const eLista = artigos.every((a) => a.descricao === null) && !comColunas;

  return (
    <section
      id={categoria}
      className="em-seccao"
      data-lista={eLista || undefined}
      data-extra={extra ? true : undefined}
      aria-labelledby={`seccao-${categoria}`}
    >
      <header className="em-seccao__cabeca">
        <h3 id={`seccao-${categoria}`}>{titulo}</h3>
        {/* A dose é propriedade da secção, não do artigo: o gin serve-se todo
            a 5 cl e repeti-lo em onze linhas era ruído. */}
        {meta?.dose && (
          <p className="em-seccao__dose">
            {dose} {meta.dose}
          </p>
        )}
        {comColunas && (
          <p className="em-colunas" aria-hidden="true">
            <span>{colunas[0]}</span>
            <span>{colunas[1]}</span>
          </p>
        )}
      </header>

      <div className="em-seccao__corpo">
        <ul className="em-lista">
          {artigos.map((artigo) => {
            const foto = FOTOS_ARTIGO[artigo.id];
            return (
              <li key={artigo.id} className="em-artigo" data-foto={foto ? true : undefined}>
                {foto && (
                  <img
                    className="em-artigo__foto"
                    src={`/casa/${foto}-640.webp`}
                    width={640}
                    height={853}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <div className="em-artigo__texto">
                  <p className="em-artigo__linha">
                    <span className="em-artigo__nome">{artigo.nome[locale]}</span>
                    <span className="em-artigo__pontos" aria-hidden="true" />
                    {comColunas ? (
                      <span className="em-artigo__precos">
                        {/* `tabular-nums` mantém a coluna alinhada; sem isso os
                            algarismos têm larguras diferentes e a coluna dança. */}
                        <span>
                          <span className="sr-only">{colunas[0]}: </span>
                          {preco(artigo.preco)}
                        </span>
                        {/* O segundo preço só existe nas tostas — o `zod`
                            rebenta o build se aparecer noutro sítio. */}
                        <span>
                          {artigo.precoSecundario !== null && (
                            <>
                              <span className="sr-only">{colunas[1]}: </span>
                              {preco(artigo.precoSecundario)}
                            </>
                          )}
                        </span>
                      </span>
                    ) : (
                      <span className="em-artigo__preco">{preco(artigo.preco)}</span>
                    )}
                  </p>
                  {artigo.descricao && (
                    <p className="em-artigo__descricao">{artigo.descricao[locale]}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {extra}
      </div>
    </section>
  );
}
