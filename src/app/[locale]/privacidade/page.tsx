import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { metadataDaPagina } from "@/lib/metadata";
import { URL_CNPD } from "@/lib/site";
import { cafe } from "@/data/cafe";
import { Aviso, Ficha, Pagina, Seccao } from "@/components/Pagina";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return metadataDaPagina(locale, "privacidade", "/privacidade");
}

/**
 * Política de privacidade.
 *
 * Reescrita na revisão legal de 2026-10-15, contra o artigo 13.º do RGPD:
 * responsável e contactos, finalidades e bases por tratamento, destinatários,
 * transferências, prazos, direitos, retirada do consentimento e reclamação à
 * CNPD. **Não é um parecer jurídico** e não certifica conformidade; diz o que o
 * código faz hoje, e o que falta confirmar está à vista.
 *
 * ## O que esta página não pode dizer sozinha
 *
 * - **Quem é o responsável.** Vem de `cafe.operador`; com `null`, a página diz
 *   que a identificação está por publicar, em vez de dar o nome comercial como
 *   se fosse uma pessoa jurídica. Ver `pendenciasLegais()` em `data/cafe.ts`.
 * - **Os prazos dos prestadores** (registos do alojamento, registo dos envios
 *   na Resend, cópias de segurança): dependem dos planos das contas
 *   definitivas, e a página remete para eles em vez de inventar um número.
 * - Não fala de encarregado de proteção de dados: não se sabe se a casa
 *   designou um, e não se inventa.
 *
 * ## Os prazos que diz são os que o código cumpre
 *
 * Cada número desta página tem uma constante e um teste por trás:
 * entradas da equipa (`PRAZO_DAS_ENTRADAS_MS`, `testes/entradas.test.mjs`),
 * aparelhos (`testes/aparelhos.test.mjs`), prova do consentimento
 * (`PRAZO_DA_PROVA_S`, `testes/consentimento.test.mjs`), marca do aviso
 * (`PRAZO_DA_MARCA_S`, `testes/cancelamento.test.mjs`). **Mudar um número aqui
 * sem mudar o código — ou o contrário — é voltar ao problema que esta revisão
 * corrigiu**: a página prometia 30 dias e a lista durava um ano renovável.
 *
 * **Esta página tem de ser relida no dia em que entrar outro formulário**, uma
 * ferramenta de estatísticas ou um mapa embebido. Está anotado em
 * `docs/decisoes-pendentes.md`.
 */
export default async function Privacidade({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacidade");
  const meta = await getTranslations("metadata.privacidade");

  const operador = cafe.operador;
  const email = operador?.emailPrivacidade ?? cafe.email;

  /* As etiquetas que os parágrafos podem usar. Um parágrafo que não use uma
     delas não a mostra — o `next-intl` só troca as que encontra. */
  const etiquetas = {
    cnpd: (texto: React.ReactNode) => (
      <a href={URL_CNPD} target="_blank" rel="noopener noreferrer">
        {texto} <span aria-hidden="true">↗</span>
      </a>
    ),
    cookies: (texto: React.ReactNode) => <Link href="/cookies">{texto}</Link>,
    contactos: (texto: React.ReactNode) => <Link href="/contactos">{texto}</Link>,
    email: (texto: React.ReactNode) => <a href={`mailto:${email}`}>{texto}</a>,
  };

  /* As secções de texto corrido, por ordem. Cada uma tem `paragrafos` com
     chaves `a`, `b`, … — lidas do ficheiro de mensagens, para acrescentar um
     parágrafo não obrigar a mexer aqui. */
  const corridas = [
    "visitas",
    "pedidos",
    "newsletter",
    "carta",
    "equipa",
    "destinatarios",
    "transferencias",
  ] as const;
  const paragrafos = (chave: string) =>
    Object.keys(t.raw(`${chave}.paragrafos`) as Record<string, string>).map((p) => (
      <p key={p}>{t.rich(`${chave}.paragrafos.${p}`, etiquetas)}</p>
    ));

  const itensDaConservacao = Object.keys(t.raw("conservacao.itens") as Record<string, string>);
  const direitos = paragrafos("direitos");

  let numero = 0;

  return (
    <Pagina locale={locale} olho={t("olho")} titulo={t("titulo")} intro={meta("descricao")} larga>
      {/* A ficha tem de dizer o mesmo que as secções. Se entrar um formulário
          ou um serviço de terceiros, mudam as duas — ver o aviso acima. */}
      <Ficha
        itens={[
          { rotulo: t("ficha.formularios"), valor: t("ficha.pedidoDeEmail") },
          { rotulo: t("ficha.cookies"), valor: t("ficha.soEquipa") },
          { rotulo: t("ficha.prestadores"), valor: t("ficha.quais") },
        ]}
      />
      <Aviso>{t("versao")}</Aviso>

      <Seccao numero={++numero} titulo={t("responsavel.titulo")}>
        {operador ? (
          <p>
            {t("responsavel.identificacao", {
              nome: operador.nome,
              forma: t(`formas.${operador.forma}`),
              nif: operador.nif,
              sede: operador.sede,
            })}
          </p>
        ) : (
          <Aviso>{t("pendente")}</Aviso>
        )}
        <p>
          {email
            ? t.rich("responsavel.contacto", { ...etiquetas, endereco: email })
            : t.rich("responsavel.semEmail", etiquetas)}
        </p>
      </Seccao>

      {corridas.map((chave) => (
        <Seccao key={chave} numero={++numero} titulo={t(`${chave}.titulo`)}>
          {paragrafos(chave)}
        </Seccao>
      ))}

      <Seccao numero={++numero} titulo={t("conservacao.titulo")}>
        <p>{t("conservacao.intro")}</p>
        <ul>
          {itensDaConservacao.map((item) => (
            <li key={item}>{t(`conservacao.itens.${item}`)}</li>
          ))}
        </ul>
      </Seccao>

      <Seccao numero={++numero} titulo={t("direitos.titulo")}>
        {direitos}
      </Seccao>
    </Pagina>
  );
}
