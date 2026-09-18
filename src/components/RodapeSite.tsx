import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { marca } from "@/data/marca";
import { cafe, moradaCompleta, telefoneParaLigar } from "@/data/cafe";
import { URL_ESTUDIO, URL_LIVRO_RECLAMACOES } from "@/lib/site";

/**
 * # O rodapé do site — um só
 *
 * Havia dois: o do catálogo, mínimo, e o das páginas de leitura, uma lista de
 * texto sem nada da casa. Ficou este, com a forma do primeiro.
 *
 * A única diferença entre páginas é `comContactos`. A inicial e a ementa não o
 * pedem: a inicial acabou de dar a morada, o telefone e o horário em "onde
 * estamos", e quem está na ementa leu o QR em cima da mesa. Quem está na
 * página de cookies não passou por nenhuma das duas — e aí a linha aparece.
 *
 * Lê os factos de `src/data/`, não os repete: sem morada confirmada, a morada
 * simplesmente não aparece.
 */
export function RodapeSite({ comContactos = false }: { comContactos?: boolean }) {
  const t = useTranslations("rodape");
  const morada = moradaCompleta();
  const telefone = telefoneParaLigar();

  return (
    <footer className="pg-rodape">
      {comContactos && (
        <ul className="pg-rodape__contactos">
          {morada && <li>{morada}</li>}
          {telefone && cafe.telefone && (
            <li>
              <a href={`tel:${telefone}`}>{cafe.telefone}</a>
            </li>
          )}
          {cafe.email && (
            <li>
              <a href={`mailto:${cafe.email}`}>{cafe.email}</a>
            </li>
          )}
          {marca.instagram && (
            <li>
              {/* `noopener` não é cerimónia: sem ele a página aberta ganha
                  acesso a `window.opener` e pode reescrever o endereço desta. */}
              <a href={marca.instagram} target="_blank" rel="noopener noreferrer">
                Instagram <span aria-hidden="true">↗</span>
              </a>
            </li>
          )}
        </ul>
      )}
      <nav aria-label={t("legal")}>
        <Link href="/privacidade">{t("privacidade")}</Link>
        <Link href="/cookies">{t("cookies")}</Link>
        {/* Obrigatório (Lei 144/2015, art. 18.º). A frase inteira no rodapé
            pesava demais; fica numa página própria, a um clique de todas. */}
        <Link href="/informacao-legal">{t("resolucaoLitigios")}</Link>
        {/* Em último, e é o único que sai do site. Um link normal e não o
            logótipo oficial carregado de fora: uma imagem de outro domínio
            furava a CSP e o passo do CI que recusa recursos de terceiros. */}
        <a href={URL_LIVRO_RECLAMACOES} target="_blank" rel="noopener noreferrer">
          {t("livroReclamacoes")} <span aria-hidden="true">↗</span>
        </a>
      </nav>
      <p>
        © {new Date().getFullYear()} {marca.nome}. {t("direitos")} {t("feitoPor")}{" "}
        <a href={URL_ESTUDIO} target="_blank" rel="noopener noreferrer">
          DevPlus
        </a>
        .
      </p>
    </footer>
  );
}
