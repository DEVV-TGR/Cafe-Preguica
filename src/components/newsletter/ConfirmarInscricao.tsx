"use client";

import { useState, useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";
import { guardarChave } from "@/lib/carta-secreta/no-browser";

/**
 * O botão da página a que o email de confirmação leva.
 *
 * O convite vem no fragmento (`#…`) — ver `app/api/newsletter/route.ts`. O
 * fragmento só existe no browser, e por isso é lido aqui e não na página.
 *
 * ## Duas versões do mesmo ecrã
 *
 * O convite diz de onde veio o pedido (ver `lib/newsletter/convite.ts`): do
 * convite da newsletter, ou da carta secreta — e aí o botão diz que também abre
 * a carta. Lê-se o que vem dentro sem verificar a assinatura — é só para
 * escolher a frase; quem decide é a rota.
 *
 * ## "Lembrar neste aparelho"
 *
 * Desmarcada. Sem ela, a chave da carta fica no `sessionStorage` e morre com o
 * separador; com ela, fica 90 dias no `localStorage`. Ver
 * `lib/carta-secreta/no-browser.ts`.
 */

export type TextosDaConfirmacao = {
  texto: string;
  botao: string;
  textoCarta: string;
  botaoCarta: string;
  lembrar: string;
  aConfirmar: string;
  feitoTitulo: string;
  feitoTexto: string;
  semConvite: string;
  invalido: string;
  expirado: string;
  erro: string;
  /** `null` quando a carta secreta está vazia: aí não há o que abrir. */
  abrirCarta: string | null;
};

type Estado = "pronto" | "a-confirmar" | "feito" | "invalido" | "expirado" | "erro";

/* O fragmento lido como uma "loja" externa: no servidor (e na hidratação) é
   `null` — ainda não se sabe —, no browser é o que está no endereço. Com `""` no
   servidor, o HTML estático dizia "este link não traz convite" a toda a gente,
   durante o instante antes de o browser ler o endereço. */
const lerFragmento = () => {
  const bruto = window.location.hash.slice(1);
  /* Um link mexido à mão (`#%E0%A4`) faz o `decodeURIComponent` atirar, e atirar
     aqui, dentro do render, deitava a página abaixo. O bruto segue tal e qual e
     a rota responde "convite inválido", que é o que ele é. */
  try {
    return decodeURIComponent(bruto);
  } catch {
    return bruto;
  }
};
const semFragmento = () => null;

/* Se o pedido veio da carta secreta — ver o cabeçalho deste ficheiro. Um
   convite que não se lê fica com a frase da newsletter, e a rota diz o resto. */
function veioDaCarta(convite: string): boolean {
  try {
    const corpo = convite.split(".")[1] ?? "";
    const lido = JSON.parse(atob(corpo.replace(/-/g, "+").replace(/_/g, "/"))) as { o?: unknown };
    return lido.o === "carta";
  } catch {
    return false;
  }
}
const naoMuda = () => () => {};

export function ConfirmarInscricao({ textos }: { textos: TextosDaConfirmacao }) {
  const convite = useSyncExternalStore(naoMuda, lerFragmento, semFragmento);
  const [estado, setEstado] = useState<Estado>("pronto");
  const [lembrar, setLembrar] = useState(false);
  const daCarta = convite ? veioDaCarta(convite) : false;

  async function confirmar() {
    setEstado("a-confirmar");
    try {
      const resposta = await fetch("/api/newsletter/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convite, lembrar }),
      });

      if (resposta.ok) {
        const { chaveDaCarta } = (await resposta.json().catch(() => ({}))) as {
          chaveDaCarta?: string;
        };
        /* A chave da carta secreta, que a `/ementa` usa para a abrir sozinha,
           e o mesmo sinal que o pop-up deixa — nesta visita não volta a ser
           convidado. Os dois no `sessionStorage`, a não ser que tenha pedido
           para lembrar a carta. */
        if (chaveDaCarta) guardarChave(chaveDaCarta);
        try {
          sessionStorage.setItem("preguica:newsletter", "inscrito");
        } catch {}
        /* Tira o convite do endereço: não há razão para ficar no histórico. */
        history.replaceState(null, "", window.location.pathname);
        setEstado("feito");
        return;
      }

      setEstado(
        resposta.status === 410 ? "expirado" : resposta.status === 400 ? "invalido" : "erro",
      );
    } catch {
      setEstado("erro");
    }
  }

  if (estado === "feito") {
    return (
      <section className="lt-seccao" role="status">
        <h2 className="lt-seccao__titulo">{textos.feitoTitulo}</h2>
        <div className="lt-seccao__texto">
          <p>{textos.feitoTexto}</p>
        </div>
        {/* O prémio de ter confirmado — é o caminho que a carta secreta da
            ementa promete. */}
        {textos.abrirCarta ? (
          <p className="lt-accao">
            <Link href="/ementa#carta-secreta" className="pg-botao pg-botao--cheio">
              {textos.abrirCarta}
            </Link>
          </p>
        ) : null}
      </section>
    );
  }

  if (convite === null) return null;

  if (!convite) {
    return (
      <section className="lt-seccao">
        <div className="lt-seccao__texto">
          <p>{textos.semConvite}</p>
        </div>
      </section>
    );
  }

  const erro =
    estado === "invalido"
      ? textos.invalido
      : estado === "expirado"
        ? textos.expirado
        : estado === "erro"
          ? textos.erro
          : null;

  const [texto, botao] = daCarta
    ? [textos.textoCarta, textos.botaoCarta]
    : [textos.texto, textos.botao];

  return (
    <section className="lt-seccao">
      <div className="lt-seccao__texto">
        <p>{texto}</p>
      </div>
      {textos.abrirCarta ? (
        <label className="lt-escolha">
          <input
            type="checkbox"
            checked={lembrar}
            onChange={(e) => setLembrar(e.target.checked)}
            disabled={estado === "a-confirmar"}
          />
          <span>{textos.lembrar}</span>
        </label>
      ) : null}
      <p className="lt-accao">
        <button
          type="button"
          className="pg-botao pg-botao--cheio"
          onClick={confirmar}
          disabled={estado === "a-confirmar" || estado === "invalido" || estado === "expirado"}
        >
          {estado === "a-confirmar" ? textos.aConfirmar : botao}
        </button>
      </p>
      {erro ? (
        <p className="lt-accao__erro" role="alert">
          {erro}
        </p>
      ) : null}
    </section>
  );
}
