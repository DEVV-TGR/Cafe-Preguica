/**
 * Os ícones do painel, desenhados à mão em traço de 1,8 — em SVG e em linha,
 * para não trazer uma biblioteca inteira por uma dúzia de desenhos.
 *
 * São sempre decoração (`aria-hidden`): quem os usa põe o nome ao lado, ou um
 * `aria-label` no botão ou na ligação à volta.
 */

const DESENHOS = {
  painel: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
    </>
  ),
  ementa: (
    <>
      <path d="M5 4.5h10.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" />
      <path d="M8.5 9h6.5M8.5 12.5h6.5M8.5 16h4" />
    </>
  ),
  casa: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  newsletter: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </>
  ),
  mesas: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 20h1M20 14v1" />
    </>
  ),
  sessoes: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.3c1.6.7 2.6 2.4 3 4.7" />
    </>
  ),
  seta: <path d="M7.5 16.5 16.5 7.5M9 7.5h7.5V15" />,
  site: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.2 2.3 3.2 5 3.2 8s-1 5.7-3.2 8c-2.2-2.3-3.2-5-3.2-8s1-5.7 3.2-8z" />
    </>
  ),
  calendario: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  mais: <path d="M12 5.5v13M5.5 12h13" />,
  subir: <path d="M12 18.5v-13M6.5 11 12 5.5l5.5 5.5" />,
  descer: <path d="M12 5.5v13M6.5 13l5.5 5.5 5.5-5.5" />,
  nfc: (
    <>
      <path d="M8 8.5a5 5 0 0 1 0 7" />
      <path d="M11.5 6a8.5 8.5 0 0 1 0 12" />
      <path d="M15 3.8a11.5 11.5 0 0 1 0 16.4" />
    </>
  ),
  aparelho: (
    <>
      <rect x="7" y="3.5" width="10" height="17" rx="2" />
      <path d="M11 17.5h2" />
    </>
  ),
} as const;

export type NomeDoIcone = keyof typeof DESENHOS;

export function Icone({ nome, tamanho = 20 }: { nome: NomeDoIcone; tamanho?: number }) {
  return (
    <svg
      className="pn-icone-svg"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {DESENHOS[nome]}
    </svg>
  );
}
