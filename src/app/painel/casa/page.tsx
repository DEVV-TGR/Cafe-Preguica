import { exigirSessao } from "@/lib/painel/porta";
import { ler, CAMINHO_CAFE, CAMINHO_MARCA, ErroDoGithub } from "@/lib/painel/github";
import { Cabecalho } from "@/components/painel/Cabecalho";
import { Aviso } from "@/components/painel/Aviso";
import { EditorDaCasa } from "@/components/painel/EditorDaCasa";
import type { Cafe } from "@/data/cafe";
import type { Marca } from "@/data/marca";

/** O horário, os contactos e as redes — lidos do repositório, pela razão da ementa. */
export default async function PaginaDaCasa() {
  const { email } = await exigirSessao();

  let cafe, marca;
  try {
    [cafe, marca] = await Promise.all([ler<Cafe>(CAMINHO_CAFE), ler<Marca>(CAMINHO_MARCA)]);
  } catch (erro) {
    return (
      <>
        <Cabecalho titulo="Horário e contactos" voltarPara="/painel" quem={email} />
        <main className="pn-principal">
          <Aviso tom="mau">
            {erro instanceof ErroDoGithub
              ? erro.paraOEcra
              : "Não foi possível ir buscar os dados da casa ao repositório."}
          </Aviso>
        </main>
      </>
    );
  }

  return (
    <>
      <Cabecalho titulo="Horário e contactos" voltarPara="/painel" quem={email} />
      <main className="pn-principal">
        <EditorDaCasa
          inicial={{
            telefone: cafe.dados.telefone ?? "",
            email: cafe.dados.email ?? "",
            horarios: cafe.dados.horarios,
            redes: {
              instagram: marca.dados.instagram ?? "",
              facebook: marca.dados.facebook ?? "",
              tiktok: marca.dados.tiktok ?? "",
              spotify: marca.dados.spotify ?? "",
            },
          }}
          shaCafe={cafe.sha}
          shaMarca={marca.sha}
          horarioConfirmado={cafe.dados.horarioConfirmado}
        />
      </main>
    </>
  );
}
