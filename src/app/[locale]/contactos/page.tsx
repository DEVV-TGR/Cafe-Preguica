import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { Pagina } from "@/components/Pagina";
import {
  cafe,
  DIAS,
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
    <Pagina locale={locale}>
      <article className="flex flex-col gap-8">
      <h1 className="font-display text-4xl font-semibold">{t("titulo")}</h1>

      {!temAlgumaCoisa && (
        <p role="status" className="border border-linha bg-white px-4 py-3 text-sm">
          {t("semDados")}
        </p>
      )}

      {morada && (
        <section>
          <h2 className="font-display text-xl font-semibold">{t("morada")}</h2>
          <p>{morada}</p>
          {direcoes && (
            <p className="mt-2">
              {/* Link normal para o Maps, não um mapa embebido: assim a Google
                  só vê quem carregar aqui. Ver `docs/seguranca.md`. */}
              <a
                href={direcoes}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {t("direcoes")}
              </a>
            </p>
          )}
        </section>
      )}

      {telefone && cafe.telefone && (
        <section>
          <h2 className="font-display text-xl font-semibold">{t("telefone")}</h2>
          <p>
            <a href={`tel:${telefone}`} className="underline">
              {cafe.telefone}
            </a>
          </p>
        </section>
      )}

      {cafe.email && (
        <section>
          <h2 className="font-display text-xl font-semibold">{t("email")}</h2>
          <p>
            <a href={`mailto:${cafe.email}`} className="underline">
              {cafe.email}
            </a>
          </p>
        </section>
      )}

      {cafe.horarios && (
        <section>
          <h2 className="font-display text-xl font-semibold">{t("horario")}</h2>
          {/* Uma lista de definição e não uma tabela: é um par dia/horas, não
              uma grelha com duas dimensões. */}
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
            {DIAS.map((dia) => {
              const horario = cafe.horarios![dia];
              return (
                <div key={dia} className="contents">
                  <dt>{comum(`dias.${dia}`)}</dt>
                  <dd className="tabular-nums">
                    {horario
                      ? `${horario.abre}–${horario.fecha}`
                      : comum("encerrado")}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}
      </article>
    </Pagina>
  );
}
