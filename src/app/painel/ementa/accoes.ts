"use server";

import { exigirSessaoNaAccao } from "@/lib/painel/porta";
import { meioEscondido } from "@/lib/painel/utilizadores";
import { compararCartas, resumirAlteracoes, totalDeAlteracoes } from "@/lib/painel/alteracoes";
import {
  ler,
  gravar,
  enderecoDoCommit,
  CAMINHO_EMENTA,
  ConflitoDeGravacao,
  ErroDoGithub,
} from "@/lib/painel/github";
import { EM_DESTAQUE, EsquemaEmenta, type Ementa } from "@/data/ementa";
import { erroDeFicheiro } from "@/data/erros";

export type EstadoDaEmenta =
  | { tipo: "parado" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "problemas"; lista: string[] }
  | { tipo: "gravado"; commit: string; endereco: string; sha: string; ementa: Ementa };

const CONFLITO =
  "Alguém gravou a carta entretanto e este ecrã ficou desatualizado. Recarrega a página e " +
  "volta a fazer as alterações — nada foi gravado, para não apagar o trabalho da outra pessoa.";

/**
 * Publicar a carta.
 *
 * Recebe o ficheiro inteiro, não um remendo: o que se valida tem de ser
 * exatamente o que vai para o repositório.
 *
 * ## Três coisas que o browser não decide
 *
 * 1. **As regras.** O que chega passa pelo `EsquemaEmenta` — o mesmo que corre
 *    no `build`. Se passa aqui, passa lá, e o site não fica parado numa versão
 *    antiga por causa de um preço mal escrito.
 * 2. **O `confirmada`.** Vem sempre do ficheiro que está no repositório, seja o
 *    que for que o browser mande. Tirar o aviso de "carta provisória" é uma
 *    decisão que se toma no código (ver o AGENTS.md), não um campo que se
 *    manipula num pedido.
 * 3. **A mensagem do commit.** É calculada aqui, comparando com o repositório.
 */
export async function publicarEmenta(
  _estado: EstadoDaEmenta,
  dados: FormData,
): Promise<EstadoDaEmenta> {
  const { email } = await exigirSessaoNaAccao();

  const sha = String(dados.get("sha") ?? "");
  let recebida: unknown;
  try {
    recebida = JSON.parse(String(dados.get("ementa") ?? ""));
  } catch {
    return { tipo: "erro", mensagem: "Os dados chegaram estragados. Recarrega a página." };
  }

  try {
    const atual = await ler<Ementa>(CAMINHO_EMENTA);
    /* Poupa uma ida ao GitHub para ouvir o mesmo 409 — e responde antes de
       validar, porque os problemas de uma versão velha já não interessam. */
    if (atual.sha !== sha) return { tipo: "erro", mensagem: CONFLITO };

    const artigosRecebidos =
      typeof recebida === "object" && recebida !== null && "artigos" in recebida
        ? (recebida as { artigos: unknown }).artigos
        : undefined;

    const validada = EsquemaEmenta.safeParse({
      confirmada: atual.dados.confirmada,
      artigos: artigosRecebidos,
    });
    if (!validada.success) {
      const linhas = erroDeFicheiro("ementa", validada.error, artigosRecebidos)
        .message.split("\n")
        .slice(1)
        .map((linha) => linha.replace(/^\s*✖\s*/, ""));
      return { tipo: "problemas", lista: linhas };
    }
    const ementa = validada.data;

    /* Os artigos com fotografia no site não se apagam por aqui — ver
       `EM_DESTAQUE`. O ecrã já esconde o botão; isto é a fechadura. */
    const ids = new Set(ementa.artigos.map((a) => a.id));
    const emFalta = EM_DESTAQUE.filter((id) => !ids.has(id));
    if (emFalta.length > 0) {
      return {
        tipo: "problemas",
        lista: emFalta.map(
          (id) => `"${id}" tem fotografia no site e não pode ser apagado — podes escondê-lo.`,
        ),
      };
    }

    const contas = compararCartas(atual.dados.artigos, ementa.artigos);
    if (totalDeAlteracoes(contas) === 0) {
      return { tipo: "erro", mensagem: "Não há nada para publicar." };
    }

    const { commit, sha: novoSha } = await gravar({
      caminho: CAMINHO_EMENTA,
      dados: ementa,
      sha,
      mensagem: `Ementa: ${resumirAlteracoes(contas)}, pelo painel (${meioEscondido(email)})`,
    });

    return { tipo: "gravado", commit, endereco: enderecoDoCommit(commit), sha: novoSha, ementa };
  } catch (erro) {
    if (erro instanceof ConflitoDeGravacao) return { tipo: "erro", mensagem: CONFLITO };
    if (erro instanceof ErroDoGithub) return { tipo: "erro", mensagem: erro.paraOEcra };
    throw erro;
  }
}
