import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { marca, redes } from "@/data/marca";
import { moradaCompleta, telefoneParaLigar, cafe } from "@/data/cafe";
import { URL_ESTUDIO } from "@/lib/site";

/**
 * O rodapé lê os factos de `src/data/` — não os repete.
 *
 * É o sítio onde a regra do `null` se vê melhor: sem morada confirmada, a linha
 * da morada simplesmente não existe, em vez de aparecer uma vírgula sozinha ou
 * um "—" que ninguém sabe interpretar.
 */
export function Rodape() {
  const t = useTranslations("rodape");
  const morada = moradaCompleta();
  const telefone = telefoneParaLigar();

  return (
    <footer className="mt-16 border-t border-linha">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8 text-sm text-suave">
        <p className="font-medium text-tinta">{marca.nome}</p>

        {morada && <p>{morada}</p>}
        {telefone && cafe.telefone && (
          <p>
            <a href={`tel:${telefone}`} className="hover:underline">
              {cafe.telefone}
            </a>
          </p>
        )}
        {cafe.email && (
          <p>
            <a href={`mailto:${cafe.email}`} className="hover:underline">
              {cafe.email}
            </a>
          </p>
        )}

        {redes.length > 0 && (
          <ul className="flex gap-4">
            {redes.map((url) => (
              <li key={url}>
                {/* `noopener` não é cerimónia: sem ele a página aberta ganha
                    acesso a `window.opener` e pode reescrever o endereço desta.
                    `noreferrer` evita mandar o caminho completo para lá. */}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {new URL(url).hostname.replace(/^www\./, "")}
                </a>
              </li>
            ))}
          </ul>
        )}

        <nav aria-label={t("privacidade")} className="flex gap-4">
          <Link href="/privacidade" className="hover:underline">
            {t("privacidade")}
          </Link>
          <Link href="/cookies" className="hover:underline">
            {t("cookies")}
          </Link>
        </nav>

        <p>
          © {new Date().getFullYear()} {marca.nome}. {t("direitos")}{" "}
          {t("feitoPor")}{" "}
          <a
            href={URL_ESTUDIO}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            DevPlus
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
