"use server";

import { exigirSessaoNaAccao } from "@/lib/painel/porta";
import { meioEscondido } from "@/lib/painel/utilizadores";
import {
  ler,
  gravar,
  enderecoDoCommit,
  CAMINHO_CAFE,
  CAMINHO_MARCA,
  ConflitoDeGravacao,
  ErroDoGithub,
} from "@/lib/painel/github";
import { EsquemaCafe, type Cafe } from "@/data/cafe";
import { EsquemaMarca, type Marca } from "@/data/marca";
import { erroDeFicheiro } from "@/data/erros";

/** O que o ecrã da casa edita — e **só** isto. */
export type DadosDaCasa = {
  telefone: string;
  email: string;
  horarios: Cafe["horarios"];
  redes: Record<"instagram" | "facebook" | "tiktok" | "spotify", string>;
};

export type EstadoDaCasa =
  | { tipo: "parado" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "problemas"; lista: string[] }
  | {
      tipo: "gravado";
      commit: string;
      endereco: string;
      shaCafe: string;
      shaMarca: string;
    };

const CONFLITO =
  "Alguém gravou entretanto e este ecrã ficou desatualizado. Recarrega a página e volta a " +
  "fazer a alteração — nada foi gravado, para não apagar o trabalho da outra pessoa.";

const vazioParaNull = (texto: string) => (texto.trim() === "" ? null : texto.trim());

function problemasDe(ficheiro: string, erro: Parameters<typeof erroDeFicheiro>[1]): string[] {
  return erroDeFicheiro(ficheiro, erro, null)
    .message.split("\n")
    .slice(1)
    .map((linha) => linha.replace(/^\s*✖\s*/, ""));
}

/**
 * Gravar o horário, os contactos e as redes.
 *
 * O browser manda **só os campos que este ecrã edita**, e o resto vem do
 * ficheiro que está no repositório. É o que garante que o painel nunca mexe no
 * `horarioConfirmado`, na morada ou na entidade de litígios — nem por engano,
 * nem por um pedido feito à mão.
 *
 * São dois ficheiros (`cafe.json` e `marca.json`) e a API do GitHub grava um
 * de cada vez, por isso podem ser dois commits. Só se grava o que mudou — mudar
 * o horário não toca nas redes.
 */
export async function gravarCasa(
  _estado: EstadoDaCasa,
  dados: FormData,
): Promise<EstadoDaCasa> {
  const { email } = await exigirSessaoNaAccao();
  const quem = meioEscondido(email);

  const shaCafe = String(dados.get("shaCafe") ?? "");
  const shaMarca = String(dados.get("shaMarca") ?? "");
  let recebido: DadosDaCasa;
  try {
    recebido = JSON.parse(String(dados.get("casa") ?? "")) as DadosDaCasa;
  } catch {
    return { tipo: "erro", mensagem: "Os dados chegaram estragados. Recarrega a página." };
  }

  try {
    const [cafe, marca] = await Promise.all([
      ler<Cafe>(CAMINHO_CAFE),
      ler<Marca>(CAMINHO_MARCA),
    ]);
    if (cafe.sha !== shaCafe || marca.sha !== shaMarca) {
      return { tipo: "erro", mensagem: CONFLITO };
    }

    const novoCafe = EsquemaCafe.safeParse({
      ...cafe.dados,
      telefone: vazioParaNull(String(recebido.telefone ?? "")),
      email: vazioParaNull(String(recebido.email ?? "")),
      horarios: recebido.horarios,
    });
    const novaMarca = EsquemaMarca.safeParse({
      ...marca.dados,
      instagram: vazioParaNull(String(recebido.redes?.instagram ?? "")),
      facebook: vazioParaNull(String(recebido.redes?.facebook ?? "")),
      tiktok: vazioParaNull(String(recebido.redes?.tiktok ?? "")),
      spotify: vazioParaNull(String(recebido.redes?.spotify ?? "")),
    });

    const problemas = [
      ...(novoCafe.success ? [] : problemasDe("cafe", novoCafe.error)),
      ...(novaMarca.success ? [] : problemasDe("marca", novaMarca.error)),
    ];
    if (!novoCafe.success || !novaMarca.success) return { tipo: "problemas", lista: problemas };

    /* A ordem das chaves é a do ficheiro original — o `...cafe.dados` põe-nas
       primeiro — e por isso o diff no GitHub mostra só as linhas que mudaram. */
    const mudouCafe = JSON.stringify(novoCafe.data) !== JSON.stringify(cafe.dados);
    const mudouMarca = JSON.stringify(novaMarca.data) !== JSON.stringify(marca.dados);
    if (!mudouCafe && !mudouMarca) {
      return { tipo: "erro", mensagem: "Não há nada para gravar." };
    }

    let commit = "";
    let novoShaCafe = cafe.sha;
    let novoShaMarca = marca.sha;

    if (mudouCafe) {
      const gravado = await gravar({
        caminho: CAMINHO_CAFE,
        dados: novoCafe.data,
        sha: cafe.sha,
        mensagem: `Horário e contactos, pelo painel (${quem})`,
      });
      commit = gravado.commit;
      novoShaCafe = gravado.sha;
    }

    if (mudouMarca) {
      try {
        const gravado = await gravar({
          caminho: CAMINHO_MARCA,
          dados: novaMarca.data,
          sha: marca.sha,
          mensagem: `Redes sociais, pelo painel (${quem})`,
        });
        commit = gravado.commit;
        novoShaMarca = gravado.sha;
      } catch (erro) {
        /* O primeiro já foi. Dizer exatamente o que ficou e o que não ficou,
           em vez de um "falhou" que faz repetir tudo. */
        if (mudouCafe && (erro instanceof ErroDoGithub || erro instanceof ConflitoDeGravacao)) {
          return {
            tipo: "erro",
            mensagem:
              "O horário e os contactos ficaram gravados, mas as redes sociais não. " +
              "Recarrega a página e volta a mudar só as redes.",
          };
        }
        throw erro;
      }
    }

    return {
      tipo: "gravado",
      commit,
      endereco: enderecoDoCommit(commit),
      shaCafe: novoShaCafe,
      shaMarca: novoShaMarca,
    };
  } catch (erro) {
    if (erro instanceof ConflitoDeGravacao) return { tipo: "erro", mensagem: CONFLITO };
    if (erro instanceof ErroDoGithub) return { tipo: "erro", mensagem: erro.paraOEcra };
    throw erro;
  }
}
