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
  /*
    Quem já tem sessão **não** é mandado para dentro daqui, ao contrário do
    primeiro ecrã — e é por causa da animação.

    O `confirmarCodigo` põe os cookies da sessão, e uma acção que mexe em
    cookies faz o Next desenhar esta página outra vez na mesma resposta. Com o
    `redirect`, esse segundo desenho saltava para o painel no instante em que o
    código era aceite, a meio da animação de entrada. Assim a página desenha-se
    igual, o formulário não é desmontado (o React guarda-lhe o estado), e é ele
    que abre o painel quando a animação acaba — ou logo, se alguém chegou cá
    com a sessão já aberta (`jaDentro`).
  */
  const dentro = await sessao();

  let email: string | null = dentro?.email ?? null;
  if (!email) {
    try {
      email = await emailDoDesafio((await cookies()).get(NOME_DO_DESAFIO)?.value);
    } catch (erro) {
      /* Sem armazenamento não há desafio para ler; o primeiro ecrã explica. */
      if (!(erro instanceof ErroDoRedis)) throw erro;
    }
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
          <FormularioDeCodigo paraOnde={meioEscondido(email)} jaDentro={Boolean(dentro)} />
        </div>

        <p className="pn-nota pn-centro">
          Se recebeste este código sem o teres pedido, alguém escreveu o teu endereço no ecrã de
          entrada. Sem o código não se entra.
        </p>
      </div>
    </main>
  );
}
