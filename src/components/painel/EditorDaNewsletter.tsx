"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Aviso } from "./Aviso";
import { Campo, CampoLongo } from "./Campo";
import {
  enviarNewsletter,
  enviarTesteDaNewsletter,
  type EstadoDaNewsletter,
} from "@/app/painel/newsletter/accoes";
import { emailEmHtml, type Moldura } from "@/lib/newsletter/corpo";

/**
 * Escrever a newsletter, ver como fica, mandar um teste, e só depois mandar a
 * toda a gente.
 *
 * ## O teste é obrigatório, e é o ecrã que o obriga
 *
 * "Enviar a todos" só acende depois de um teste ter saído **com este assunto e
 * este texto**. Mudar uma vírgula depois do teste volta a apagá-lo. É a única
 * forma de o Rafael ver a newsletter na caixa dele — com o telemóvel dele, no
 * programa de email dele — antes de ela chegar a toda a gente.
 *
 * E depois do teste há ainda uma confirmação que diz o número de pessoas. Um
 * email a uma lista não se desfaz.
 */

const INICIAL: EstadoDaNewsletter = { tipo: "parado" };

export function EditorDaNewsletter({
  inscritos,
  podeEnviar,
  moldura,
}: {
  inscritos: number;
  podeEnviar: boolean;
  moldura: Moldura;
}) {
  const [assunto, setAssunto] = useState("");
  const [texto, setTexto] = useState("");
  const [aVer, setAVer] = useState(false);
  const [aConfirmar, setAConfirmar] = useState(false);

  const [teste, accaoTeste, aTestar] = useActionState(enviarTesteDaNewsletter, INICIAL);
  const [envio, accaoEnvio, aEnviar] = useActionState(enviarNewsletter, INICIAL);

  const testado =
    teste.tipo === "teste-enviado" &&
    teste.assunto === assunto.trim() &&
    teste.texto === texto.trim();

  const enviada = envio.tipo === "enviado" && envio.assunto === assunto.trim();
  const escrito = assunto.trim() !== "" && texto.trim() !== "";

  /* O aviso do browser ao sair com uma newsletter escrita e por enviar — o mesmo
     cuidado do editor da carta. */
  useEffect(() => {
    if (!escrito || enviada) return;
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [escrito, enviada]);

  const html = useMemo(
    () => (aVer ? emailEmHtml(assunto.trim() || "(sem assunto)", texto, moldura) : ""),
    [aVer, assunto, texto, moldura],
  );

  const pessoas = `${inscritos} ${inscritos === 1 ? "pessoa" : "pessoas"}`;
  const ocupado = aTestar || aEnviar;

  return (
    <form className="pn-pilha" onSubmit={() => setAConfirmar(false)}>
      {teste.tipo === "erro" ? <Aviso tom="mau">{teste.mensagem}</Aviso> : null}
      {envio.tipo === "erro" ? <Aviso tom="mau">{envio.mensagem}</Aviso> : null}
      {envio.tipo === "enviado" ? (
        <Aviso tom="bom">
          <strong>Enviada.</strong> O serviço de email está a entregá-la agora; em poucos minutos
          chega a toda a gente. Aparece em baixo, em &ldquo;Enviadas&rdquo;, quando recarregar a
          página.
        </Aviso>
      ) : null}

      <Campo
        etiqueta="Assunto"
        name="assunto"
        value={assunto}
        onChange={(e) => setAssunto(e.target.value)}
        maxLength={150}
        placeholder="Sexta há música ao vivo"
        autoComplete="off"
        required
      />

      <CampoLongo
        etiqueta="Texto"
        name="texto"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={12}
        required
        placeholder={"Olá!\n\nEsta sexta…"}
        nota={
          <>
            Uma linha em branco começa um parágrafo novo. <strong>**Assim**</strong> fica a
            negrito. Um endereço que comece por https:// fica clicável. O rodapé com a morada e o
            link para cancelar a inscrição é posto sozinho.
          </>
        }
      />

      <button
        type="button"
        className="pn-ligacao pn-accao--sozinha"
        onClick={() => setAVer((v) => !v)}
        aria-expanded={aVer}
      >
        {aVer ? "Esconder a pré-visualização" : "Ver como fica"}
      </button>

      {aVer ? (
        /* `sandbox` vazio: o email é mostrado sem scripts, sem formulários e
           sem acesso a esta página. O HTML é o mesmo que sai no envio. */
        <iframe
          title="Pré-visualização da newsletter"
          className="pn-previsao"
          sandbox=""
          srcDoc={html}
        />
      ) : null}

      <div className="pn-cartao pn-pilha">
        <p className="pn-olho">Enviar</p>

        <button
          type="submit"
          formAction={accaoTeste}
          className="pg-botao pn-largo"
          disabled={!podeEnviar || !escrito || ocupado}
        >
          {aTestar ? "A enviar o teste…" : "1. Enviar um teste para mim"}
        </button>

        {testado ? (
          <p className="pn-nota">
            O teste foi para <strong className="pn-forte">{teste.para}</strong>. Abra-o no
            telemóvel e confira antes de continuar.
          </p>
        ) : (
          <p className="pn-nota">
            Antes de ir para a lista, vai primeiro para si, para ver como chega. Se mudar o texto
            depois do teste, é preciso outro teste.
          </p>
        )}

        {aConfirmar && testado && !enviada ? (
          <div className="pn-confirmar-envio" role="alert">
            <p>
              Vai para <strong className="pn-forte">{pessoas}</strong> e não se pode desfazer.
            </p>
            <div className="pn-linha">
              <button
                type="submit"
                formAction={accaoEnvio}
                className="pg-botao pg-botao--cheio"
                disabled={ocupado}
              >
                {aEnviar ? "A enviar…" : "Enviar agora"}
              </button>
              <button type="button" className="pn-ligacao" onClick={() => setAConfirmar(false)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="pg-botao pg-botao--cheio pn-largo"
            onClick={() => setAConfirmar(true)}
            disabled={!podeEnviar || !testado || enviada || inscritos === 0 || ocupado}
          >
            {enviada ? "Enviada" : `2. Enviar a ${pessoas}`}
          </button>
        )}

        {podeEnviar && inscritos === 0 ? (
          <p className="pn-nota">Ainda não há ninguém inscrito — não há a quem enviar.</p>
        ) : null}
      </div>
    </form>
  );
}
