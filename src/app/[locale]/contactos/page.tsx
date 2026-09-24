import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { Aviso, Pagina, Seccao } from "@/components/Pagina";
import {
  cafe,
  DIAS,
  cozinhaFecha,
  moradaCompleta,
  telefoneParaLigar,
  urlDirecoes,
} from "@/data/cafe";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return metadataDaPagina(locale, "contactos", "/contactos");
}

/**
 * Contactos.
 *
 * ⚠️ **Hoje esta página está quase toda vazia, e isso é o comportamento certo.**
 * Não há morada, telefone nem horário confirmados em `cafe.json`, e nenhum deles
 * se inventa: um número errado no site manda alguém ligar a um estranho, e um
 * horário errado manda alguém a uma porta fechada. Enquanto não houver dados, a
 * página diz que não há.
 *
 * Não há formulário — a decisão ainda está em aberto, e está registada em
 * `docs/decisoes-pendentes.md` com o custo de cada lado. Enquanto não houver,
 * os contactos são links diretos e o site não recebe dados de ninguém.
 */
export default async function Contactos({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contactos");
  const comum = await getTranslations("comum");

  const morada = moradaCompleta();
  const telefone = telefoneParaLigar();
  const direcoes = urlDirecoes();
  const temAlgumaCoisa = Boolean(morada || telefone || cafe.email || cafe.horarios);

  return (
    <Pagina locale={locale} olho={comum("olhoCasa")} titulo={t("titulo")}>
      {!temAlgumaCoisa && <Aviso>{t("semDados")}</Aviso>}

      {morada && (
        <Seccao titulo={t("morada")}>
          <p>{morada}</p>
          {direcoes && (
            <p>
              {/* Link normal para o Maps, não um mapa embebido: assim a Google
                  só vê quem carregar aqui. Ver `docs/seguranca.md`. */}
              <a href={direcoes} target="_blank" rel="noopener noreferrer">
                {t("direcoes")} <span aria-hidden="true">↗</span>
              </a>
            </p>
          )}
        </Seccao>
      )}

      {telefone && cafe.telefone && (
        <Seccao titulo={t("telefone")}>
          <p>
            <a href={`tel:${telefone}`}>{cafe.telefone}</a>
          </p>
        </Seccao>
      )}

      {cafe.email && (
        <Seccao titulo={t("email")}>
          <p>
            <a href={`mailto:${cafe.email}`}>{cafe.email}</a>
          </p>
        </Seccao>
      )}

      {cafe.horarios && (
        <Seccao titulo={t("horario")}>
          {/* Uma lista de definição e não uma tabela: é um par dia/horas, não
              uma grelha com duas dimensões. */}
          <dl className="lt-horario">
            {DIAS.map((dia) => {
              const horario = cafe.horarios![dia];
              const cozinha = cozinhaFecha(dia);
              return (
                <div key={dia} className="contents">
                  <dt>{comum(`dias.${dia}`)}</dt>
                  <dd>
                    {horario
                      ? `${horario.abre}–${horario.fecha}`
                      : comum("encerrado")}
                    {/* Só quando a cozinha fecha antes do bar: repetir a mesma
                        hora duas vezes não diz nada a ninguém. */}
                    {horario && cozinha !== horario.fecha && (
                      <span className="lt-horario__cozinha">
                        {comum("cozinhaAte", { hora: cozinha! })}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          {DIAS.some((dia) => cafe.horarios?.[dia]?.cozinhaFecha) && (
            <p className="lt-nota">{comum("cozinhaNota")}</p>
          )}
        </Seccao>
      )}
    </Pagina>
  );
}
