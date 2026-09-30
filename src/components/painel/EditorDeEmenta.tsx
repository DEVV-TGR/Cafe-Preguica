"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Aviso } from "./Aviso";
import { Campo, CampoLongo } from "./Campo";
import { EstadoDaGravacao } from "./EstadoDaGravacao";
import { escreverPreco, identificadorLivre, lerPreco } from "./preco";
import { IndiceCapitulos } from "@/components/ementa/IndiceCapitulos";
import { publicarEmenta, type EstadoDaEmenta } from "@/app/painel/ementa/accoes";
import { compararCartas, totalDeAlteracoes, type Carta } from "@/lib/painel/alteracoes";
import type { Artigo, Categoria, Ementa, Sabor } from "@/data/ementa";

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
 * ## A carta secreta
 *
 * O último capítulo do editor, e só de cocktails. Escolhe-se um da carta num
 * menu, ou cria-se um novo — que nasce na carta, numa das categorias de
 * cocktails, já marcado como secreto. **Cada cocktail está num sítio só:** o que
 * vai para a carta secreta sai da sua secção aqui em cima (e da `/ementa`), e o
 * que se tira de lá volta à secção, no lugar onde estava. No ficheiro é a lista
 * `secretos` — ver `EsquemaEmenta`.
 *
 * ## Os sabores
 *
 * O Cocktail Preguiça e o Unicórnio vendem-se num sabor à escolha, e a lista é
 * uma só para os dois. Edita-se na secção do Cocktail Preguiça
 * (`EditorDeSabores`); a do Unicórnio só aponta para lá, para não haver dois
 * sítios a mexer na mesma lista.
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
  categoriasSecretas,
  comSabores,
}: {
  inicial: Ementa;
  sha: string;
  grupos: GrupoDeCategorias[];
  emDestaque: readonly string[];
  /** De onde podem sair os cocktails da carta secreta. */
  categoriasSecretas: readonly Categoria[];
  /** As secções com o jogo dos sabores; a primeira é a que os edita. */
  comSabores: readonly Categoria[];
}) {
  /* A versão publicada contra a qual se conta — muda depois de cada publicação,
     tal como o `sha`, para se poder publicar duas vezes seguidas sem recarregar. */
  const [base, setBase] = useState<Carta>(inicial);
  const [shaAtual, setShaAtual] = useState(sha);
  const [artigos, setArtigos] = useState<Artigo[]>(inicial.artigos);
  /* Um ficheiro de antes da carta secreta não traz a lista. */
  const [secretos, setSecretos] = useState<string[]>(inicial.secretos ?? []);
  const [aCriarSecreto, setACriarSecreto] = useState(false);
  const [sabores, setSabores] = useState<Sabor[]>(inicial.sabores ?? []);

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
        setBase(resposta.ementa);
        setShaAtual(resposta.sha);
      }
      return resposta;
    },
    { tipo: "parado" },
  );

  const alteracoes = useMemo(
    () => totalDeAlteracoes(compararCartas(base, { artigos, secretos, sabores })),
    [base, artigos, secretos, sabores],
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

  const idsPublicados = useMemo(() => new Set(base.artigos.map((a) => a.id)), [base]);
  const eSecreto = useMemo(() => new Set(secretos), [secretos]);
  const indice = useMemo(
    () => [
      ...grupos.map((g) => ({ id: ancora(g.id), nome: g.capitulo })),
      { id: ancora("secreta"), nome: "Carta secreta", secreta: true },
    ],
    [grupos],
  );
  const infoDe = useMemo(
    () => new Map(grupos.flatMap((g) => g.categorias).map((c) => [c.id, c])),
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
      /* Salta também os da carta secreta: estão fora da secção, e trocar com um
         deles não mudava nada à vista. */
      while (
        j >= 0 &&
        j < lista.length &&
        (lista[j].categoria !== lista[i].categoria || eSecreto.has(lista[j].id))
      ) {
        j += sentido;
      }
      if (j < 0 || j >= lista.length) return anteriores;
      [lista[i], lista[j]] = [lista[j], lista[i]];
      return lista;
    });
  }

  /* Na carta secreta a ordem é a da lista `secretos`, e não a do ficheiro. */
  function moverSecreto(id: string, sentido: -1 | 1) {
    setSecretos((anteriores) => {
      const i = anteriores.indexOf(id);
      const j = i + sentido;
      if (i === -1 || j < 0 || j >= anteriores.length) return anteriores;
      const lista = [...anteriores];
      [lista[i], lista[j]] = [lista[j], lista[i]];
      return lista;
    });
  }

  /* Um escondido que vá para a carta secreta passa a ver-se lá: escolhê-lo é
     querer mostrá-lo, e um secreto escondido não aparecia em sítio nenhum. */
  function paraASecreta(id: string) {
    if (!id || eSecreto.has(id)) return;
    setSecretos((anteriores) => [...anteriores, id]);
    mudar(id, (a) => ({ ...a, escondido: false }));
  }

  function daSecreta(id: string) {
    setSecretos((anteriores) => anteriores.filter((s) => s !== id));
    setAEditar(null);
  }

  function apagar(id: string) {
    setArtigos((anteriores) => anteriores.filter((a) => a.id !== id));
    setSecretos((anteriores) => anteriores.filter((s) => s !== id));
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

  /**
   * Uma linha da carta: nome, preço, e por baixo os textos e o apagar. A mesma
   * nas secções e na carta secreta — só as setas (a ordem de cada uma) e o
   * botão do lado (esconder, ou tirar da carta secreta) mudam.
   */
  function linha(
    artigo: Artigo,
    categoria: InfoDaCategoria,
    posicao: number,
    total: number,
    naSecreta: boolean,
  ) {
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
            onClick={() => (naSecreta ? moverSecreto : mover)(artigo.id, -1)}
            disabled={posicao === 0}
            aria-label={`Subir ${artigo.nome.pt}`}
          >
            ↑
          </button>
          <button
            type="button"
            className="pn-icone"
            onClick={() => (naSecreta ? moverSecreto : mover)(artigo.id, 1)}
            disabled={posicao === total - 1}
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
          {naSecreta ? (
            <button type="button" className="pn-accao" onClick={() => daSecreta(artigo.id)}>
              Tirar da carta secreta
            </button>
          ) : (
            <button
              type="button"
              className="pn-accao"
              onClick={() => mudar(artigo.id, (a) => ({ ...a, escondido: !a.escondido }))}
            >
              {artigo.escondido ? "Mostrar" : "Esconder"}
            </button>
          )}
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
  }

  /**
   * O último capítulo: os cocktails da carta secreta, pela ordem dela, e as duas
   * maneiras de lá pôr mais um — escolher da carta, ou criar.
   */
  function cartaSecreta() {
    const naSecreta = secretos
      .map((id) => artigos.find((a) => a.id === id))
      .filter((a): a is Artigo => a !== undefined);
    /* Os que se podem escolher: cocktails da carta, que ainda não estão lá e
       que não têm fotografia no site (a legenda contava o segredo). */
    const escolhas = categoriasSecretas.map((id) => ({
      categoria: infoDe.get(id)!,
      artigos: artigos.filter(
        (a) => a.categoria === id && !eSecreto.has(a.id) && !emDestaque.includes(a.id),
      ),
    }));
    const titulo = `${ancora("secreta")}-titulo`;

    return (
      <section id={ancora("secreta")} className="pn-capitulo" aria-labelledby={titulo}>
        <header className="pn-capitulo__cabeca">
          <span className="pn-capitulo__numero" aria-hidden="true">
            🔒
          </span>
          <h2 id={titulo} className="pn-capitulo__titulo">
            Carta secreta
          </h2>
        </header>

        <p className="pn-nota">
          Só a vê quem recebe a newsletter. Um cocktail que venha para aqui sai da carta normal;
          se o tirares, volta para o sítio onde estava. Sem nenhum cocktail aqui, a carta secreta
          não aparece na ementa.
        </p>

        <section className="pn-seccao-carta" aria-label="Cocktails da carta secreta">
          {naSecreta.length > 0 ? (
            <ol className="pn-artigos">
              {naSecreta.map((artigo, posicao) =>
                linha(
                  artigo,
                  infoDe.get(artigo.categoria)!,
                  posicao,
                  naSecreta.length,
                  true,
                ),
              )}
            </ol>
          ) : (
            <p className="pn-nota">Ainda não há nenhum cocktail na carta secreta.</p>
          )}

          <label className="pn-campo">
            <span className="pn-campo__etiqueta">Pôr um cocktail da carta</span>
            {/* Escolher já é pôr: o menu volta a "Escolher…" e o cocktail
                aparece na lista de cima. */}
            <select
              className="pn-entrada"
              value=""
              onChange={(e) => paraASecreta(e.target.value)}
            >
              <option value="">Escolher um cocktail…</option>
              {escolhas.map(({ categoria, artigos: daCategoria }) =>
                daCategoria.length > 0 ? (
                  <optgroup key={categoria.id} label={categoria.nome}>
                    {daCategoria.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome.pt || "Sem nome"}
                        {a.escondido ? " (escondido)" : ""}
                      </option>
                    ))}
                  </optgroup>
                ) : null,
              )}
            </select>
          </label>

          {aCriarSecreto ? (
            <ArtigoNovo
              categoria={infoDe.get(categoriasSecretas[categoriasSecretas.length - 1])!}
              escolhas={categoriasSecretas.map((id) => infoDe.get(id)!)}
              ocupados={new Set(artigos.map((a) => a.id))}
              aoCriar={(novo) => {
                juntar(novo);
                setSecretos((anteriores) => [...anteriores, novo.id]);
                setACriarSecreto(false);
              }}
              aoDesistir={() => setACriarSecreto(false)}
            />
          ) : (
            <button
              type="button"
              className="pn-juntar"
              onClick={() => {
                setACriarSecreto(true);
                setACriarEm(null);
              }}
            >
              + Cocktail novo na carta secreta
            </button>
          )}
        </section>
      </section>
    );
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
      <input type="hidden" name="ementa" value={JSON.stringify({ artigos, secretos, sabores })} />

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
              const daCategoria = artigos.filter(
                (a) => a.categoria === categoria.id && !eSecreto.has(a.id),
              );

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
                    {daCategoria.map((artigo, posicao) =>
                      linha(artigo, categoria, posicao, daCategoria.length, false),
                    )}
                  </ol>

                  {categoria.id === comSabores[0] ? (
                    <EditorDeSabores sabores={sabores} aoMudar={setSabores} />
                  ) : comSabores.includes(categoria.id) ? (
                    <p className="pn-nota">
                      Os sabores são os mesmos do{" "}
                      <a href={`#${ancora(comSabores[0])}`}>
                        {infoDe.get(comSabores[0])?.nome}
                      </a>{" "}
                      — mudam-se lá, e mudam nos dois.
                    </p>
                  ) : null}

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

        {cartaSecreta()}
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
 *
 * Com `escolhas` (a carta secreta), pergunta também em que secção da carta
 * fica: um cocktail secreto é um artigo da carta como os outros, e tem de ter
 * uma casa para onde voltar se um dia sair da carta secreta.
 */
function ArtigoNovo({
  categoria: inicial,
  escolhas,
  ocupados,
  aoCriar,
  aoDesistir,
}: {
  categoria: InfoDaCategoria;
  escolhas?: InfoDaCategoria[];
  ocupados: Set<string>;
  aoCriar: (artigo: Artigo) => void;
  aoDesistir: () => void;
}) {
  const [categoria, setCategoria] = useState(inicial);
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
      <p className="pn-olho">
        {escolhas ? "Cocktail novo · carta secreta" : `Artigo novo · ${categoria.nome}`}
      </p>
      {erro ? <Aviso tom="mau">{erro}</Aviso> : null}

      {escolhas ? (
        <label className="pn-campo">
          <span className="pn-campo__etiqueta">Secção da carta</span>
          <select
            className="pn-entrada"
            value={categoria.id}
            onChange={(e) => setCategoria(escolhas.find((c) => c.id === e.target.value) ?? inicial)}
          >
            {escolhas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <span className="pn-campo__nota">
            É para onde volta se um dia o tirares da carta secreta.
          </span>
        </label>
      ) : null}

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
          {escolhas ? "Juntar à carta secreta" : "Juntar à carta"}
        </button>
        <button type="button" className="pn-ligacao" onClick={aoDesistir}>
          Desistir
        </button>
      </div>
      <p className="pn-nota">Só aparece no site depois de publicares.</p>
    </div>
  );
}

/** A cor com que nasce um sabor novo: o ouro da casa, até alguém a escolher. */
const COR_DE_UM_SABOR_NOVO = "#c9a227";

/**
 * Os sabores do Cocktail Preguiça e do Unicórnio: mudar o nome e a cor,
 * reordenar, tirar e acrescentar.
 *
 * Mexe-se direto na linha, sem "Editar" — são duas palavras e uma cor, e abrir
 * cada um era mais um toque para nada. A cor é a do copo no jogo da `/ementa`,
 * e não a da bebida.
 */
function EditorDeSabores({
  sabores,
  aoMudar,
}: {
  sabores: Sabor[];
  aoMudar: (sabores: Sabor[]) => void;
}) {
  const [nomePt, setNomePt] = useState("");
  const [nomeEn, setNomeEn] = useState("");
  const [cor, setCor] = useState(COR_DE_UM_SABOR_NOVO);
  const [erro, setErro] = useState<string | null>(null);

  function mudar(id: string, alteracao: (sabor: Sabor) => Sabor) {
    aoMudar(sabores.map((s) => (s.id === id ? alteracao(s) : s)));
  }

  function mover(i: number, sentido: -1 | 1) {
    const j = i + sentido;
    if (j < 0 || j >= sabores.length) return;
    const lista = [...sabores];
    [lista[i], lista[j]] = [lista[j], lista[i]];
    aoMudar(lista);
  }

  function juntar() {
    const pt = nomePt.trim();
    if (!pt) return setErro("Falta o nome do sabor.");
    if (sabores.some((s) => s.nome.pt.trim().toLowerCase() === pt.toLowerCase())) {
      return setErro(`Já há um sabor "${pt}".`);
    }
    aoMudar([
      ...sabores,
      {
        id: identificadorLivre(pt, new Set(sabores.map((s) => s.id))),
        nome: { pt, en: nomeEn.trim() || pt },
        cor,
      },
    ]);
    setNomePt("");
    setNomeEn("");
    setCor(COR_DE_UM_SABOR_NOVO);
    setErro(null);
  }

  return (
    <div className="pn-sabores" role="group" aria-label="Sabores">
      <p className="pn-olho">Sabores · {sabores.length}</p>
      <p className="pn-nota">
        Os mesmos no Cocktail Preguiça e no Unicórnio. A cor é só a do copo no jogo da ementa.
      </p>

      <ol className="pn-sabores__lista">
        {sabores.map((sabor, i) => (
          <li key={sabor.id} className="pn-sabor">
            <label className="pn-sabor__cor" title="Cor do copo">
              <span className="sr-only">Cor de {sabor.nome.pt}</span>
              {sabor.cor === null ? (
                <span className="pn-sabor__arco-iris" aria-hidden="true" />
              ) : null}
              <input
                type="color"
                value={sabor.cor ?? COR_DE_UM_SABOR_NOVO}
                onChange={(e) => mudar(sabor.id, (s) => ({ ...s, cor: e.target.value }))}
                data-escondido={sabor.cor === null || undefined}
              />
            </label>
            <input
              className="pn-entrada"
              value={sabor.nome.pt}
              maxLength={30}
              aria-label={`Nome em português (${sabor.nome.pt})`}
              aria-invalid={!sabor.nome.pt.trim() || undefined}
              onChange={(e) =>
                mudar(sabor.id, (s) => ({ ...s, nome: { ...s.nome, pt: e.target.value } }))
              }
            />
            <input
              className="pn-entrada"
              lang="en"
              value={sabor.nome.en}
              maxLength={30}
              aria-label={`Nome em inglês (${sabor.nome.pt})`}
              aria-invalid={!sabor.nome.en.trim() || undefined}
              onChange={(e) =>
                mudar(sabor.id, (s) => ({ ...s, nome: { ...s.nome, en: e.target.value } }))
              }
            />
            <span className="pn-sabor__accoes">
              <button
                type="button"
                className="pn-icone"
                onClick={() => mover(i, -1)}
                disabled={i === 0}
                aria-label={`Subir ${sabor.nome.pt}`}
              >
                ↑
              </button>
              <button
                type="button"
                className="pn-icone"
                onClick={() => mover(i, 1)}
                disabled={i === sabores.length - 1}
                aria-label={`Descer ${sabor.nome.pt}`}
              >
                ↓
              </button>
              {/* Sem confirmação: é uma palavra e uma cor, volta-se a escrever,
                  e nada sai do site antes de publicar. O último não se tira —
                  o jogo sem sabores era um botão que não fazia nada. */}
              <button
                type="button"
                className="pn-icone"
                onClick={() => aoMudar(sabores.filter((s) => s.id !== sabor.id))}
                disabled={sabores.length === 1}
                aria-label={`Tirar ${sabor.nome.pt}`}
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ol>

      <div className="pn-cartao pn-pilha pn-novo" role="group" aria-label="Sabor novo">
        <p className="pn-olho">Sabor novo</p>
        {erro ? <Aviso tom="mau">{erro}</Aviso> : null}
        <div className="pn-linha">
          <Campo
            etiqueta="Nome"
            value={nomePt}
            maxLength={30}
            onChange={(e) => setNomePt(e.target.value)}
          />
          <Campo
            etiqueta="Nome em inglês"
            lang="en"
            value={nomeEn}
            maxLength={30}
            placeholder={nomePt}
            onChange={(e) => setNomeEn(e.target.value)}
          />
          <label className="pn-campo pn-campo--cor">
            <span className="pn-campo__etiqueta">Cor</span>
            <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} />
          </label>
        </div>
        <div className="pn-linha">
          <button type="button" className="pg-botao pg-botao--cheio" onClick={juntar}>
            Juntar sabor
          </button>
        </div>
        <p className="pn-nota">
          Se o nome em inglês ficar vazio, vai o português. Só aparece no site depois de publicares.
        </p>
      </div>
    </div>
  );
}
