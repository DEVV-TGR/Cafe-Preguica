"use client";

import { useEffect, useId, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/**
 * O convite para a newsletter — o cartão que aparece uns segundos depois de se
 * entrar no site.
 *
 * ## Quando aparece
 *
 * - **8 segundos depois de entrar**, e não logo: quem acabou de chegar ainda
 *   não sabe se gosta da casa, e um pedido de email antes disso é ruído.
 * - **Nunca na `/ementa`.** Os QR das mesas levam lá, e um cartão por cima da
 *   carta a meio de alguém escolher o que pedir estraga a noite em vez de ganhar
 *   um subscritor. Se os 8 segundos acabarem lá, espera pela página seguinte.
 * - **Nunca na página de confirmação**, que é o fim deste mesmo caminho.
 * - **Quem se inscreveu nunca mais o vê**, neste browser.
 * - **Quem o fechou não o volta a ver nesta visita**, e vê-o outra vez, uma vez,
 *   na visita seguinte.
 *
 * ## A memória, e porque é que a página de cookies a menciona
 *
 * "Já se inscreveu" fica no `localStorage`; "fechou nesta visita" fica no
 * `sessionStorage`, que o browser apaga ao fechar o separador — é isso que faz
 * a próxima visita ser uma visita nova. Nenhum dos dois é um cookie: não viajam
 * nos pedidos, não têm identificador, e não saem do aparelho. Mesmo assim a
 * página `/cookies` diz que existem, porque o que ela promete é que o site não
 * guarda nada às escondidas.
 *
 * Os dois vivem dentro de `try`: numa janela privada do Safari, ou com o
 * armazenamento bloqueado, o acesso atira. Nesse caso o convite comporta-se
 * como numa primeira visita, que é o pior que pode acontecer.
 *
 * ## Não é modal, de propósito
 *
 * Não escurece a página, não prende o foco e não obriga a responder. Quem está a
 * ler continua a ler; quem usa leitor de ecrã não é arrancado do sítio onde
 * estava. Fecha-se com o ×, com o Esc, ou ignorando-o.
 */

const MEMORIA = "preguica:newsletter";
const ESPERA_MS = 8000;

export type TextosDoConvite = {
  olho: string;
  titulo: string;
  texto: string;
  etiqueta: string;
  marcador: string;
  botao: string;
  aEnviar: string;
  fechar: string;
  consentimento: string;
  privacidade: string;
  enviadoTitulo: string;
  enviadoTexto: string;
  jaTitulo: string;
  jaTexto: string;
  erroEmail: string;
  erroLimite: string;
  erroServico: string;
};

type Estado =
  | { tipo: "formulario"; erro?: string }
  | { tipo: "a-enviar" }
  | { tipo: "enviado" }
  | { tipo: "ja-inscrito" }
  | { tipo: "fechado" };

function ler(armazem: () => Storage): string | null {
  try {
    return armazem().getItem(MEMORIA);
  } catch {
    return null;
  }
}

function guardar(armazem: () => Storage, valor: string): void {
  try {
    armazem().setItem(MEMORIA, valor);
  } catch {
    /* Sem memória, o convite volta na próxima página — pior, mas não partido. */
  }
}

function podeAparecerAqui(caminho: string): boolean {
  return !caminho.startsWith("/ementa") && !caminho.startsWith("/newsletter");
}

export function Convite({ locale, textos }: { locale: Locale; textos: TextosDoConvite }) {
  const caminho = usePathname();
  const [passouOTempo, setPassouOTempo] = useState(false);
  const [estado, setEstado] = useState<Estado>({ tipo: "formulario" });
  const idTitulo = useId();

  /* O relógio conta uma vez por visita: o layout não volta a montar ao mudar de
     página, portanto este efeito também não. */
  useEffect(() => {
    if (ler(() => localStorage) === "inscrito") return;
    if (ler(() => sessionStorage) === "fechado") return;

    const relogio = window.setTimeout(() => setPassouOTempo(true), ESPERA_MS);
    return () => window.clearTimeout(relogio);
  }, []);

  /* Calculado, e não guardado: se o relógio acabar na ementa, o cartão fica à
     espera e aparece na primeira página seguinte onde possa aparecer. */
  const visivel = passouOTempo && estado.tipo !== "fechado" && podeAparecerAqui(caminho);

  function fechar() {
    if (estado.tipo !== "enviado" && estado.tipo !== "ja-inscrito") {
      guardar(() => sessionStorage, "fechado");
    }
    setEstado({ tipo: "fechado" });
  }

  useEffect(() => {
    if (!visivel) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  });

  async function inscrever(dados: FormData) {
    setEstado({ tipo: "a-enviar" });

    let resposta: Response;
    try {
      resposta = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: dados.get("email"),
          sitio: dados.get("sitio"),
          lingua: locale,
        }),
      });
    } catch {
      setEstado({ tipo: "formulario", erro: textos.erroServico });
      return;
    }

    if (resposta.ok) {
      /* A partir daqui a pessoa já disse que quer. Se não confirmar no email, o
         convite também não volta — insistir com quem já respondeu é spam do
         nosso lado. */
      guardar(() => localStorage, "inscrito");
      const corpo = (await resposta.json().catch(() => ({}))) as { jaInscrito?: boolean };
      setEstado({ tipo: corpo.jaInscrito ? "ja-inscrito" : "enviado" });
      return;
    }

    const erro =
      resposta.status === 400
        ? textos.erroEmail
        : resposta.status === 429
          ? textos.erroLimite
          : textos.erroServico;
    setEstado({ tipo: "formulario", erro });
  }

  if (!visivel) return null;

  return (
    <section className="pg-convite" role="dialog" aria-labelledby={idTitulo}>
      {/* A preguiça pendurada na borda, como no topo da inicial. É decorativa,
          e por isso `alt` vazio. */}
      <img
        className="pg-convite__preguica"
        src="/marca/preguica.webp"
        alt=""
        width={325}
        height={286}
      />

      <button type="button" className="pg-convite__fechar" onClick={fechar} aria-label={textos.fechar}>
        <span aria-hidden="true">×</span>
      </button>

      {estado.tipo === "enviado" || estado.tipo === "ja-inscrito" ? (
        <div role="status">
          <p className="pg-convite__olho">{textos.olho}</p>
          <h2 id={idTitulo} className="pg-convite__titulo">
            {estado.tipo === "enviado" ? textos.enviadoTitulo : textos.jaTitulo}
          </h2>
          <p className="pg-convite__texto">
            {estado.tipo === "enviado" ? textos.enviadoTexto : textos.jaTexto}
          </p>
        </div>
      ) : (
        <>
          <p className="pg-convite__olho">{textos.olho}</p>
          <h2 id={idTitulo} className="pg-convite__titulo">
            {textos.titulo}
          </h2>
          <p className="pg-convite__texto">{textos.texto}</p>

          <form action={inscrever} className="pg-convite__form">
            <label className="pg-convite__campo">
              <span className="sr-only">{textos.etiqueta}</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder={textos.marcador}
                aria-invalid={estado.tipo === "formulario" && estado.erro ? true : undefined}
                className="pg-convite__entrada"
              />
            </label>

            {/* O isco para robôs — ver `app/api/newsletter/route.ts`. Fora do
                ecrã e fora do tabulador, e o leitor de ecrã também o salta. */}
            <input
              type="text"
              name="sitio"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="pg-convite__isco"
            />

            <button
              type="submit"
              className="pg-botao pg-botao--cheio pg-convite__botao"
              disabled={estado.tipo === "a-enviar"}
            >
              {estado.tipo === "a-enviar" ? textos.aEnviar : textos.botao}
            </button>
          </form>

          {estado.tipo === "formulario" && estado.erro ? (
            <p className="pg-convite__erro" role="alert">
              {estado.erro}
            </p>
          ) : null}

          {/* O que a pessoa aceita, escrito antes de carregar no botão — é isto
              que faz a inscrição ser um consentimento informado, sem precisar
              de uma caixa para marcar. Ver `docs/NEWSLETTER.md`. */}
          <p className="pg-convite__nota">
            {textos.consentimento} <Link href="/privacidade">{textos.privacidade}</Link>
          </p>
        </>
      )}
    </section>
  );
}
