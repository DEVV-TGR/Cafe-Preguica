/*
  As datas do Resend, escritas à portuguesa.

  O Resend devolve `2026-10-06 23:47:56.678+00`, que não é ISO: o Safari recusa-o
  no `new Date()`. Normaliza-se aqui, no servidor, e a data já vai escrita para o
  browser — assim também não há diferença de fuso entre o servidor e o telemóvel
  a partir a hidratação.
*/
export function dataDoResend(texto: string | null, comHora = false): string {
  if (!texto) return "—";
  const iso = texto.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(comHora ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/Lisbon",
  }).format(d);
}

export const ESTADOS_DO_ENVIO: Record<string, string> = {
  sent: "Enviada",
  sending: "A enviar",
  queued: "A enviar",
  scheduled: "Agendada",
  draft: "Rascunho",
};
