import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { metadataDaPagina } from "@/lib/metadata";
import { Pagina } from "@/components/Pagina";
import {
  ConfirmarInscricao,
  type TextosDaConfirmacao,
} from "@/components/newsletter/ConfirmarInscricao";

type Props = { params: Promise<{ locale: Locale }> };

/* Fora dos motores de busca e fora do sitemap: é o fim de um link de email, e
   sem o convite no endereço não faz nada. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    ...(await metadataDaPagina(locale, "newsletter", "/newsletter/confirmar")),
    robots: { index: false, follow: false },
  };
}

/**
 * Onde o link do email de confirmação vai dar.
 *
 * **Estática**, como as outras: o convite vem no fragmento do endereço
 * (`#n1.…`), que nunca chega ao servidor, e é o componente de cliente que o lê e
 * o manda para `/api/newsletter/confirmar` quando se carrega no botão. A razão de
 * haver botão, em vez de confirmar ao abrir, está escrita nessa rota.
 */
export default async function ConfirmarNewsletter({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("newsletter.confirmar");

  const textos: TextosDaConfirmacao = {
    texto: t("texto"),
    botao: t("botao"),
    aConfirmar: t("aConfirmar"),
    feitoTitulo: t("feitoTitulo"),
    feitoTexto: t("feitoTexto"),
    semConvite: t("semConvite"),
    invalido: t("invalido"),
    expirado: t("expirado"),
    erro: t("erro"),
  };

  return (
    <Pagina locale={locale} olho={t("olho")} titulo={t("titulo")}>
      <ConfirmarInscricao textos={textos} />
    </Pagina>
  );
}
