import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { sessao } from "@/lib/painel/porta";
import { meioEscondido } from "@/lib/painel/utilizadores";
import { emailDoDesafio, NOME_DO_DESAFIO } from "@/lib/painel/codigo";
import { ErroDoRedis } from "@/lib/painel/redis";
import { FormularioDeCodigo } from "@/components/painel/FormularioDeCodigo";

/**
 * O segundo ecrã: o código.
 *
 * Só se chega aqui com um desafio a meio — um email da lista e um código já
 * enviado. Quem lá bater sem isso volta ao princípio.
 *
 * O endereço aparece meio escondido (`m•••a@…`): por extenso seria confirmar a
 * quem o escreveu que aquele endereço tem acesso, que é o que a resposta
 * uniforme do primeiro ecrã existe para não fazer.
 */
export default async function Codigo() {
  if (await sessao()) redirect("/painel");

  let email: string | null = null;
  try {
    email = await emailDoDesafio((await cookies()).get(NOME_DO_DESAFIO)?.value);
  } catch (erro) {
    /* Sem armazenamento não há desafio para ler; o primeiro ecrã explica. */
    if (!(erro instanceof ErroDoRedis)) throw erro;
  }
  if (!email) redirect("/painel/entrar");

  return (
    <main className="pn-entrada-ecra">
      <div className="pn-entrada-ecra__caixa">
        <header className="pn-entrada-ecra__topo">
          <p className="pn-olho">Painel da casa</p>
          <h1 className="pn-titulo">O código</h1>
        </header>

        <div className="pn-cartao">
          <FormularioDeCodigo paraOnde={meioEscondido(email)} />
        </div>

        <p className="pn-nota pn-centro">
          Se recebeste este código sem o teres pedido, alguém escreveu o teu endereço no ecrã de
          entrada. Sem o código não se entra.
        </p>
      </div>
    </main>
  );
}
