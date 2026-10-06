import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { cafe, DIAS, moradaCompleta, redeDoTelefone, telefoneParaLigar, urlDirecoes } from "@/data/cafe";
import { HorarioDaCozinha } from "@/components/HorarioDaCozinha";
import { Motor } from "@/components/catalogo/Motor";
import { Preguica } from "@/components/catalogo/Preguica";
import { Heroi } from "@/components/catalogo/Heroi";
import { Reels } from "@/components/catalogo/Reels";
import { Pratos } from "@/components/catalogo/Pratos";
import { Preguicosos } from "@/components/catalogo/Preguicosos";
import { avaliacoes } from "@/data/avaliacoes";
import { CartaoCarril, Rotulo } from "@/components/catalogo/Objeto";
import { IconePata } from "@/components/catalogo/Icones";
import { Redes } from "@/components/catalogo/Redes";
import { Link } from "@/i18n/navigation";
import { RodapeSite } from "@/components/RodapeSite";
import { BarraSite } from "@/components/BarraSite";
import { Visor, type GrupoDoVisor } from "@/components/Visor";
import { Carrossel, type FotoDoCarrossel } from "@/components/Carrossel";
import { fotoDoVisor, textosDoVisor } from "@/lib/visor";
import { artigoPorId } from "@/data/ementa";
import { formatarPreco } from "@/lib/preco";
import "../catalogo-motor.css";
import "../catalogo.css";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return metadataDaPagina(locale, "inicio", "/");
}

/**
 * # A página inicial — uma colecção que se percorre
 *
 * A gramática é **catálogo**: objectos numa colecção, com rótulos de museu —
 * nome, facto, dado — iguais em todos. O raciocínio está em
 * `scrollcraft/builds/preguica-inicio/BRIEF.md`.
 *
 * ## Os seis actos
 *
 * | # | Objecto | Dispositivo | Sentimento |
 * |---|---|---|---|
 * | 1 | O herói, a fachada | `parallax` | chegada |
 * | 2 | A casa | `reveal` | reconhecimento |
 * | 3 | Os cocktails | `pan` ← **pico** | deslumbre |
 * | 4 | Os reels | `pin` | curiosidade |
 * | 5 | Para partilhar | `pan` | fome |
 * | 6 | Os Preguiçosos | `pin` | confiança |
 * | 7 | Onde estamos | `in` | decisão |
 *
 * Cinco famílias de dispositivo e nenhuma repetida em actos seguidos — os dois
 * `pan` estão separados pelo `pin` dos reels, de propósito. E são duas leituras
 * diferentes do mesmo dispositivo: os cocktails passam em cartões, três ou
 * quatro ao mesmo tempo; os pratos passam em painéis à largura do ecrã, um de
 * cada vez.
 *
 * ## O que saiu, e porquê
 *
 * **Os catorze sabores** foram removidos por decisão do cliente: repetiam o que
 * o carril dos cocktails já dizia. O componente `Sabores` foi apagado em vez de
 * ficar órfão — código que ninguém chama é código que alguém vai tentar
 * perceber daqui a três meses.
 *
 * **Os Preguiçosos** saíram e voltaram com outra ideia: eram uma fotografia com
 * um número, agora são as avaliações — a nota e o que os clientes escrevem.
 */
export default async function Inicio({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("inicio");
  const comum = await getTranslations("comum");
  const marca = await getTranslations("marca");
  /* Os nomes curtos das secções, os da barra: são o que o visor escreve em cima
     — "Vinte e quatro cocktails" não cabia ao lado da contagem no telemóvel. */
  const seccoes = await getTranslations("nav.seccoes");

  const morada = moradaCompleta();
  const telefone = telefoneParaLigar();
  const rede = redeDoTelefone();
  const direcoes = urlDirecoes();
  const visor = await textosDoVisor();

  /* Os cartões do carril e o grupo que o visor desliza saem desta lista, para
     nunca haver uma fotografia no carril e outra no visor. Um `id` que deixou
     de existir na carta fica de fora dos dois (o cartão sairia em branco). */
  const carril = [
    { id: "negroni", foto: "negroni-fumo", alt: t("cocktail.alt") },
    { id: "blue-lagoon", foto: "cocktail-azul", alt: t("cocktail.alt") },
    { id: "cocktail-preguica", foto: "cocktail-rosa", alt: t("cocktail.alt") },
    { id: "cocktail-preguica", foto: "cocktail-turquesa", alt: t("cocktail.alt") },
    {
      foto: "lima-espremida",
      alt: t("carril.balcaoAlt"),
      nome: t("carril.balcaoNome"),
      facto: t("carril.balcaoFacto"),
    },
  ].filter((c) => !c.id || artigoPorId(c.id));

  /* A legenda do visor é a da carta — nome e preço pelo `id`. O cartão do
     balcão não é um artigo e fica sem ela. */
  const legenda = (id?: string) => {
    const artigo = id ? artigoPorId(id) : undefined;
    if (!artigo) return [];
    return [
      artigo.preco === null
        ? artigo.nome[locale]
        : `${artigo.nome[locale]} · ${formatarPreco(artigo.preco, locale)}`,
    ];
  };
  const grupoCarril: GrupoDoVisor = {
    nome: seccoes("carril"),
    fotos: carril.map((c) => fotoDoVisor(`/casa/${c.foto}`, c.alt, legenda(c.id))),
  };

  /**
   * As fotografias de "A casa", pela ordem em que passam. A sala de madeira
   * abre, porque é a única deitada e a que já lá estava; as outras vêm da
   * sessão do Rafael e são ao alto, num quadro deitado — perdem dois terços da
   * altura, e a `posicao` diz que terço fica.
   */
  const fotosDaCasa: FotoDoCarrossel[] = [
    fotoDoVisor("/casa/sala-madeira", t("casa.alt"), [], 640, 1536),
    ...(
      [
        ["casa-sofas", "50% 62%"],
        ["casa-quadros", "50% 40%"],
        ["casa-balcao", "50% 45%"],
        ["casa-janela", "50% 45%"],
        ["casa-sotao", "50% 55%"],
        ["casa-candeeiro", "50% 40%"],
        ["casa-garrafas", "50% 45%"],
        ["casa-sangria", "50% 70%"],
        ["casa-esplanada", "50% 65%"],
        ["casa-noite", "50% 55%"],
      ] as const
    ).map(([foto, posicao]) => ({
      ...fotoDoVisor(`/casa/${foto}`, t(`casa.fotos.${foto}`), [], 640, 1600),
      posicao,
    })),
  ];

  return (
    <>
      {/* O motor não arranca sozinho — ver `components/catalogo/Motor.tsx`. */}
      <Motor />

      <Preguica />

      <BarraSite locale={locale} atual="inicio" />

      {/* As fotografias da casa, do carril e dos pratos abrem-se inteiras no
          visor (`components/Visor.tsx`). O `Visor` não põe nada no HTML à
          volta das secções — só o `<dialog>` a seguir a elas —, por isso o
          motor continua a ver os actos como antes. A fachada fica de fora: é
          o fundo do herói, com os botões por cima. */}
      <Visor textos={visor.textos}>
        {/* 1 · A FACHADA */}
        <Heroi
          nome={marca("nome")}
          ondeFica={t("heroi.onde")}
          linha={t("heroi.linha")}
          acao={t("heroi.acao")}
          ondeEstamos={t("heroi.ondeEstamos")}
          alt={t("heroi.alt")}
        />

        {/* 2 · A CASA — texto à esquerda e a fotografia ao lado, em paisagem,
            como a porta do Damira: da altura do texto, não do ecrã. */}
        <section id="casa" className="pg-casa" data-sc-act="flow" data-sc-drift="#120c08">
          <div className="pg-casa__texto" data-sc-in data-sc-stagger="80">
            <Rotulo nome={t("casa.nome")} facto={t("casa.facto")} dado={t("casa.dado")} />
            {/* Repete de propósito a linha de "Onde estamos": aqui é o feitio da
                casa, lá é informação prática para quem vem. */}
            {cafe.aceitaAnimais && (
              <p className="pg-casa__animais">
                <IconePata className="pg-icone" />
                {t("casa.animais")}
              </p>
            )}
          </div>
          <div data-sc-reveal="up" data-sc-reveal-at="0.1 0.55">
            {/* ⚠️ Fotos **sem pessoas**: a secção chama-se "a casa" e mostra a
                casa — a sala, o granito, o balcão, a esplanada. Esteve aqui uma
                fotografia de três clientes a rir e estava errada pela razão
                mais simples: não era a casa, eram pessoas nela. */}
            <Carrossel
              fotos={fotosDaCasa}
              moldura="pg-casa__fotos"
              sizes="(min-width: 52rem) 50vw, 100vw"
              dimensoes={[1600, 2400]}
              textos={{
                naFotografia: "",
                nome: t("casa.nome"),
                rotuloDaFoto: comum("carrossel.foto", { n: "{n}", total: "{total}" }),
                pausar: comum("carrossel.pausar"),
                continuar: comum("carrossel.continuar"),
                ampliar: visor.ampliar,
              }}
            />
          </div>
        </section>

        {/* 3 · OS COCKTAILS — o pico. O palco está centrado no ecrã, não colado
            ao topo: ver `.pg-carril` em `catalogo.css`. */}
        <section id="carril" data-sc-act="pan" data-sc-span="3.6" data-sc-drift="#0e0906">
          <div data-sc-stage>
            <div className="pg-carril" data-sc-pan="0.06">
              <div className="pg-carril__abertura">
                <Rotulo
                  nome={t("carril.nome")}
                  facto={t("carril.facto")}
                  dado={t("carril.dado")}
                />
                <p className="pg-nota mt-6">{t("carril.ilustrativa")}</p>
              </div>

              {carril.map((c, i) => (
                <CartaoCarril
                  key={c.foto}
                  {...c}
                  locale={locale}
                  visor={{ grupo: grupoCarril, indice: i, ampliar: visor.ampliar }}
                />
              ))}

              <div className="pg-carril__fecho">
                <Rotulo nome={t("carril.fechoNome")} facto={t("carril.fechoFacto")} />
                <p className="mt-4">
                  <Link href="/ementa" className="pg-botao">
                    {t("carril.fechoDado")}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4 · OS REELS */}
        <Reels
          nome={t("reels.nome")}
          facto={t("reels.facto")}
          noInstagram={t("reels.noInstagram")}
          redes={comum("redes")}
          seguir={comum("seguir")}
          etiqueta={t("reels.etiqueta")}
          legendas={{
            masterclass: t("reels.legendas.masterclass"),
            tosta: t("reels.legendas.tosta"),
            negroni: t("reels.legendas.negroni"),
            valentim: t("reels.legendas.valentim"),
            menu: t("reels.legendas.menu"),
            lima: t("reels.legendas.lima"),
          }}
        />

        {/* 5 · PARA PARTILHAR */}
        <Pratos
          locale={locale}
          nome={t("partilhar.nome")}
          facto={t("partilhar.facto")}
          dado={t("partilhar.dado")}
          verMais={t("partilhar.verMais")}
          verMaisFacto={t("partilhar.verMaisFacto")}
          verMaisAcao={t("partilhar.verMaisAcao")}
          ampliar={visor.ampliar}
          alts={{
            "bocadinhos-de-pao-com-chourico": t("partilhar.altTabua"),
            "torrada-com-compota": t("partilhar.altTosta"),
            "torrada-com-compota-facto": t("partilhar.factoTosta"),
          }}
        />

        {/* 6 · OS PREGUIÇOSOS — as avaliações, logo antes de "onde estamos". */}
        <Preguicosos
          locale={locale}
          nome={t("preguicosos.nome")}
          facto={t("preguicosos.facto")}
          contagem={
            avaliacoes.total !== null
              ? t("preguicosos.contagem", { total: avaliacoes.total })
              : null
          }
          estrelasTexto={t("preguicosos.estrelas", { nota: avaliacoes.nota ?? 0 })}
          verTodas={t("preguicosos.verTodas")}
          url={direcoes}
        />

        {/* 7 · ONDE ESTAMOS — o fecho. O mapa de fundo é um SVG nosso, desenhado
            do OpenStreetMap por `scripts/desenhar-mapa.mjs`, e não o Google
            Maps: ver o porquê no cabeçalho desse script. */}
        <section id="onde" className="pg-onde" data-sc-act="flow" data-sc-drift="#0b0806">
          <div className="pg-onde__mapa">
            <img
              src="/mapa/ermesinde.svg"
              width={1600}
              height={820}
              alt={t("onde.mapaAlt")}
              loading="lazy"
            />
            {/* A preguiça é o sítio da casa no mapa, e é o primeiro sítio onde se
                toca: por isso leva ao Google Maps, como o botão do cartão. Sem
                direções confirmadas fica só o desenho. */}
            {direcoes ? (
              <a
                className="pg-onde__alfinete"
                href={direcoes}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("onde.direcoes")}
              >
                <img src="/marca/preguica.webp" alt="" width={325} height={286} />
              </a>
            ) : (
              <span className="pg-onde__alfinete" aria-hidden="true">
                <img src="/marca/preguica.webp" alt="" width={325} height={286} />
              </span>
            )}
            {/* O crédito é condição da licença ODbL, não decoração. */}
            <p className="pg-onde__credito">
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
                {t("onde.credito")}
              </a>
            </p>
          </div>

          <div className="pg-onde__cartao" data-sc-in data-sc-stagger="70">
            <p className="pg-onde__olho">{t("onde.olho")}</p>
            <h2 className="pg-onde__nome">{marca("nome")}</h2>
            {morada && <p className="pg-onde__morada">{morada}</p>}

            <ul className="pg-onde__contactos">
              {telefone && cafe.telefone && (
                <li>
                  <a href={`tel:${telefone}`}>{cafe.telefone}</a>
                  {rede && <span className="pg-onde__custo"> ({t(`onde.chamada.${rede}`)})</span>}
                </li>
              )}
              {cafe.email && (
                <li>
                  <a href={`mailto:${cafe.email}`}>{cafe.email}</a>
                </li>
              )}
            </ul>

            {cafe.horarios && (
              <>
                <p className="pg-onde__olho">{t("onde.horario")}</p>
                <ul className="pg-onde__horario">
                  {DIAS.map((dia) => {
                    const h = cafe.horarios![dia];
                    return (
                      <li key={dia}>
                        <span>{comum(`dias.${dia}`)}</span>
                        <span>{h ? `${h.abre} – ${h.fecha}` : comum("encerrado")}</span>
                      </li>
                    );
                  })}
                </ul>
                <HorarioDaCozinha locale={locale} className="pg-onde__cozinha" />
                {/* Desaparece sozinho quando `horarioConfirmado` passar a `true`. */}
                {!cafe.horarioConfirmado && (
                  <p className="pg-nota">{t("onde.horarioPorConfirmar")}</p>
                )}
              </>
            )}

            {/* Pedido do cliente. Vive aqui, e não numa secção própria, porque é
                informação prática para quem vem: está ao pé do horário. */}
            {cafe.aceitaAnimais && (
              <p className="pg-onde__animais">
                <IconePata className="pg-icone" />
                {t("onde.animais")}
              </p>
            )}

            <p className="pg-onde__botoes">
              {direcoes && (
                <a className="pg-botao" href={direcoes} target="_blank" rel="noopener noreferrer">
                  {t("onde.direcoes")} <span aria-hidden="true">↗</span>
                </a>
              )}
            </p>
            <Redes rotulo={comum("redes")} seguir={comum("seguir")} className="pg-onde__redes" />
          </div>
        </section>
      </Visor>

      {/* O rodapé é mínimo de propósito: "onde estamos" acabou de dar a morada, o
          telefone e o horário três centímetros acima. Repeti-los aqui era ruído.
          Fica o que a lei pede e o crédito. */}
      <RodapeSite />
    </>
  );
}
