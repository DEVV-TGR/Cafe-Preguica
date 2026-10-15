import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { Ficha, Pagina, Seccao } from "@/components/Pagina";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return metadataDaPagina(locale, "cookies", "/cookies");
}

/**
 * Cookies — e tudo o resto que fica no navegador.
 *
 * Esta página só pode dizer o que diz porque o site não carrega nada de fora: as
 * fontes vêm do próprio domínio (`next/font`), não há mapa embebido, não há
 * botões de redes sociais e não há ferramenta de estatísticas. A CSP em
 * `src/lib/cabecalhos.ts` é o que mantém isso verdadeiro ao longo do tempo — um script
 * de terceiros acrescentado por distração é bloqueado pelo browser em vez de
 * passar despercebido.
 *
 * ⚠️ **Se um dia entrar um mapa, um vídeo do YouTube ou estatísticas, esta
 * página deixa de estar correta** e passa a ser preciso consentimento prévio.
 * É uma das razões pelas quais essas coisas não entram sem decisão explícita.
 *
 * ## "Não é cookie" não chega
 *
 * Revisão legal de 2026-10-15. A página já disse que não havia banner porque
 * "não haveria nada para consentir", e ao mesmo tempo descrevia notas no
 * `localStorage` — uma delas com o email, válida 180 dias e gravada sem
 * ninguém a pedir. A regra (Lei 41/2004, art. 5.º) é sobre **guardar ou ler
 * informação no aparelho**, seja cookie ou não; a exceção é o estritamente
 * necessário para o que a pessoa pediu.
 *
 * Por isso o inventário que aqui está é o de tudo o que o site escreve no
 * aparelho, e cada entrada tem a sua justificação:
 *
 * | o quê | onde | quanto tempo | porquê pode ficar |
 * |---|---|---|---|
 * | `preguica:newsletter` | sessão | até fechar o separador | não repetir um convite a que se respondeu |
 * | `preguica:newsletter:nao-mostrar` | local | 6 meses | a pessoa carregou no botão que o pede |
 * | `preguica:carta-secreta` | sessão | 24 h | abrir a carta que a pessoa pediu |
 * | `preguica:carta-secreta` | local | 90 dias | a pessoa carregou em "lembrar neste aparelho" |
 * | `preguica:painel:seccoes-fechadas` | sessão | até fechar o separador | o editor do painel |
 * | `preguica_desafio`, `preguica_sessao` | cookie, `/painel` | 10 min, 8 h | entrar no painel |
 * | `preguica_aparelho` | cookie, `/painel` | 30 dias | quem entra marcou "lembrar este aparelho" |
 *
 * Quem acrescentar uma linha ao código acrescenta-a aqui — e à página.
 *
 * O cookie da língua do `next-intl` já esteve ligado sem ninguém dar por isso —
 * está desligado em `i18n/routing.ts`, e o CI verifica que nenhuma página
 * devolve `Set-Cookie`.
 */
export default async function Cookies({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cookies");
  const meta = await getTranslations("metadata.cookies");

  const itens = Object.keys(t.raw("memoria.itens") as Record<string, string>);
  /* Cada nota começa pelo nome dela, até à primeira vírgula — em letra de
     código, para quem a for procurar nas ferramentas do browser. */
  const nota = (texto: string) => {
    const virgula = texto.indexOf(",");
    return virgula > 0 ? (
      <>
        <code>{texto.slice(0, virgula)}</code>
        {texto.slice(virgula)}
      </>
    ) : (
      texto
    );
  };

  let numero = 0;
  const simples = (chave: "uso" | "lingua") => (
    <Seccao key={chave} numero={++numero} titulo={t(`${chave}.titulo`)}>
      <p>{t(`${chave}.texto`)}</p>
    </Seccao>
  );

  return (
    <Pagina locale={locale} olho={t("olho")} titulo={t("titulo")} intro={meta("descricao")}>
      <Ficha
        itens={[
          { rotulo: t("ficha.proprios"), valor: t("ficha.soEquipa") },
          { rotulo: t("ficha.terceiros"), valor: t("ficha.zero") },
          { rotulo: t("ficha.banner"), valor: t("ficha.noSitio") },
        ]}
      />

      {simples("uso")}
      {simples("lingua")}

      <Seccao numero={++numero} titulo={t("memoria.titulo")}>
        <p>{t("memoria.intro")}</p>
        <ul>
          {itens.map((item) => (
            <li key={item}>{nota(t(`memoria.itens.${item}`))}</li>
          ))}
        </ul>
      </Seccao>

      {(["equipa", "base", "verificar"] as const).map((chave) => (
        <Seccao key={chave} numero={++numero} titulo={t(`${chave}.titulo`)}>
          <p>{t(`${chave}.texto`)}</p>
        </Seccao>
      ))}
    </Pagina>
  );
}
