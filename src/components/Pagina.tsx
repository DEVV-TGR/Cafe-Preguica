import { useTranslations } from "next-intl";
import { BarraSite } from "@/components/BarraSite";
import { RodapeSite } from "@/components/RodapeSite";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import "../app/leitura.css";

/**
 * # O invólucro das páginas de leitura
 *
 * Privacidade, cookies, a casa, contactos e o 404. Até aqui eram texto branco
 * numa coluna, com um rodapé que era uma lista — pareciam de outro site. Agora
 * falam a língua da ementa: o olho dourado, o título grande na Fraunces, as
 * secções numeradas com um fio dourado, e o mesmo fecho com a preguiça.
 *
 * A página só entrega o texto. A forma — `Ficha`, `Seccao`, `Aviso` — está
 * aqui, para que a próxima página de leitura nasça igual às outras sem copiar
 * classes.
 *
 * ⚠️ **A inicial e a ementa não usam isto, e é de propósito.** Têm secções
 * que vão de margem a margem, e aqui ficavam presas a uma coluna. A barra e o
 * rodapé, esses, são os mesmos nas três (`BarraSite`, `RodapeSite`).
 */
export function Pagina({
  locale,
  olho,
  titulo,
  intro,
  children,
}: {
  locale: Locale;
  /** A linha pequena em dourado por cima do título. */
  olho: string;
  titulo: string;
  intro?: string;
  children?: React.ReactNode;
}) {
  const t = useTranslations("leitura");

  return (
    <>
      <BarraSite locale={locale} />
      <main id="conteudo" className="lt-pagina">
        <header className="lt-topo">
          <p className="lt-olho">{olho}</p>
          <h1 className="lt-titulo">{titulo}</h1>
          {intro && <p className="lt-intro">{intro}</p>}
        </header>

        {children}

        <section className="lt-fecho" aria-label={t("seguir")}>
          <img
            className="lt-fecho__preguica"
            src="/marca/preguica.webp"
            alt=""
            width={325}
            height={286}
            loading="lazy"
          />
          <p className="lt-fecho__botoes">
            <Link href="/" className="pg-botao">
              {t("inicio")}
            </Link>
            <Link href="/ementa" className="pg-botao">
              {t("ementa")}
            </Link>
          </p>
        </section>
      </main>
      <RodapeSite comContactos />
    </>
  );
}

/**
 * Os factos da página em três linhas, no formato "dado" do catálogo: rótulo
 * pequeno, valor em dourado. Quem só lê isto já sabe o essencial.
 */
export function Ficha({ itens }: { itens: { rotulo: string; valor: string }[] }) {
  return (
    <dl className="lt-ficha">
      {itens.map(({ rotulo, valor }) => (
        <div key={rotulo}>
          <dt>{rotulo}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Uma secção. Com `numero`, leva o "01" à esquerda, como os capítulos da
 * ementa — para texto que se lê por ordem. Sem ele (contactos), é só o título.
 */
export function Seccao({
  numero,
  titulo,
  children,
}: {
  numero?: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="lt-seccao" data-numerada={numero !== undefined || undefined}>
      {numero !== undefined && (
        <span className="lt-seccao__numero" aria-hidden="true">
          {String(numero).padStart(2, "0")}
        </span>
      )}
      <h2 className="lt-seccao__titulo">{titulo}</h2>
      <div className="lt-seccao__texto">{children}</div>
    </section>
  );
}

/**
 * A nota que a página precisa que se veja — o rascunho, o texto por escrever.
 * `role="status"` e não `alert`: informa, não interrompe o leitor de ecrã.
 */
export function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="lt-aviso">
      {children}
    </p>
  );
}
