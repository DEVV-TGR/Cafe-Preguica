import { exigirSessao } from "@/lib/painel/porta";
import { URL_SITE } from "@/lib/site";
import { MARCA_DO_CANCELAMENTO } from "@/lib/newsletter/corpo";
import { dataDoResend, ESTADOS_DO_ENVIO } from "@/lib/newsletter/datas";
import { obterEnvio, oQueFalta, ErroDaNewsletter } from "@/lib/newsletter/resend";
import { Cabecalho } from "@/components/painel/Cabecalho";
import { Aviso } from "@/components/painel/Aviso";

/**
 * Uma newsletter que já saiu, tal como saiu — para ler, não para editar.
 *
 * O HTML vem do Resend, que é quem guarda o que foi enviado. Mostra-se numa
 * `<iframe sandbox>` vazia de permissões, como a pré-visualização do editor:
 * sem scripts, sem formulários, sem acesso a esta página.
 */

/*
  Duas trocas antes de mostrar, e nenhuma muda o que foi enviado:

  - a marca do cancelamento, que o Resend trocou por um link diferente em cada
    email, passa a apontar ao site — aqui não há pessoa a quem cancelar;
  - o logótipo, que no email vai com o endereço absoluto do site, passa a
    relativo: a CSP do painel só deixa carregar imagens do próprio domínio, e
    numa pré-visualização da Vercel o domínio não é o do `URL_SITE`.
*/
function paraMostrar(html: string): string {
  return html
    .replaceAll(MARCA_DO_CANCELAMENTO, URL_SITE)
    .replaceAll(`${URL_SITE}/marca/`, "/marca/");
}

export default async function EnvioAntigo({ params }: { params: Promise<{ id: string }> }) {
  const { email } = await exigirSessao();
  const { id } = await params;

  const titulo = "Newsletter enviada";
  const falta = oQueFalta();

  let envio;
  try {
    envio = falta ? null : await obterEnvio(id);
  } catch (erro) {
    if (!(erro instanceof ErroDaNewsletter)) throw erro;
    return (
      <>
        <Cabecalho titulo={titulo} voltarPara="/painel/newsletter" quem={email} />
        <main className="pn-principal">
          <Aviso tom="mau">{erro.paraOEcra}</Aviso>
        </main>
      </>
    );
  }

  /* Um aviso dentro do painel, e não o `notFound()`: esse ia dar ao 404 do
     site, que tem outro layout de raiz e nenhum caminho de volta para aqui. */
  if (!envio) {
    return (
      <>
        <Cabecalho titulo={titulo} voltarPara="/painel/newsletter" quem={email} />
        <main className="pn-principal">
          <Aviso tom="nota">
            {falta
              ? `A newsletter ainda não está ligada ao serviço de email (${falta})`
              : "Esta newsletter não existe, ou não é desta lista."}
          </Aviso>
        </main>
      </>
    );
  }

  return (
    <>
      <Cabecalho titulo={titulo} voltarPara="/painel/newsletter" quem={email} />
      <main className="pn-principal pn-pilha">
        <div>
          <p className="pn-olho">
            {ESTADOS_DO_ENVIO[envio.estado] ?? envio.estado} ·{" "}
            {dataDoResend(envio.enviadoEm ?? envio.criadoEm, true)}
          </p>
          <h2 className="pn-seccao__titulo">{envio.assunto}</h2>
          <p className="pn-nota">De {envio.de}</p>
        </div>

        {envio.html ? (
          <iframe
            title={`A newsletter "${envio.assunto}"`}
            className="pn-previsao pn-previsao--alta"
            sandbox=""
            srcDoc={paraMostrar(envio.html)}
          />
        ) : (
          <pre className="pn-cartao pn-texto-corrido">{envio.texto ?? "(sem conteúdo)"}</pre>
        )}
      </main>
    </>
  );
}
