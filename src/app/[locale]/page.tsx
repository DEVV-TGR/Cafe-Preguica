import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { cafe, DIAS, telefoneParaLigar, urlDirecoes } from "@/data/cafe";
import { Motor } from "@/components/catalogo/Motor";
import { Preguica } from "@/components/catalogo/Preguica";
import { Heroi } from "@/components/catalogo/Heroi";
import { Reels } from "@/components/catalogo/Reels";
import { Pratos } from "@/components/catalogo/Pratos";
import { Preguicosos } from "@/components/catalogo/Preguicosos";
import { avaliacoes } from "@/data/avaliacoes";
import { CartaoCarril, Rotulo } from "@/components/catalogo/Objeto";
import { Link } from "@/i18n/navigation";
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
 * | 6 | Os Preguiçosos | `in` + `reveal` | confiança |
 * | 7 | A porta | `in` | decisão |
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
  const rodape = await getTranslations("rodape");

  const telefone = telefoneParaLigar();
  const direcoes = urlDirecoes();

  return (
    <>
      {/* O motor não arranca sozinho — ver `components/catalogo/Motor.tsx`. */}
      <Motor />

      <span data-sc-progress />
      <Preguica />

      <header className="pg-barra">
        {/* A marca desenhada, não o nome composto numa fonte qualquer. */}
        <span className="pg-barra__marca">
          <img src="/marca/marca.webp" width={819} height={507} alt={marca("nome")} />
        </span>
        <nav className="pg-indice" aria-label={t("indice.carril")}>
          <a href="#casa">{t("indice.casa")}</a>
          <a href="#carril">{t("indice.carril")}</a>
          <a href="#reels">{t("indice.reels")}</a>
          <a href="#partilhar">{t("indice.partilhar")}</a>
          {avaliacoes.nota !== null && <a href="#preguicosos">{t("indice.preguicosos")}</a>}
          <a href="#porta">{t("indice.porta")}</a>
        </nav>
        {telefone && (
          <a className="pg-acao" href={`tel:${telefone}`}>
            {t("acao")}
          </a>
        )}
      </header>

      {/* 1 · A FACHADA */}
      <Heroi
        nome={marca("nome")}
        ondeFica={t("heroi.onde")}
        linha={t("heroi.linha")}
        acao={t("heroi.acao")}
        alt={t("heroi.alt")}
      />

      {/* 2 · A CASA — uma faixa baixa ao lado do texto. O texto é curto, e uma
          fotografia em retrato fazia dele uma secção de ecrã inteiro. */}
      <section id="casa" className="pg-casa" data-sc-act="flow" data-sc-drift="#120c08">
        <figure data-sc-reveal="up" data-sc-reveal-at="0.1 0.55">
          {/* ⚠️ Foto **sem pessoas**: a secção chama-se "a casa" e mostra a
              casa — a parede de granito, a madeira, a carta em cima da mesa.
              Esteve aqui uma fotografia de três clientes a rir e estava errada
              pela razão mais simples: não era a casa, eram pessoas nela. */}
          <img
            src="/casa/menu-mesa.webp"
            srcSet="/casa/menu-mesa-640.webp 640w, /casa/menu-mesa.webp 1080w"
            sizes="(min-width: 52rem) 55vw, 100vw"
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

            <CartaoCarril id="negroni" foto="negroni-fumo" locale={locale} alt={t("cocktail.alt")} />
            <CartaoCarril id="blue-lagoon" foto="cocktail-azul" locale={locale} alt={t("cocktail.alt")} />
            <CartaoCarril id="cocktail-preguica" foto="cocktail-rosa" locale={locale} alt={t("cocktail.alt")} />
            <CartaoCarril id="cocktail-preguica" foto="cocktail-turquesa" locale={locale} alt={t("cocktail.alt")} />
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
        dado={t("reels.dado")}
        noInstagram={t("reels.noInstagram")}
        seguir={t("reels.seguir")}
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
        alts={{
          "bocadinhos-de-pao-com-chourico": t("partilhar.altTabua"),
          "torrada-com-compota": t("partilhar.altTosta"),
          "torrada-com-compota-facto": t("partilhar.factoTosta"),
        }}
      />

      {/* 6 · OS PREGUIÇOSOS — as avaliações, logo antes da porta. */}
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

      {/* 7 · A PORTA — o fecho, em duas colunas: como reservar, e onde e
          quando. Já teve a fachada escurecida por trás e saiu: era uma
          fotografia a fazer de textura, e o fecho lia-se como um borrão. */}
      <section id="porta" className="pg-porta" data-sc-act="flow" data-sc-drift="#0b0806">
        <div className="pg-porta__grelha">
          <div className="pg-porta__coluna" data-sc-in data-sc-stagger="90">
            <Rotulo nome={t("porta.nome")} facto={t("porta.facto")} />

            {telefone && cafe.telefone && (
              <>
                <p>
                  <a className="pg-porta__telefone" href={`tel:${telefone}`}>
                    {cafe.telefone}
                  </a>
                </p>
                <p>
                  <a className="pg-botao pg-botao--cheio" href={`tel:${telefone}`}>
                    {t("porta.ligar")}
                  </a>
                </p>
              </>
            )}
          </div>

          <div className="pg-porta__coluna pg-porta__coluna--onde" data-sc-in data-sc-stagger="90">
            <h3 className="pg-porta__subtitulo">{t("porta.ondeQuando")}</h3>

            {cafe.morada && (
              <address className="pg-porta__morada">
                {cafe.morada}
                <br />
                {[cafe.codigoPostal, cafe.cidade].filter(Boolean).join(" ")}
              </address>
            )}
            {direcoes && (
              <p>
                <a className="pg-botao" href={direcoes} target="_blank" rel="noopener noreferrer">
                  {t("porta.direcoes")}
                </a>
              </p>
            )}

            {cafe.horarios && (
              <ul className="pg-porta__horario">
                {DIAS.map((dia) => {
                  const h = cafe.horarios![dia];
                  return (
                    <li key={dia}>
                      <span>{comum(`dias.${dia}`)}</span>
                      <span>{h ? `${h.abre}–${h.fecha}` : comum("encerrado")}</span>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Desaparece sozinho quando `horarioConfirmado` passar a `true`. */}
            {!cafe.horarioConfirmado && (
              <p className="pg-nota">{t("porta.horarioPorConfirmar")}</p>
            )}
          </div>
        </div>

        <p className="pg-porta__ate">{t("porta.ateLogo")}</p>
      </section>

      {/* O rodapé é mínimo de propósito: "a porta" acabou de dar a morada, o
          telefone e o horário três centímetros acima. Repeti-los aqui era ruído.
          Fica o que a lei pede e o crédito. */}
      <RodapeInicial
        privacidade={rodape("privacidade")}
        cookies={rodape("cookies")}
        direitos={rodape("direitos")}
        feitoPor={rodape("feitoPor")}
        nome={marca("nome")}
      />
    </>
  );
}

/**
 * O rodapé da página inicial. É diferente do `components/Rodape.tsx`, que serve
 * as páginas de leitura e lá **tem** de repetir a morada e o telefone: quem está
 * na página de cookies não passou por "a porta".
 */
function RodapeInicial({
  privacidade,
  cookies,
  direitos,
  feitoPor,
  nome,
}: {
  privacidade: string;
  cookies: string;
  direitos: string;
  feitoPor: string;
  nome: string;
}) {
  return (
    <footer className="pg-rodape">
      <nav aria-label={privacidade}>
        <Link href="/privacidade">{privacidade}</Link>
        <Link href="/cookies">{cookies}</Link>
      </nav>
      <p>
        © {new Date().getFullYear()} {nome}. {direitos} {feitoPor}{" "}
        <a href="https://devplus.pt" target="_blank" rel="noopener noreferrer">
          DevPlus
        </a>
        .
      </p>
    </footer>
  );
}
