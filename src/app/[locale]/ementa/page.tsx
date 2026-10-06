import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { metadataDaPagina } from "@/lib/metadata";
import { formatarPreco } from "@/lib/preco";
import {
  artigoPorId,
  artigosDaCartaSecreta,
  exigirEmDestaque,
  porCapitulo,
  CARTA_CONFIRMADA,
  COM_SABORES,
  METADADOS,
  sabores,
  temAlergeniosDeclarados,
  type Artigo,
  type Capitulo,
  type Categoria,
} from "@/data/ementa";
import { BarraSite } from "@/components/BarraSite";
import { Preguica } from "@/components/catalogo/Preguica";
import { RodapeSite } from "@/components/RodapeSite";
import { IndiceCapitulos } from "@/components/ementa/IndiceCapitulos";
import { Sabores } from "@/components/ementa/Sabores";
import { Carrossel, type FotoDoCarrossel } from "@/components/Carrossel";
import { Ampliar, Visor, type GrupoDoVisor } from "@/components/Visor";
import { fotoDoVisor, textosDoVisor } from "@/lib/visor";
import { DesenhosDoCapitulo } from "@/components/ementa/Desenhos";
import { CartaSecreta } from "@/components/ementa/CartaSecreta";
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
 * As fotografias que abrem cada capítulo, e os artigos que se vêem em cada uma.
 * Com mais do que uma, o capítulo abre num carrossel (`components/ementa/
 * Carrossel.tsx`); com uma, fica parada.
 *
 * A legenda "Na fotografia" vai buscar nome e preço **à carta** pelo `id` —
 * nunca escritos aqui, senão passava a haver dois preços para o mesmo prato. As
 * que não têm artigos não têm legenda: a da garrafeira é o balcão, e os copos
 * balão dos mocktails e das águas são da casa mas ninguém disse que bebida são.
 *
 * ## Deitadas, do tamanho da moldura
 *
 * A moldura é deitada (21:9 no computador, 4:3 no telemóvel), e as fotografias
 * da sessão são ao alto: recortadas, via-se pouco mais de um quarto de cada
 * uma. As `abertura-*` foram refeitas a 16:9 para a moldura (`fotos/
 * ementa-aberturas/`), com a bebida ao centro — o computador corta um pouco em
 * cima e em baixo, o telemóvel dos lados, e o copo fica inteiro nos dois.
 *
 * ⚠️ São versões estendidas com IA: **só o fundo** pode ter mudado. Antes de
 * uma entrar, compara-se com o original — a guarnição, a cor, o gelo. Uma
 * fotografia de carta com uma laranja a mais promete ao cliente o que não se
 * serve. As originais ao alto continuam a ser as do círculo e do visor de cada
 * artigo (`FOTOS_ARTIGO`).
 *
 * A `altura`, quando existe, é o `object-position` vertical de uma que ainda é
 * ao alto: que faixa fica à vista.
 *
 * ## Juntar uma fotografia
 *
 * 1. A versão deitada (16:9) em `fotos/ementa-aberturas/<nome>.png`, e
 *    `npm run fotos`: sai como `public/casa/abertura-<nome>.webp`.
 * 2. Acrescentá-la à lista do capítulo, com os `id` do que se vê nela — e esses
 *    `id` em `EM_DESTAQUE` (`data/ementa.ts`), senão o `build` rebenta a dizê-lo.
 * 3. Texto alternativo em `ementa.fotos.<nome>` (sem o `abertura-`), nas duas
 *    línguas.
 *
 * ⚠️ Fotografias com caras de clientes não entram sem a casa confirmar que tem
 * autorização de quem aparece.
 */
const ABERTURAS: Record<Capitulo, { foto: string; altura?: string; artigos: string[] }[]> = {
  comer: [
    { foto: "abertura-bocadinhos-chourico", artigos: ["bocadinhos-de-pao-com-chourico"] },
    { foto: "abertura-preguicinhas", artigos: ["preguicinhas-com-queijo"] },
    { foto: "abertura-petit-gateau", artigos: ["petit-gateau-com-gelado-de-baunilha"] },
    {
      foto: "abertura-torrada-chocolate-quente",
      artigos: ["torrada-com-compota", "caf-chocolate-quente-com-chantilly"],
    },
  ],
  cocktails: [
    { foto: "abertura-aperol-garrafa", artigos: ["aperol-spritz"] },
    { foto: "abertura-negroni-fumado", artigos: ["negroni"] },
    { foto: "abertura-mojito", artigos: ["mojito"] },
    { foto: "abertura-cocktail-rosa", artigos: ["cocktail-preguica"] },
    { foto: "abertura-blue-lagoon", artigos: ["blue-lagoon"] },
    { foto: "abertura-mojito-melancia", artigos: ["mojito-melancia"] },
    { foto: "abertura-long-island", artigos: ["long-island-ice-tea"] },
    { foto: "abertura-margarita", artigos: ["margarita"] },
  ],
  /* Ainda a do Instagram, ao alto: a versão deitada voltou com outra bebida
     (o copo azul) e está em `fotos/ementa-aberturas/a-refazer/`. */
  mocktails: [{ foto: "cocktail-turquesa", altura: "40%", artigos: [] }],
  garrafeira: [
    { foto: "abertura-gin-tanqueray-sevilla", artigos: ["gin-tanqueray-sevilla"] },
    { foto: "abertura-b52", artigos: ["sho-b52"] },
    { foto: "abertura-gin-tanqueray", artigos: ["gin-tanqueray"] },
  ],
  aguas: [
    { foto: "abertura-cocktail-amarelo", artigos: [] },
    { foto: "abertura-cocktail-coco", artigos: [] },
  ],
  cafetaria: [
    { foto: "abertura-chocolate-chantilly", artigos: ["caf-chocolate-quente-com-chantilly"] },
    { foto: "abertura-gluehwein", artigos: ["caf-gluehwein"] },
  ],
};


/**
 * Os artigos que têm fotografia da casa, e quais. **A primeira é a do círculo**
 * ao lado do nome; todas abrem no visor, uma a seguir à outra, ao tocar nele.
 *
 * ⚠️ Só entra aqui o que **se identifica ao certo** na fotografia. Da sessão do
 * Rafael ficaram de fora os Mules, os hurricane e os copos balão: a família
 * vê-se, a variante não, e pô-los ao lado de um nome era afirmar o que não se
 * sabe. A lista do que falta confirmar está em `fotos/Fotografias/
 * IDENTIFICACAO.md`.
 */
const FOTOS_ARTIGO: Record<string, string[]> = {
  "bocadinhos-de-pao-com-chourico": [
    "bocadinhos-chourico",
    "bocadinhos-queijo",
    "bocadinhos-tabasco",
  ],
  "preguicinhas-com-queijo": ["preguicinhas", "preguicinhas-tabasco"],
  "petit-gateau-com-gelado-de-baunilha": ["petit-gateau", "petit-gateau-colher"],
  "torrada-com-compota": ["torrada-chocolate-quente"],
  "aperol-spritz": ["aperol-laranja", "aperol-garrafa", "aperol-espumante"],
  mojito: ["mojito", "mojito-noite", "mojito-limao"],
  "mojito-melancia": ["mojito-melancia"],
  caipirinha: ["caipirinha", "caipirinha-servir"],
  margarita: ["margarita"],
  negroni: ["negroni", "negroni-fumado", "negroni-salpicos"],
  "long-island-ice-tea": ["long-island", "long-island-lima"],
  "blue-lagoon": ["blue-lagoon", "blue-lagoon-tubarao", "blue-lagoon-servir"],
  "cocktail-preguica": ["cocktail-rosa"],
  "gin-tanqueray": ["gin-tanqueray"],
  "gin-tanqueray-sevilla": ["gin-tanqueray-sevilla"],
  "sho-b52": ["b52", "b52-tabuleiro"],
  "caf-chocolate-quente-com-chantilly": [
    "chocolate-chantilly",
    "chocolate-chantilly-mesa",
    "torrada-chocolate-quente",
  ],
  "caf-gluehwein": ["gluehwein", "gluehwein-canela"],
};

/* Um `id` que deixou de existir na carta partia a legenda em silêncio. Assim
   rebenta o `build` e diz qual. */
for (const id of [
  ...Object.values(ABERTURAS).flatMap((fotos) => fotos.flatMap((f) => f.artigos)),
  ...Object.keys(FOTOS_ARTIGO),
]) {
  if (!artigoPorId(id)) {
    throw new Error(`ementa/page.tsx: o artigo "${id}" não existe em ementa.json`);
  }
  exigirEmDestaque(id, "ementa/page.tsx");
}

/** Um GIF transparente de 1×1 — o que o telemóvel recebe no lugar do leque. */
/* O contrário de "computador" em `ementa.css`: menos de 64rem, ou sem rato. */
const FORA_DO_COMPUTADOR = "not all and (min-width: 64rem) and (hover: hover) and (pointer: fine)";
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * Os copos do leque do topo — decorativos, sem nome, pela razão acima. **Só no
 * computador**: no telemóvel e no tablet, quem leu o QR quer ver a carta a
 * começar, e o leque empurrava-a para o segundo ecrã.
 */
const LEQUE = ["cocktail-amarelo", "cocktail-azul", "cocktail-rosa", "cocktail-turquesa", "cocktail-coco"];

export default async function Ementa({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ementa");
  const comum = await getTranslations("comum");
  const convite = await getTranslations("newsletter.convite");
  const visor = await textosDoVisor();

  const capitulos = porCapitulo();
  /* Sem cocktails na carta secreta, a secção e os três sinais que levam lá não
     aparecem: prometer uma carta e abri-la vazia era pior do que não dizer
     nada. Só se pergunta se há algum — os artigos não entram nesta página. */
  const haCartaSecreta = artigosDaCartaSecreta().length > 0;
  const seccoes = capitulos.flatMap((c) => c.seccoes);
  const totalArtigos = seccoes.reduce((soma, s) => soma + s.artigos.length, 0);

  const preco = (valor: number | null) =>
    valor === null ? comum("precoPorConfirmar") : formatarPreco(valor, locale);

  /* A fotografia de um artigo, para o visor: a mesma que aparece no círculo,
     inteira, com o nome e o preço por baixo. */
  const grupoDoArtigo = (artigo: Artigo): GrupoDoVisor | null => {
    const fotos = FOTOS_ARTIGO[artigo.id];
    if (!fotos) return null;
    const legenda = [`${artigo.nome[locale]} · ${preco(artigo.preco)}`];
    return {
      nome: artigo.nome[locale],
      fotos: fotos.map((foto) => fotoDoVisor(`/casa/${foto}`, t(`fotos.${foto}`), legenda)),
    };
  };

  const saboresDoJogo = sabores.map((s) => ({ id: s.id, nome: s.nome[locale], cor: s.cor }));

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
        itens={[
          ...capitulos.map(({ capitulo }) => ({
            id: capitulo,
            nome: t(`capitulos.${capitulo}.nome`),
          })),
          /* A carta secreta é o fim da página, e está sempre à vista no índice
             — o sítio onde a pessoa vê a carta toda de relance. */
          ...(haCartaSecreta
            ? [{ id: "carta-secreta", nome: t("secreta.indice"), secreta: true }]
            : []),
        ]}
      />

      <Visor textos={visor.textos}>
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

              {/* O sinal, lá em cima: quem leu o QR fica a saber no primeiro
                  segundo que há mais do que isto. A carta está no fim. */}
              {haCartaSecreta && (
                <a href="#carta-secreta" className="em-sinal-secreto">
                  <svg viewBox="0 0 48 56" aria-hidden="true">
                    <path d="M14 26 V17 a10 10 0 0 1 20 0 V26" />
                    <rect x="7" y="25" width="34" height="26" rx="5" />
                  </svg>
                  <span>
                    <strong>{t("secreta.sinal")}</strong> {t("secreta.sinalLigacao")}
                  </span>
                </a>
              )}
            </div>

            <div className="em-leque" aria-hidden="true">
              {LEQUE.map((foto, i) => (
                /* Fora do computador o leque não aparece (ver `.em-leque` em
                   `ementa.css`), e o `<source>` troca cada copo por um pixel
                   transparente: um `display: none` sozinho não impede o
                   telemóvel de descarregar as cinco fotografias. A condição é a
                   do CSS, negada. */
                <picture key={foto}>
                  <source media={FORA_DO_COMPUTADOR} srcSet={PIXEL} />
                  <img
                    src={`/casa/${foto}-640.webp`}
                    width={640}
                    height={853}
                    alt=""
                    style={{ "--i": i - (LEQUE.length - 1) / 2 } as React.CSSProperties}
                    fetchPriority={i === 2 ? "high" : undefined}
                  />
                </picture>
              ))}
            </div>
          </header>

          {capitulos.map(({ capitulo, seccoes }, i) => {
            const fotos: FotoDoCarrossel[] = ABERTURAS[capitulo].map(({ foto, altura, artigos }) => ({
              posicao: altura ? `50% ${altura}` : undefined,
              src: `/casa/${foto}.webp`,
              /* As deitadas têm três larguras e a maior é a do original (1672);
                 as que ainda são do Instagram, duas. */
              srcSet: foto.startsWith("abertura-")
                ? `/casa/${foto}-640.webp 640w, /casa/${foto}-1080.webp 1080w, /casa/${foto}.webp 1672w`
                : `/casa/${foto}-640.webp 640w, /casa/${foto}.webp 1080w`,
              alt: t(`fotos.${foto.replace(/^abertura-/, "")}`),
              legenda: artigos
                .map(artigoPorId)
                /* Um artigo escondido pelo painel não está na lista por baixo, e
                   a legenda não o pode anunciar. */
                .filter((a): a is Artigo => a !== undefined && !a.escondido)
                .map((a) => `${a.nome[locale]} · ${preco(a.preco)}`),
            }));

            return (
              <section
                key={capitulo}
                id={capitulo}
                className="em-capitulo"
                aria-labelledby={`titulo-${capitulo}`}
              >
                <DesenhosDoCapitulo capitulo={capitulo} />
                <header className="em-abertura">
                  <Carrossel
                    fotos={fotos}
                    prioridade={i === 0}
                    dimensoes={[1672, 941]}
                    /* No telemóvel a moldura é 4:3 e a fotografia 16:9: cobre-a
                       pela altura, e sai um terço mais larga do que o ecrã. */
                    sizes="(min-width: 72rem) 72rem, (min-width: 48rem) 100vw, 134vw"
                    textos={{
                      naFotografia: t("naFotografia"),
                      nome: t(`capitulos.${capitulo}.nome`),
                      rotuloDaFoto: comum("carrossel.foto", { n: "{n}", total: "{total}" }),
                      pausar: comum("carrossel.pausar"),
                      continuar: comum("carrossel.continuar"),
                      ampliar: visor.ampliar,
                    }}
                    /* A `key` não é decoração: um elemento criado aqui e desenhado
                       dentro de um componente de cliente passa pela fronteira do
                       servidor, e o React avisa se ele vier sem ela. */
                    titulo={
                      <div key="titulo" className="em-abertura__titulo">
                        <span className="em-abertura__numero" aria-hidden="true">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h2 id={`titulo-${capitulo}`}>{t(`capitulos.${capitulo}.nome`)}</h2>
                      </div>
                    }
                  />

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
                    /* Só as secções com duas colunas de preço (`METADADOS`) têm
                       nomes para elas nas mensagens — pedir os das outras dava o
                       nome da chave no ecrã. */
                    colunas={
                      METADADOS[categoria]?.colunas
                        ? [t(`colunas.${categoria}.a`), t(`colunas.${categoria}.b`)]
                        : ["", ""]
                    }
                    preco={preco}
                    grupoDoArtigo={grupoDoArtigo}
                    ampliar={visor.ampliar}
                    extra={
                      COM_SABORES.includes(categoria) ? (
                        <Sabores
                          sabores={saboresDoJogo}
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

                {/* "São cocktails, não deviam estar aqui?" — estão lá em baixo,
                    e esta linha é o caminho. */}
                {capitulo === "cocktails" && haCartaSecreta && (
                  <p className="em-mais-secretos">
                    <a href="#carta-secreta">{t("secreta.maisCocktails")}</a>
                  </p>
                )}
              </section>
            );
          })}

          {haCartaSecreta && (
            <CartaSecreta
              locale={locale}
              textos={{
                olho: t("secreta.olho"),
                titulo: t("secreta.titulo"),
                texto: t("secreta.texto"),
                etiqueta: t("secreta.etiqueta"),
                marcador: t("secreta.marcador"),
                abrir: t("secreta.abrir"),
                aAbrir: t("secreta.aAbrir"),
                naoInscritoTitulo: t("secreta.naoInscritoTitulo"),
                naoInscritoTexto: t("secreta.naoInscritoTexto", { email: "{email}" }),
                inscrever: t("secreta.inscrever"),
                aEnviar: t("secreta.aEnviar"),
                consentimento: convite("consentimento"),
                privacidade: convite("privacidade"),
                enviadoTitulo: t("secreta.enviadoTitulo"),
                enviadoTexto: t("secreta.enviadoTexto"),
                outroEmail: t("secreta.outroEmail"),
                abertaTexto: t("secreta.abertaTexto"),
                fechar: t("secreta.fechar"),
                erroEmail: convite("erroEmail"),
                erroLimite: convite("erroLimite"),
                erroServico: convite("erroServico"),
                precoPorConfirmar: comum("precoPorConfirmar"),
              }}
            />
          )}

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
      </Visor>

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
  grupoDoArtigo,
  ampliar,
  extra,
}: {
  categoria: Categoria;
  artigos: Artigo[];
  locale: Locale;
  titulo: string;
  dose: string;
  colunas: [string, string];
  preco: (valor: number | null) => string;
  grupoDoArtigo: (artigo: Artigo) => GrupoDoVisor | null;
  ampliar: string;
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
            const grupo = grupoDoArtigo(artigo);
            return (
              <li key={artigo.id} className="em-artigo" data-foto={grupo ? true : undefined}>
                {grupo && (
                  /* A imagem continua sem `alt`: o nome está logo ao lado, e
                     o botão já diz o que abre. A descrição vai no visor. */
                  <Ampliar
                    grupo={grupo}
                    indice={0}
                    rotulo={`${ampliar}: ${artigo.nome[locale]}`}
                    className="em-artigo__ampliar"
                  >
                    <img
                      className="em-artigo__foto"
                      src={`/casa/${FOTOS_ARTIGO[artigo.id][0]}-640.webp`}
                      width={640}
                      height={960}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </Ampliar>
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
