import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { cafe, DIAS, moradaCompleta, telefoneParaLigar, urlDirecoes } from "@/data/cafe";
import { SABORES } from "@/data/ementa";
import { Motor } from "@/components/catalogo/Motor";
import { Preguica } from "@/components/catalogo/Preguica";
import { Sabores } from "@/components/catalogo/Sabores";
import { CartaoCarril, Rotulo } from "@/components/catalogo/Objeto";
import { Rodape } from "@/components/Rodape";
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
 * A gramática é **catálogo**, e não o editorial em capítulos do site anterior
 * do estúdio. O raciocínio inteiro, incluindo porque é que as outras sete
 * gramáticas perderam, está em `scrollcraft/builds/preguica-inicio/BRIEF.md`.
 *
 * O que isso obriga, e que se vê no código abaixo:
 *
 * - **Sem herói separado.** O primeiro objecto já está em vista e já está
 *   rotulado; a colecção começa no topo da página. Não há uma frase de promessa
 *   por cima de uma fotografia esticada.
 * - **Rótulos de museu.** Nome, facto, dado. Sem persuasão, e o mesmo esquema
 *   em todos — ver `components/catalogo/Objeto.tsx`.
 * - **A navegação é um índice de objectos** que salta, não um menu de páginas.
 * - **O fecho é uma placa tipografada como um rótulo**, para o pedido ler como
 *   parte da colecção e não como um banner colado no fim.
 *
 * ## Os sete actos e o que cada um faz
 *
 * A regra é nunca repetir família de dispositivo em actos seguidos, e usar pelo
 * menos quatro famílias. Estão aqui seis: `in`, `parallax`, `pan`, ponteiro,
 * `reveal` e `pin`.
 *
 * | # | Objecto | Dispositivo | Sentimento |
 * |---|---|---|---|
 * | 1 | O cocktail | `in` | recolhimento |
 * | 2 | A casa | `parallax` | reconhecimento |
 * | 3 | Os cocktails | `pan` ← **pico** | deslumbre |
 * | 4 | Os sabores | ponteiro | posse |
 * | 5 | Para partilhar | `reveal` | fome |
 * | 6 | Os Preguiçosos | `in` + número real | pertença |
 * | 7 | A porta | `pin` | decisão |
 *
 * O acto 3 leva o maior `span` da página com margem visível — 3,4 contra 1,8 do
 * segundo maior. É o pico, e o pico leva o espaço.
 *
 * ⚠️ **Zero actos de `scrub`**, porque não há um único clipe de vídeo da casa.
 * Não é falta: é o que faz o primeiro acto ser tipográfico e escuro em vez de
 * uma fotografia de 1080 px esticada num monitor de 27 polegadas.
 */
export default async function Inicio({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("inicio");
  const comum = await getTranslations("comum");
  const marca = await getTranslations("marca");

  const morada = moradaCompleta();
  const telefone = telefoneParaLigar();
  const direcoes = urlDirecoes();

  const etiquetasSabores = Object.fromEntries(
    SABORES.map((s) => [s, t(`sabores.lista.${s}`)]),
  );

  return (
    <>
      {/* O motor não arranca sozinho — ver `components/catalogo/Motor.tsx`. */}
      <Motor />

      <span data-sc-progress />
      <Preguica />

      <header className="pg-barra">
        <span className="pg-barra__marca">{marca("nome")}</span>
        <nav className="pg-indice" aria-label={t("indice.carril")}>
          <a href="#casa">{t("indice.casa")}</a>
          <a href="#carril">{t("indice.carril")}</a>
          <a href="#sabores">{t("indice.sabores")}</a>
          <a href="#porta">{t("indice.porta")}</a>
        </nav>
        {telefone && (
          <a className="pg-acao" href={`tel:${telefone}`}>
            {t("acao")}
          </a>
        )}
      </header>

      {/* 1 · O COCKTAIL — objecto um, já em vista e já rotulado. */}
      <section className="pg-objeto pg-objeto--duplo" data-sc-act="flow">
        <div data-sc-in data-sc-stagger="90">
          <Rotulo
            nome={t("cocktail.nome")}
            facto={t("cocktail.facto")}
            dado={t("cocktail.dado")}
          />
        </div>
        <figure data-sc-in>
          <img
            src="/casa/cocktail-coco.webp"
            srcSet="/casa/cocktail-coco-640.webp 640w, /casa/cocktail-coco.webp 1080w"
            sizes="(min-width: 52rem) 40vw, 90vw"
            width={1080}
            height={1440}
            alt={t("cocktail.alt")}
            fetchPriority="high"
          />
        </figure>
      </section>

      {/* 2 · A CASA — camadas a ritmos diferentes. */}
      <section
        id="casa"
        className="pg-objeto pg-objeto--duplo pg-objeto--trailing"
        data-sc-act="flow"
        data-sc-drift="#120c08"
      >
        <figure data-sc-parallax="0.12">
          <img
            src="/casa/mesa-tres.webp"
            srcSet="/casa/mesa-tres-640.webp 640w, /casa/mesa-tres.webp 1080w"
            sizes="(min-width: 52rem) 45vw, 90vw"
            width={1080}
            height={1440}
            alt={t("casa.alt")}
            loading="lazy"
          />
        </figure>
        <div data-sc-in data-sc-stagger="80">
          <Rotulo nome={t("casa.nome")} facto={t("casa.facto")} dado={t("casa.dado")} />
        </div>
      </section>

      {/* 3 · OS COCKTAILS — o pico. `pan` é a espinha desta gramática.
          A abertura e o fecho são itens do carril de propósito: sem eles o
          carril pode ficar mais estreito que o ecrã e viajar zero. */}
      <section id="carril" data-sc-act="pan" data-sc-span="3.4" data-sc-drift="#0e0906">
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

            <CartaoCarril id="negroni" foto="negroni-fumo" locale={locale} alt={t("cocktail.alt")} />
            <CartaoCarril id="blue-lagoon" foto="cocktail-azul" locale={locale} alt={t("cocktail.alt")} />
            {/* ⚠️ **Este bloco já teve quatro cartões e passou a ter dois**, e
                a razão só se viu ao olhar para os screenshots: quatro "Cocktail
                Preguiça" seguidos, com a mesma descrição e o mesmo preço, lêem-se
                como uma avaria e não como uma colecção. O rótulo continua a não
                adivinhar o sabor a partir da cor — isso não se consegue ver numa
                fotografia — mas dois chegam para dizer "o mesmo copo, outras
                cores". */}
            <CartaoCarril id="cocktail-preguica" foto="cocktail-rosa" locale={locale} alt={t("cocktail.alt")} />
            <CartaoCarril id="cocktail-preguica" foto="cocktail-turquesa" locale={locale} alt={t("cocktail.alt")} />

            {/* Um objecto da colecção que não é um artigo da carta: não tem preço
                porque não se vende, vende-se o que sai dele. */}
            <CartaoCarril
              foto="lima-espremida"
              locale={locale}
              nome={t("carril.balcaoNome")}
              facto={t("carril.balcaoFacto")}
              alt={t("carril.balcaoAlt")}
            />

            <div className="pg-carril__fecho">
              <Rotulo nome={t("carril.fechoNome")} facto={t("carril.fechoFacto")} />
              <p className="mt-4">
                <Link href="/ementa" className="pg-acao">
                  {t("carril.fechoDado")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4 · OS SABORES — o único acto que responde ao ponteiro. */}
      <section id="sabores" className="pg-objeto" data-sc-act="flow">
        <div className="flex flex-col gap-8" data-sc-in data-sc-stagger="70">
          <Rotulo
            nome={t("sabores.nome")}
           
            dado={t("sabores.dado")}
          />
          <Sabores etiquetas={etiquetasSabores} inicial="morango" />
        </div>
      </section>

      {/* 5 · PARA PARTILHAR — limpeza por objecto. */}
      <section
        className="pg-objeto pg-objeto--duplo"
        data-sc-act="flow"
        data-sc-drift="#150e09"
      >
        <div data-sc-in>
          <Rotulo
            nome={t("partilhar.nome")}
            facto={t("partilhar.facto")}
            dado={t("partilhar.dado")}
          />
        </div>
        <figure data-sc-reveal="left" data-sc-reveal-at="0.15 0.6">
          <img
            src="/casa/tabua-partilha.webp"
            srcSet="/casa/tabua-partilha-640.webp 640w, /casa/tabua-partilha.webp 1080w"
            sizes="(min-width: 52rem) 45vw, 90vw"
            width={1080}
            height={1440}
            alt={t("partilhar.alt")}
            loading="lazy"
          />
        </figure>
      </section>

      {/* 6 · OS PREGUIÇOSOS — o número é real e verificável, senão não entrava. */}
      <section
        className="pg-objeto pg-objeto--duplo pg-objeto--trailing"
        data-sc-act="flow"
      >
        {/* `parallax` e não `in`: o acto seguinte entra com `in`, e a regra é
            nunca repetir a mesma família de dispositivo em actos seguidos. */}
        <figure data-sc-parallax="0.1">
          <img
            src="/casa/canecas-ardosia.webp"
            srcSet="/casa/canecas-ardosia-640.webp 640w, /casa/canecas-ardosia.webp 1080w"
            sizes="(min-width: 52rem) 45vw, 90vw"
            width={1080}
            height={1440}
            alt={t("gente.alt")}
            loading="lazy"
          />
        </figure>
        <div data-sc-in data-sc-stagger="80">
          <Rotulo nome={t("gente.nome")} facto={t("gente.facto")} dado={t("gente.dado")} />
        </div>
      </section>

      {/* 7 · A PORTA — a placa tipografada como um rótulo. É o fecho.
          ⚠️ **Já foi um acto `pin` e deixou de o ser**, e a razão viu-se nos
          screenshots: um acto pinado solta a placa a meio do seu percurso e
          mostra o resto do espaço vazio, portanto a página acabava num ecrã
          preto. Em fluxo normal a placa fica onde está e o rodapé fecha logo a
          seguir — o fecho resolve em vez de se desvanecer. */}
      <section id="porta" className="pg-objeto" data-sc-act="flow" data-sc-drift="#0b0806">
        <div>
          <div className="pg-placa" data-sc-in data-sc-stagger="80">
            <Rotulo nome={t("porta.nome")} facto={t("porta.facto")} />

            <dl>
              {morada && (
                <>
                  <dt>{t("porta.morada")}</dt>
                  <dd>
                    {morada}
                    {direcoes && (
                      <>
                        {" · "}
                        <a
                          href={direcoes}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {t("porta.direcoes")}
                        </a>
                      </>
                    )}
                  </dd>
                </>
              )}
              {cafe.horarios && (
                <>
                  <dt>{t("porta.horario")}</dt>
                  <dd>
                    {DIAS.map((dia) => {
                      const h = cafe.horarios![dia];
                      return (
                        /* Dia e hora em colunas próprias: em corrida, "Segunda
                           15:30–00:00" parte-se a meio num ecrã estreito e as
                           horas deixam de alinhar uma debaixo da outra. */
                        <span key={dia} className="grid grid-cols-[6.5rem_1fr]">
                          <span>{comum(`dias.${dia}`)}</span>
                          <span>{h ? `${h.abre}–${h.fecha}` : comum("encerrado")}</span>
                        </span>
                      );
                    })}
                  </dd>
                </>
              )}
            </dl>

            {/* O aviso desaparece sozinho no dia em que `horarioConfirmado`
                passar a `true` em `cafe.json`. Ver o comentário lá. */}
            {!cafe.horarioConfirmado && (
              <p className="pg-nota">{t("porta.horarioPorConfirmar")}</p>
            )}

            {telefone && cafe.telefone && (
              <p>
                <a className="pg-placa__telefone" href={`tel:${telefone}`}>
                  {cafe.telefone}
                </a>
              </p>
            )}

            <p className="pg-rotulo__dado">{t("porta.ateLogo")}</p>
          </div>
        </div>
      </section>

      {/* ⚠️ O rodapé está aqui e não no `layout.tsx` por uma razão que só se viu
          nos screenshots: sem ele, **a página acabava num ecrã preto vazio.** O
          acto pinado larga a placa e, a seguir, não havia nada — o fecho
          desvanecia-se em vez de resolver, que é das poucas coisas que a skill
          trata como impeditivo de publicação.

          Também é o que traz de volta as ligações à privacidade e aos cookies,
          que a página inicial perdeu ao deixar de usar o invólucro comum. */}
      <Rodape />
    </>
  );
}
