import { notFound } from "next/navigation";

/**
 * Apanha qualquer caminho que não seja uma página, dentro de um idioma.
 *
 * Sem isto, `/en/nao-existe` (e `/nao-existe`, que o proxy reescreve para
 * `/pt/nao-existe`) não encontrava rota nenhuma e caía no 404 da raiz — o de
 * `app/not-found.tsx`, sem barra, sem idioma, texto branco num canto. Com
 * isto chama o `[locale]/not-found.tsx`, que já sabe a língua e tem a cara do
 * site. O da raiz fica só para o que nem chega a ter idioma.
 */
export default function Resto() {
  notFound();
}
