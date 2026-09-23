import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * Um campo com a etiqueta por cima e, se for preciso, uma nota por baixo.
 *
 * A etiqueta envolve o `<input>` em vez de usar `htmlFor`: não há `id` para
 * inventar nem para colidir quando o mesmo campo aparece em cada artigo.
 */
export function Campo({
  etiqueta,
  nota,
  invalido,
  ...resto
}: InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: ReactNode;
  nota?: ReactNode;
  invalido?: boolean;
}) {
  return (
    <label className="pn-campo">
      <span className="pn-campo__etiqueta">{etiqueta}</span>
      <input {...resto} aria-invalid={invalido || undefined} className="pn-entrada" />
      {nota ? <span className="pn-campo__nota">{nota}</span> : null}
    </label>
  );
}

/** O mesmo, para texto de várias linhas (as descrições). */
export function CampoLongo({
  etiqueta,
  nota,
  ...resto
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  etiqueta: ReactNode;
  nota?: ReactNode;
}) {
  return (
    <label className="pn-campo">
      <span className="pn-campo__etiqueta">{etiqueta}</span>
      <textarea rows={3} {...resto} className="pn-entrada pn-entrada--longa" />
      {nota ? <span className="pn-campo__nota">{nota}</span> : null}
    </label>
  );
}
