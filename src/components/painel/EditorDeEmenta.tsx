"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Aviso } from "./Aviso";
import { Campo, CampoLongo } from "./Campo";
import { EstadoDaGravacao } from "./EstadoDaGravacao";
import { escreverPreco, identificadorLivre, lerPreco } from "./preco";
import { IndiceCapitulos } from "@/components/ementa/IndiceCapitulos";
import { publicarEmenta, type EstadoDaEmenta } from "@/app/painel/ementa/accoes";
import { compararCartas, totalDeAlteracoes } from "@/lib/painel/alteracoes";
import type { Artigo, Categoria, Ementa } from "@/data/ementa";

/**
 * A carta, para editar — **com a forma da carta que os clientes veem.**
 *
 * Os quatro capítulos seguidos, cada um com as suas secções, e o mesmo índice
 * colado ao topo que a `/ementa` tem (`IndiceCapitulos`, o mesmo componente).
 * Já foi uma categoria de cada vez, escolhida num `<select>`, e não se percebia
 * onde se estava nem o que havia à volta: quem conhece a carta de cor procura
 * "o gin" pelo sítio onde ele está, não pelo nome numa lista.
 *
 * Cada artigo é uma linha — o nome à esquerda, o preço à direita, como na
 * carta — e o que é menos frequente (textos, apagar) abre por baixo, em
 * "Editar". Mudar um preço, que é o que se faz nove vezes em dez, é tocar no
 * número e escrever.
 *
 * ## Rascunho no browser, um botão para publicar
 *
 * Nada se grava sozinho: cada publicação é um commit e uma reconstrução do
 * site. O contador de alterações está sempre à vista, e fechar o separador a
 * meio dá o aviso do browser.
 *
 * ## Porque é que este componente não importa `src/data/ementa.ts`
 *
 * Só os tipos. Importar o módulo trazia para o browser o JSON inteiro da carta
 * e o `zod`, para usar três listas — que a página lhe passa já feitas.
 */

type InfoDaCategoria = {
  id: Categoria;
  nome: string;
  /** As listas de nome e preço (cafés, águas…) não levam descrição. */
  semDescricao: boolean;
  /** As tostas têm dois preços: pão saloio e pão de forma. */
  colunas?: [string, string];
};

export type GrupoDeCategorias = {
  id: string;
  capitulo: string;
  categorias: InfoDaCategoria[];
};

type Lingua = "pt" | "en";

/* As âncoras levam prefixo: as da carta pública são `#comer`, `#gin`, e as do
   painel não podem ser confundidas com elas por quem copiar um link. */
const ancora = (id: string) => `p-${id}`;

export function EditorDeEmenta({
  inicial,
  sha,
  grupos,
  emDestaque,
}: {
  inicial: Ementa;
  sha: string;
  grupos: GrupoDeCategorias[];
  emDestaque: readonly string[];
}) {
  /* A versão publicada contra a qual se conta — muda depois de cada publicação,
     tal como o `sha`, para se poder publicar duas vezes seguidas sem recarregar. */
  const [base, setBase] = useState<Artigo[]>(inicial.artigos);
  const [shaAtual, setShaAtual] = useState(sha);
  const [artigos, setArtigos] = useState<Artigo[]>(inicial.artigos);

  const [aEditar, setAEditar] = useState<string | null>(null);
  const [aApagar, setAApagar] = useState<string | null>(null);
  const [aCriarEm, setACriarEm] = useState<Categoria | null>(null);

  /*
    Os preços em texto, enquanto estão a ser escritos.

    Sem isto não se consegue escrever `6,` — o número que se lê a meio é 6, e o
    campo saltava para "6,00" por baixo dos dedos. O texto é a verdade enquanto
    se escreve; o número só muda quando o texto já é um preço.
  */
  const [emEdicao, setEmEdicao] = useState<Record<string, string>>({});

  const [estado, accao, aGravar] = useActionState<EstadoDaEmenta, FormData>(
    async (anterior, dados) => {
      const resposta = await publicarEmenta(anterior, dados);
      if (resposta.tipo === "gravado") {
        setBase(resposta.ementa.artigos);
        setShaAtual(resposta.sha);
      }
      return resposta;
    },
    { tipo: "parado" },
  );

  const alteracoes = useMemo(
    () => totalDeAlteracoes(compararCartas(base, artigos)),
    [base, artigos],
  );

  useEffect(() => {
    if (alteracoes === 0) return;
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [alteracoes]);

  /* O avisos do topo (gravado, problemas) ficam lá em cima, e o botão de
     publicar está em baixo: sem isto, quem publica a meio da carta não via a
     resposta. */
  useEffect(() => {
    if (estado.tipo !== "parado") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [estado]);

  const idsPublicados = useMemo(() => new Set(base.map((a) => a.id)), [base]);
  const indice = useMemo(
    () => grupos.map((g) => ({ id: ancora(g.id), nome: g.capitulo })),
    [grupos],
  );

  function mudar(id: string, alteracao: (artigo: Artigo) => Artigo) {
    setArtigos((anteriores) => anteriores.map((a) => (a.id === id ? alteracao(a) : a)));
  }

  function mudarPreco(id: string, qual: "preco" | "precoSecundario", texto: string) {
    setEmEdicao((anterior) => ({ ...anterior, [`${id}:${qual}`]: texto }));
    const valor = lerPreco(texto);
    if (valor === undefined) return;
    mudar(id, (a) => ({ ...a, [qual]: valor }));
  }

  function esquecerTexto(id: string, qual: "preco" | "precoSecundario") {
    setEmEdicao((anterior) => {
      const resto = { ...anterior };
      delete resto[`${id}:${qual}`];
      return resto;
    });
  }

  function mudarTexto(id: string, campo: "nome" | "descricao", lingua: Lingua, valor: string) {
    mudar(id, (a) => ({
      ...a,
      [campo]: { ...(a[campo] ?? { pt: "", en: "" }), [lingua]: valor },
    }));
  }

  /*
    Subir e descer trocam o artigo com o vizinho **da mesma categoria**. No
    ficheiro os artigos estão todos numa lista só, e o vizinho de lista pode ser
    de outra categoria — trocar com esse não mudava nada no site.
  */
  function mover(id: string, sentido: -1 | 1) {
    setArtigos((anteriores) => {
      const lista = [...anteriores];
      const i = lista.findIndex((a) => a.id === id);
      let j = i + sentido;
      while (j >= 0 && j < lista.length && lista[j].categoria !== lista[i].categoria) j += sentido;
      if (j < 0 || j >= lista.length) return anteriores;
      [lista[i], lista[j]] = [lista[j], lista[i]];
      return lista;
    });
  }

  function apagar(id: string) {
    setArtigos((anteriores) => anteriores.filter((a) => a.id !== id));
    setAApagar(null);
    setAEditar(null);
  }

  /* Um artigo novo entra no fim da sua categoria — o que, no ficheiro, é logo a
     seguir ao último dessa categoria, e não no fim da lista inteira. */
  function juntar(novo: Artigo) {
    setArtigos((anteriores) => {
      const ultimo = anteriores.findLastIndex((a) => a.categoria === novo.categoria);
      const lista = [...anteriores];
      lista.splice(ultimo === -1 ? lista.length : ultimo + 1, 0, novo);
      return lista;
    });
    setACriarEm(null);
  }

  const semAlteracoes = alteracoes === 0;

  return (
    <form
      action={accao}
      className="pn-editor"
      /* O Enter num campo de preço submetia o formulário inteiro — publicava a
         carta a meio de escrever. Só o botão de publicar publica. */
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault();
      }}
    >
      <input type="hidden" name="sha" value={shaAtual} />
      <input type="hidden" name="ementa" value={JSON.stringify({ artigos })} />

      <IndiceCapitulos itens={indice} etiqueta="Capítulos da carta" />

      <div className="pn-carta">
        {estado.tipo === "erro" ? <Aviso tom="mau">{estado.mensagem}</Aviso> : null}
        {estado.tipo === "problemas" ? (
          <Aviso tom="mau">
            <strong>Isto não pode ser publicado assim:</strong>
            <ul className="pn-problemas">
              {estado.lista.map((problema) => (
                <li key={problema}>{problema}</li>
              ))}
            </ul>
          </Aviso>
        ) : null}
        {estado.tipo === "gravado" ? (
          <EstadoDaGravacao key={estado.commit} commit={estado.commit} endereco={estado.endereco} />
        ) : null}

        <p className="pn-nota">
          Toca num preço para o mudar. Um preço vazio aparece na carta como “preço por
          confirmar”. Um artigo escondido sai da ementa, mas fica guardado aqui com a tradução e
          o lugar na lista.
        </p>

        {grupos.map((grupo, i) => (
          <section
            key={grupo.id}
            id={ancora(grupo.id)}
            className="pn-capitulo"
            aria-labelledby={`${ancora(grupo.id)}-titulo`}
          >
            <header className="pn-capitulo__cabeca">
              <span className="pn-capitulo__numero" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 id={`${ancora(grupo.id)}-titulo`} className="pn-capitulo__titulo">
                {grupo.capitulo}
              </h2>
              {grupo.categorias.length > 1 ? (
                <ul className="pn-capitulo__seccoes">
                  {grupo.categorias.map((c) => (
                    <li key={c.id}>
                      <a href={`#${ancora(c.id)}`}>{c.nome}</a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </header>

            {grupo.categorias.map((categoria) => {
              const daCategoria = artigos.filter((a) => a.categoria === categoria.id);

              return (
                <section
                  key={categoria.id}
                  id={ancora(categoria.id)}
                  className="pn-seccao-carta"
                  aria-labelledby={`${ancora(categoria.id)}-titulo`}
                >
                  <div className="em-seccao__cabeca">
                    <h3 id={`${ancora(categoria.id)}-titulo`}>{categoria.nome}</h3>
                    {categoria.colunas ? (
                      <span className="pn-colunas" aria-hidden="true">
                        <span>{categoria.colunas[0]}</span>
                        <span>{categoria.colunas[1]}</span>
                      </span>
                    ) : null}
                  </div>

                  <ol className="pn-artigos">
                    {daCategoria.map((artigo, posicao) => {
                      const protegido = emDestaque.includes(artigo.id);
                      const novo = !idsPublicados.has(artigo.id);
                      const aberto = aEditar === artigo.id;

                      return (
                        <li
                          key={artigo.id}
                          className={`pn-artigo${artigo.escondido ? " pn-artigo--escondido" : ""}${aberto ? " pn-artigo--aberto" : ""}`}
                        >
                          <div className="pn-artigo__linha">
                            <div className="pn-artigo__nome">
                              <span className="pn-artigo__pt">
                                {artigo.nome.pt || "Sem nome"}
                                {novo ? <span className="pn-selo">Novo</span> : null}
                                {artigo.escondido ? (
                                  <span className="pn-selo pn-selo--apagado">Escondido</span>
                                ) : null}
                              </span>
                              <span className="pn-artigo__en" lang="en">
                                {artigo.nome.en}
                              </span>
                            </div>
                            <div className="pn-artigo__precos">
                              <CampoDePreco
                                etiqueta={`${categoria.colunas?.[0] ?? "Preço"} de ${artigo.nome.pt}`}
                                valor={artigo.preco}
                                texto={emEdicao[`${artigo.id}:preco`]}
                                aoMudar={(t) => mudarPreco(artigo.id, "preco", t)}
                                aoSair={() => esquecerTexto(artigo.id, "preco")}
                              />
                              {categoria.colunas ? (
                                <CampoDePreco
                                  etiqueta={`${categoria.colunas[1]} de ${artigo.nome.pt}`}
                                  valor={artigo.precoSecundario}
                                  texto={emEdicao[`${artigo.id}:precoSecundario`]}
                                  aoMudar={(t) => mudarPreco(artigo.id, "precoSecundario", t)}
                                  aoSair={() => esquecerTexto(artigo.id, "precoSecundario")}
                                />
                              ) : null}
                            </div>
                          </div>

                          <div className="pn-artigo__accoes">
                            <button
                              type="button"
                              className="pn-icone"
                              onClick={() => mover(artigo.id, -1)}
                              disabled={posicao === 0}
                              aria-label={`Subir ${artigo.nome.pt}`}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="pn-icone"
                              onClick={() => mover(artigo.id, 1)}
                              disabled={posicao === daCategoria.length - 1}
                              aria-label={`Descer ${artigo.nome.pt}`}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="pn-accao"
                              aria-expanded={aberto}
                              onClick={() => {
                                setAEditar(aberto ? null : artigo.id);
                                setAApagar(null);
                              }}
                            >
                              {aberto ? "Fechar" : "Editar"}
                            </button>
                            <button
                              type="button"
                              className="pn-accao"
                              onClick={() =>
                                mudar(artigo.id, (a) => ({ ...a, escondido: !a.escondido }))
                              }
                            >
                              {artigo.escondido ? "Mostrar" : "Esconder"}
                            </button>
                          </div>

                          {aberto ? (
                            <div className="pn-artigo__textos">
                              <Campo
                                etiqueta="Nome (português)"
                                value={artigo.nome.pt}
                                maxLength={80}
                                invalido={!artigo.nome.pt.trim()}
                                onChange={(e) => mudarTexto(artigo.id, "nome", "pt", e.target.value)}
                              />
                              <Campo
                                etiqueta="Nome (inglês)"
                                lang="en"
                                value={artigo.nome.en}
                                maxLength={80}
                                invalido={!artigo.nome.en.trim()}
                                onChange={(e) => mudarTexto(artigo.id, "nome", "en", e.target.value)}
                              />
                              {categoria.semDescricao ? null : (
                                <>
                                  <CampoLongo
                                    etiqueta="Descrição (português)"
                                    value={artigo.descricao?.pt ?? ""}
                                    maxLength={300}
                                    onChange={(e) =>
                                      mudarTexto(artigo.id, "descricao", "pt", e.target.value)
                                    }
                                  />
                                  <CampoLongo
                                    etiqueta="Descrição (inglês)"
                                    lang="en"
                                    value={artigo.descricao?.en ?? ""}
                                    maxLength={300}
                                    onChange={(e) =>
                                      mudarTexto(artigo.id, "descricao", "en", e.target.value)
                                    }
                                  />
                                </>
                              )}

                              {/* Apagar vive aqui dentro, e não ao lado de
                                  "Esconder": é o gesto raro e sem volta. A
                                  confirmação fica no próprio ecrã, e não num
                                  `confirm()` do browser — esse bloqueia a
                                  página e, no telemóvel, parece uma mensagem do
                                  sistema e não da casa. */}
                              {protegido ? (
                                <p className="pn-nota">
                                  Este artigo tem fotografia no site, e por isso não se pode
                                  apagar — pode ser escondido da carta.
                                </p>
                              ) : aApagar === artigo.id ? (
                                <div className="pn-confirmar" role="group" aria-label="Confirmar">
                                  <p>
                                    Apagar <strong>{artigo.nome.pt}</strong> de vez? Se é só por
                                    uns tempos, esconder é melhor — guarda o nome, a tradução e o
                                    lugar na lista.
                                  </p>
                                  <div className="pn-linha">
                                    <button
                                      type="button"
                                      className="pn-accao pn-accao--perigo"
                                      onClick={() => apagar(artigo.id)}
                                    >
                                      Sim, apagar
                                    </button>
                                    <button
                                      type="button"
                                      className="pn-accao"
                                      onClick={() => setAApagar(null)}
                                    >
                                      Não
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="pn-accao pn-accao--perigo pn-accao--sozinha"
                                  onClick={() => setAApagar(artigo.id)}
                                >
                                  Apagar este artigo
                                </button>
                              )}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>

                  {aCriarEm === categoria.id ? (
                    <ArtigoNovo
                      categoria={categoria}
                      ocupados={new Set(artigos.map((a) => a.id))}
                      aoCriar={juntar}
                      aoDesistir={() => setACriarEm(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      className="pn-juntar"
                      onClick={() => setACriarEm(categoria.id)}
                    >
                      + Artigo novo em {categoria.nome}
                    </button>
                  )}
                </section>
              );
            })}
          </section>
        ))}
      </div>

      {/* Colada em baixo, ao pé do polegar — o único elemento fixo do painel. */}
      <div className="pn-publicar">
        <div className="pn-publicar__dentro">
          <button
            type="submit"
            disabled={aGravar || semAlteracoes}
            className="pg-botao pg-botao--cheio pn-largo"
          >
            {aGravar
              ? "A publicar…"
              : semAlteracoes
                ? "Nada por publicar"
                : `Publicar ${alteracoes} ${alteracoes === 1 ? "alteração" : "alterações"}`}
          </button>
        </div>
      </div>
    </form>
  );
}

/* Sem etiqueta à vista: as colunas estão no cabeçalho da secção, como na carta.
   A etiqueta vai no `aria-label`, com o nome do artigo, para o leitor de ecrã. */
function CampoDePreco({
  etiqueta,
  valor,
  texto,
  aoMudar,
  aoSair,
}: {
  etiqueta: string;
  valor: number | null;
  texto: string | undefined;
  aoMudar: (texto: string) => void;
  aoSair: () => void;
}) {
  const invalido = texto !== undefined && lerPreco(texto) === undefined;

  return (
    <span className="pn-preco">
      <input
        value={texto ?? escreverPreco(valor)}
        onChange={(e) => aoMudar(e.target.value)}
        /* Ao sair, o texto em curso é deitado fora e o campo passa a mostrar o
           número — que é o que reescreve `6,2` como `6,20`. Se o texto não era
           um preço, o número nunca foi mexido e o campo volta ao que tinha. */
        onBlur={aoSair}
        inputMode="decimal"
        placeholder="—"
        aria-label={etiqueta}
        aria-invalid={invalido || undefined}
        className="pn-entrada pn-entrada--preco"
      />
      <span aria-hidden="true">€</span>
    </span>
  );
}

/**
 * O formulário de um artigo novo, no fim da secção onde se carregou.
 *
 * O inglês é opcional: se ficar vazio, vai o português — o nome de um cocktail
 * é quase sempre o mesmo nas duas línguas, e obrigar a escrevê-lo duas vezes é
 * o género de fricção que faz alguém desistir do painel e ligar ao Tomás. A
 * descrição, onde a categoria a pede, é obrigatória em português.
 */
function ArtigoNovo({
  categoria,
  ocupados,
  aoCriar,
  aoDesistir,
}: {
  categoria: InfoDaCategoria;
  ocupados: Set<string>;
  aoCriar: (artigo: Artigo) => void;
  aoDesistir: () => void;
}) {
  const [nomePt, setNomePt] = useState("");
  const [nomeEn, setNomeEn] = useState("");
  const [descricaoPt, setDescricaoPt] = useState("");
  const [descricaoEn, setDescricaoEn] = useState("");
  const [preco, setPreco] = useState("");
  const [precoSecundario, setPrecoSecundario] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function criar() {
    const valor = lerPreco(preco);
    const valorSecundario = categoria.colunas ? lerPreco(precoSecundario) : null;

    if (!nomePt.trim()) return setErro("Falta o nome.");
    if (!categoria.semDescricao && !descricaoPt.trim()) {
      return setErro("Nesta categoria os artigos levam descrição.");
    }
    if (valor === undefined || valorSecundario === undefined) {
      return setErro("O preço tem de ser um número, como 6,50.");
    }
    if (valorSecundario !== null && valor === null) {
      return setErro("Há segundo preço mas falta o primeiro.");
    }

    aoCriar({
      id: identificadorLivre(nomePt, ocupados),
      categoria: categoria.id,
      nome: { pt: nomePt.trim(), en: nomeEn.trim() || nomePt.trim() },
      descricao: categoria.semDescricao
        ? null
        : { pt: descricaoPt.trim(), en: descricaoEn.trim() || descricaoPt.trim() },
      preco: valor,
      precoSecundario: valorSecundario,
      alergenios: [],
      escondido: false,
    });
  }

  /* Não é um `<form>`: já se está dentro do formulário de publicar, e um
     formulário dentro de outro não é HTML válido. */
  return (
    <div className="pn-cartao pn-pilha pn-novo" role="group" aria-label="Artigo novo">
      <p className="pn-olho">Artigo novo · {categoria.nome}</p>
      {erro ? <Aviso tom="mau">{erro}</Aviso> : null}

      <Campo etiqueta="Nome" value={nomePt} maxLength={80} autoFocus onChange={(e) => setNomePt(e.target.value)} />
      <Campo
        etiqueta="Nome em inglês"
        nota="Se ficar vazio, vai o nome em português."
        lang="en"
        value={nomeEn}
        maxLength={80}
        onChange={(e) => setNomeEn(e.target.value)}
      />
      {categoria.semDescricao ? null : (
        <>
          <CampoLongo etiqueta="Descrição" value={descricaoPt} maxLength={300} onChange={(e) => setDescricaoPt(e.target.value)} />
          <CampoLongo
            etiqueta="Descrição em inglês"
            nota="Se ficar vazia, vai a descrição em português."
            lang="en"
            value={descricaoEn}
            maxLength={300}
            onChange={(e) => setDescricaoEn(e.target.value)}
          />
        </>
      )}
      <div className="pn-linha">
        <Campo
          etiqueta={categoria.colunas?.[0] ?? "Preço"}
          inputMode="decimal"
          placeholder="0,00"
          value={preco}
          invalido={lerPreco(preco) === undefined}
          onChange={(e) => setPreco(e.target.value)}
        />
        {categoria.colunas ? (
          <Campo
            etiqueta={categoria.colunas[1]}
            inputMode="decimal"
            placeholder="0,00"
            value={precoSecundario}
            invalido={lerPreco(precoSecundario) === undefined}
            onChange={(e) => setPrecoSecundario(e.target.value)}
          />
        ) : null}
      </div>

      <div className="pn-linha">
        <button type="button" className="pg-botao pg-botao--cheio" onClick={criar}>
          Juntar à carta
        </button>
        <button type="button" className="pn-ligacao" onClick={aoDesistir}>
          Desistir
        </button>
      </div>
      <p className="pn-nota">Só aparece no site depois de publicares.</p>
    </div>
  );
}
