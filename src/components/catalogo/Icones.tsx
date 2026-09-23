/**
 * Os ícones da página inicial, desenhados aqui em SVG.
 *
 * ⚠️ **Não vêm de uma biblioteca nem de um CDN**, e é de propósito: o glifo do
 * Instagram servido pela Meta é um pedido a um terceiro em cada visita, e a CSP
 * e a página `/cookies` dizem que não há nenhum. Meia dúzia de ícones não
 * justifica uma dependência.
 *
 * Todos são decorativos (`aria-hidden`): o texto ao lado é que diz o que o link
 * faz.
 */

type Props = { className?: string };

export function IconeInstagram({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** O "f" dentro de um círculo. */
export function IconeFacebook({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.2 7.8h-1.5c-1.2 0-2 .8-2 2V21M9.2 13.2h5.2" />
    </svg>
  );
}

/** A nota musical com a cauda dobrada. */
export function IconeTiktok({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13.2 3v12a4 4 0 1 1-4-4" />
      <path d="M13.2 3c.5 2.9 2.5 4.8 5.6 5.1" />
    </svg>
  );
}

/** O círculo com as três ondas, cada uma mais curta do que a de cima. */
export function IconeSpotify({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M7.4 9.6c3-1 6.6-.7 9.3.8M8 12.7c2.5-.7 5.3-.5 7.5.7M8.6 15.6c2-.5 4-.3 5.7.5" />
    </svg>
  );
}

/** Uma pata: a almofada grande e os quatro dedos. */
export function IconePata({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <ellipse cx="12" cy="16" rx="4.6" ry="3.8" />
      <ellipse cx="5.6" cy="10.4" rx="1.9" ry="2.4" />
      <ellipse cx="9.4" cy="6.4" rx="1.9" ry="2.5" />
      <ellipse cx="14.6" cy="6.4" rx="1.9" ry="2.5" />
      <ellipse cx="18.4" cy="10.4" rx="1.9" ry="2.4" />
    </svg>
  );
}

/** O símbolo dos reels: uma claquete com o triângulo de reprodução. */
export function IconeReel({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M3 8.5h18M8.5 3l3 5.5M14.5 3l3 5.5" />
      <path d="M10.2 11.8v5.4l4.6-2.7z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconePlay({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
    </svg>
  );
}

/** Uma estrela, cheia ou vazia. As avaliações usam cinco lado a lado. */
export function IconeEstrela({ className, cheia = true }: Props & { cheia?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"
        fill={cheia ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}
