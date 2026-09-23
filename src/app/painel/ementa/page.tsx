import { exigirSessao } from "@/lib/painel/porta";
import { ler, CAMINHO_EMENTA, ErroDoGithub } from "@/lib/painel/github";
import { Cabecalho } from "@/components/painel/Cabecalho";
import { Aviso } from "@/components/painel/Aviso";
import { EditorDeEmenta, type GrupoDeCategorias } from "@/components/painel/EditorDeEmenta";
import {
  CAPITULOS,
  CATEGORIAS,
  EM_DESTAQUE,
  METADADOS,
  SEM_DESCRICAO,
  type Capitulo,
  type Ementa,
} from "@/data/ementa";
import mensagens from "../../../../messages/pt.json";

/**
 * Os capítulos e as categorias, já com os nomes que a carta mostra — os mesmos
 * de `messages/pt.json`, para o painel e o site chamarem o mesmo à mesma
 * secção. Feito aqui, no servidor, para o editor não ter de importar o módulo
 * da carta (ver o comentário do `EditorDeEmenta`).
 */
function grupos(): GrupoDeCategorias[] {
  return (Object.keys(CAPITULOS) as Capitulo[]).map((capitulo) => ({
    capitulo: mensagens.ementa.capitulos[capitulo].nome,
    categorias: CATEGORIAS.filter((c) =>
      (CAPITULOS[capitulo] as readonly string[]).includes(c),
    ).map((id) => ({
      id,
      nome: mensagens.ementa.categorias[id],
      semDescricao: SEM_DESCRICAO.includes(id),
      colunas: METADADOS[id]?.colunas,
    })),
  }));
}

/**
 * A carta.
 *
 * Lê do GitHub e não do `import` de `src/data/ementa.json` — ver o comentário
 * longo em `src/lib/painel/github.ts`. Em resumo: o import é a fotografia do
 * último build, atrasada durante a reconstrução, e não traz o `sha` que a
 * gravação a seguir precisa como cadeado.
 */
export default async function PaginaDaEmenta() {
  const { email } = await exigirSessao();

  let ficheiro;
  try {
    ficheiro = await ler<Ementa>(CAMINHO_EMENTA);
  } catch (erro) {
    return (
      <>
        <Cabecalho titulo="Ementa" voltarPara="/painel" quem={email} />
        <main className="pn-principal">
          <Aviso tom="mau">
            {erro instanceof ErroDoGithub
              ? erro.paraOEcra
              : "Não foi possível ir buscar a carta ao repositório."}
          </Aviso>
        </main>
      </>
    );
  }

  return (
    <>
      <Cabecalho titulo="Ementa" voltarPara="/painel" quem={email} />
      <main className="pn-principal">
        <EditorDeEmenta
          inicial={ficheiro.dados}
          sha={ficheiro.sha}
          grupos={grupos()}
          emDestaque={EM_DESTAQUE}
        />
      </main>
    </>
  );
}
