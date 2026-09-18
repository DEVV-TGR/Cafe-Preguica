import { Link } from "@/i18n/navigation";

/**
 * O rodapé das páginas do catálogo — a inicial e a ementa. É diferente do
 * `components/Rodape.tsx`, que serve as páginas de leitura e lá **tem** de
 * repetir a morada e o telefone: quem está na página de cookies não passou por
 * "onde estamos".
 *
 * Na ementa também não repete: quem lá está leu o QR em cima da mesa, e já sabe
 * onde a casa fica.
 */
export function RodapeCatalogo({
  privacidade,
  cookies,
  direitos,
  feitoPor,
  nome,
}: {
  privacidade: string;
  cookies: string;
  direitos: string;
  feitoPor: string;
  nome: string;
}) {
  return (
    <footer className="pg-rodape">
      <nav aria-label={privacidade}>
        <Link href="/privacidade">{privacidade}</Link>
        <Link href="/cookies">{cookies}</Link>
      </nav>
      <p>
        © {new Date().getFullYear()} {nome}. {direitos} {feitoPor}{" "}
        <a href="https://devplus.pt" target="_blank" rel="noopener noreferrer">
          DevPlus
        </a>
        .
      </p>
    </footer>
  );
}
