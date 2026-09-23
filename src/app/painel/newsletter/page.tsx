import { exigirSessao } from "@/lib/painel/porta";
import { URL_SITE } from "@/lib/site";
import Link from "next/link";
import { rodapeDaCasa } from "@/lib/newsletter/casa";
import { CAMINHO_DO_LOGO } from "@/lib/newsletter/corpo";
import { dataDoResend as data, ESTADOS_DO_ENVIO as ESTADOS } from "@/lib/newsletter/datas";
import {
  listarContactos,
  listarEnvios,
  oQueFalta,
  ErroDaNewsletter,
  type Contacto,
  type Envio,
} from "@/lib/newsletter/resend";
import { Cabecalho } from "@/components/painel/Cabecalho";
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
  const { email } = await exigirSessao();

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

  const inscritos = contactos.filter((c) => !c.cancelou).length;
  const linhas: LinhaDeContacto[] = contactos.map((c) => ({
    email: c.email,
    desde: data(c.criadoEm),
    cancelou: c.cancelou,
  }));

  return (
    <>
      <Cabecalho titulo="Newsletter" voltarPara="/painel" quem={email} />

      <main className="pn-principal pn-pilha-larga">
        {falta ? (
          <Aviso tom="nota">
            A newsletter ainda não está ligada ao serviço de email ({falta}) Dá para escrever e ver
            como fica, mas não para enviar.
          </Aviso>
        ) : null}
        {erro ? <Aviso tom="mau">{erro}</Aviso> : null}

        <section aria-labelledby="escrever">
          <h2 id="escrever" className="pn-seccao__titulo">
            Escrever
          </h2>
          <EditorDaNewsletter
            inscritos={inscritos}
            podeEnviar={!falta && !erro}
            /* O logótipo relativo: a CSP do painel só deixa carregar imagens do
                próprio domínio, e a pré-visualização vive dentro dela. */
            moldura={{ logo: CAMINHO_DO_LOGO, remetente: rodapeDaCasa(), cancelar: URL_SITE }}
          />
        </section>

        <section aria-labelledby="contactos" className="pn-separado">
          <h2 id="contactos" className="pn-seccao__titulo">
            Contactos
          </h2>
          <ListaDeContactos linhas={linhas} />
        </section>

        <section aria-labelledby="enviadas" className="pn-separado">
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
      </main>
    </>
  );
}
