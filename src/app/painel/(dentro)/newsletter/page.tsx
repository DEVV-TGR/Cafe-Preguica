import { exigirSessao } from "@/lib/painel/porta";
import { noSiteOficial } from "@/lib/ambiente";
import { URL_SITE } from "@/lib/site";
import Link from "next/link";
import { rodapeDaCasa } from "@/lib/newsletter/casa";
import { CAMINHO_DO_ESTUDIO, CAMINHO_DO_LOGO } from "@/lib/newsletter/corpo";
import { dataDoResend as data, ESTADOS_DO_ENVIO as ESTADOS } from "@/lib/newsletter/datas";
import {
  listarContactos,
  listarEnvios,
  oQueFalta,
  ErroDaNewsletter,
  type Contacto,
  type Envio,
} from "@/lib/newsletter/resend";
import { ultimasConfirmacoes, type Consentimento } from "@/lib/newsletter/consentimento";
import { ErroDoRedis } from "@/lib/painel/redis";
import { TituloDaPagina } from "@/components/painel/TituloDaPagina";
import { Aviso } from "@/components/painel/Aviso";
import { EditorDaNewsletter } from "@/components/painel/EditorDaNewsletter";
import { ListaDeContactos, type LinhaDeContacto } from "@/components/painel/ListaDeContactos";

/**
 * A newsletter: escrever, ver quem está inscrito, ver o que já saiu.
 *
 * Os contactos e os envios vêm do Resend de cada vez que a página abre — não há
 * cópia nossa em lado nenhum, ver `lib/newsletter/resend.ts`.
 */

export default async function PaginaDaNewsletter() {
  await exigirSessao();

  const falta = oQueFalta();
  let contactos: Contacto[] = [];
  let envios: Envio[] = [];
  let erro: string | null = null;

  if (!falta) {
    try {
      [contactos, envios] = await Promise.all([listarContactos(), listarEnvios()]);
    } catch (e) {
      if (!(e instanceof ErroDaNewsletter)) throw e;
      erro = e.paraOEcra;
    }
  }

  /*
    A data que interessa é a da última confirmação, e essa vem da prova do
    consentimento, não do Resend: o `created_at` do contacto é quando ele
    nasceu, e não muda quando alguém cancela e volta. As duas vão para o CSV,
    com nomes que dizem o que são. Quem se inscreveu antes da prova existir
    (2026-10-15) não tem confirmação registada, e a lista di-lo.
  */
  let confirmacoes: (Consentimento | null)[] = contactos.map(() => null);
  let semProva = false;
  try {
    confirmacoes = await ultimasConfirmacoes(contactos.map((c) => c.email));
  } catch (e) {
    if (!(e instanceof ErroDoRedis)) throw e;
    semProva = true;
  }

  const inscritos = contactos.filter((c) => !c.cancelou).length;
  const linhas: LinhaDeContacto[] = contactos.map((c, i) => {
    const prova = confirmacoes[i];
    return {
      email: c.email,
      criadoEm: data(c.criadoEm),
      confirmouEm: prova ? data(new Date(prova.quando).toISOString()) : null,
      origem: prova?.origem ?? null,
      versao: prova?.versao ?? null,
      cancelou: c.cancelou,
    };
  });

  return (
    <>
      <main className="pn-principal pn-pilha-larga">
        <TituloDaPagina olho="Os contactos" titulo="Newsletter" frase="Escrever um email para quem se inscreveu no site, ver quem está inscrito e o que já saiu." />
        {falta ? (
          <Aviso tom="nota">
            A newsletter ainda não está ligada ao serviço de email ({falta}) Dá para escrever e ver
            como fica, mas não para enviar.
          </Aviso>
        ) : null}
        {erro ? <Aviso tom="mau">{erro}</Aviso> : null}
        {semProva ? (
          <Aviso tom="nota">
            Não foi possível ler as datas de confirmação agora. A lista está completa; as datas
            voltam quando o armazenamento responder.
          </Aviso>
        ) : null}

        <div className="pn-duas-colunas pn-duas-colunas--editor">
          <section aria-labelledby="escrever" className="pn-bloco">
            <h2 id="escrever" className="pn-seccao__titulo">
              Escrever
            </h2>
            <EditorDaNewsletter
              inscritos={inscritos}
              podeEnviar={!falta && !erro}
              envioATodos={noSiteOficial()}
              /* O logótipo relativo: a CSP do painel só deixa carregar imagens do
                  próprio domínio, e a pré-visualização vive dentro dela. */
              moldura={{
                logo: CAMINHO_DO_LOGO,
                estudio: CAMINHO_DO_ESTUDIO,
                site: URL_SITE,
                remetente: rodapeDaCasa(),
                cancelar: URL_SITE,
              }}
            />
          </section>

          <div className="pn-pilha-larga">
            <section aria-labelledby="contactos" className="pn-bloco">
              <h2 id="contactos" className="pn-seccao__titulo">
                Contactos
              </h2>
              <ListaDeContactos linhas={linhas} />
            </section>

            <section aria-labelledby="enviadas" className="pn-bloco">
              <h2 id="enviadas" className="pn-seccao__titulo">
                Enviadas
              </h2>
              {envios.length === 0 ? (
                <p className="pn-texto-suave">Ainda não saiu nenhuma.</p>
              ) : (
                <ul className="pn-lista">
                  {envios.map((envio) => (
                    <li key={envio.id}>
                      <Link href={`/painel/newsletter/enviada/${envio.id}`} className="pn-lista__linha pn-lista__ligacao">
                        <span className="pn-lista__principal">{envio.assunto}</span>
                        <span className="pn-lista__lado">
                          {ESTADOS[envio.estado] ?? envio.estado} · {data(envio.enviadoEm ?? envio.criadoEm)}
                          <span aria-hidden="true"> →</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
