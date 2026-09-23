"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { autorizado } from "@/lib/painel/utilizadores";
import {
  selar,
  lembrarAparelho,
  aparelhoConhecido,
  esquecerAparelho,
  opcoesDoCookie,
  NOME_DO_COOKIE,
  NOME_DO_APARELHO,
  VALIDADE_APARELHO_MS,
} from "@/lib/painel/sessao";
import {
  gerarCodigo,
  criarDesafio,
  conferirCodigo,
  emailDoDesafio,
  apagarDesafio,
  NOME_DO_DESAFIO,
  VALIDADE_MS as VALIDADE_DO_DESAFIO,
} from "@/lib/painel/codigo";
import { enviarCodigo, ErroAoEnviar } from "@/lib/painel/email";
import { ErroDoRedis } from "@/lib/painel/redis";
import { podePedirCodigo, anotar } from "@/lib/painel/limites";
import { exigirSessaoNaAccao } from "@/lib/painel/porta";

/*
  Entrar, confirmar o código, e sair.

  A entrada é passwordless: escreve-se o email, chega um código, entra-se. Um
  aparelho que já tenha passado pelo código salta-o durante 30 dias.
*/

export type EstadoDaEntrada = { erro?: string; enviado?: boolean };

/*
  A resposta é sempre a mesma, e é o ponto mais delicado deste ficheiro.

  Um email que tem acesso e um que não tem saem daqui com `{ enviado: true }`, e
  o ecrã escreve a mesma frase nos dois casos. Se a resposta distinguisse —
  *"esse email não está autorizado"* — o formulário passava a ser uma ferramenta
  para qualquer pessoa descobrir quem entra no painel.

  E não é só o texto. Um email de fora **consome na mesma** o orçamento de
  pedidos, para o comportamento a partir do quarto ser igual nos dois casos.
*/
export async function pedirCodigo(
  _estado: EstadoDaEntrada,
  dados: FormData,
): Promise<EstadoDaEntrada> {
  const email = String(dados.get("email") ?? "").trim().toLowerCase();

  if (!email.includes("@")) return { erro: "Escreve um endereço de email." };

  const frasco = await cookies();
  let jaConhecido = false;

  /*
    Tudo o que fala com o armazenamento ou com o Resend vive aqui dentro.

    O `redirect` **não** — continua fora, no fim, pela razão de sempre: funciona
    atirando uma excepção que o Next apanha, e um `catch` à volta seria uma
    forma silenciosa de a engolir. Por isso o que se decide cá dentro é um
    booleano, e o salto dá-se lá em baixo.
  */
  try {
    /*
      Conta antes de saber se o email existe — ver o comentário do
      `lib/painel/limites.ts`. Esgotado o orçamento, responde-se a mesma coisa de
      sempre: quem está a sondar não fica a saber se parou por causa do limite ou
      por o email não existir.
    */
    if (!(await podePedirCodigo(email))) {
      await anotar("limite de pedidos esgotado", email);
      return { enviado: true };
    }

    const quem = autorizado(email);

    if (!quem) {
      await anotar("pedido para email fora da lista", email);
      return { enviado: true };
    }

    /* Já passou pelo código neste aparelho — entra sem repetir. */
    if (await aparelhoConhecido(frasco.get(NOME_DO_APARELHO)?.value, quem.email)) {
      frasco.set(NOME_DO_COOKIE, await selar(quem.email), opcoesDoCookie());
      jaConhecido = true;
    } else {
      /* Pedir outro código invalida o anterior, para não haver dois válidos. */
      await apagarDesafio(frasco.get(NOME_DO_DESAFIO)?.value);

      const codigo = gerarCodigo();
      await enviarCodigo({ para: quem.email, codigo });

      frasco.set(
        NOME_DO_DESAFIO,
        await criarDesafio(quem.email, codigo),
        opcoesDoCookie(VALIDADE_DO_DESAFIO),
      );
    }
  } catch (erro) {
    /*
      Sem armazenamento não se conta, e sem contar não se deixa entrar — mas
      isso tem de ser **dito**, não atirado. Era este o buraco: o `ErroDoRedis`
      subia sem ninguém o apanhar e o que aparecia era o ecrã de avaria da
      Vercel.
    */
    if (erro instanceof ErroDoRedis) return { erro: erro.paraOEcra };
    /* Uma falha de envio nunca pode virar "entra à mesma". */
    if (erro instanceof ErroAoEnviar) return { erro: erro.paraOEcra };
    throw erro;
  }

  redirect(jaConhecido ? "/painel" : "/painel/entrar/codigo");
}

export type EstadoDoCodigo = { erro?: string; reenviado?: boolean };

export async function confirmarCodigo(
  _estado: EstadoDoCodigo,
  dados: FormData,
): Promise<EstadoDoCodigo> {
  const frasco = await cookies();
  const escrito = String(dados.get("codigo") ?? "");

  /* Mesma forma do `pedirCodigo`: o armazenamento dentro, o `redirect` fora. */
  try {
    const veredicto = await conferirCodigo(frasco.get(NOME_DO_DESAFIO)?.value, escrito);

    if (veredicto.estado === "sem-desafio" || veredicto.estado === "expirado") {
      frasco.delete({ name: NOME_DO_DESAFIO, path: "/painel" });
      return { erro: "O código expirou ou já não serve. Pede outro." };
    }

    if (veredicto.estado === "errado") {
      await anotar("código errado", "—");
      return {
        erro:
          veredicto.restam > 0
            ? `Código errado. Faltam ${veredicto.restam} tentativas.`
            : "Código errado, e acabaram as tentativas. Pede outro.",
      };
    }

    frasco.set(NOME_DO_COOKIE, await selar(veredicto.email), opcoesDoCookie());
    frasco.set(
      NOME_DO_APARELHO,
      await lembrarAparelho(veredicto.email),
      opcoesDoCookie(VALIDADE_APARELHO_MS),
    );
    frasco.delete({ name: NOME_DO_DESAFIO, path: "/painel" });
  } catch (erro) {
    /*
      O contador de tentativas vive no armazenamento. Sem ele não se consegue
      conferir o código — e **não conseguir conferir nunca pode virar "entra à
      mesma"**. Falha fechado, com uma frase que se lê.
    */
    if (erro instanceof ErroDoRedis) return { erro: erro.paraOEcra };
    throw erro;
  }

  redirect("/painel");
}

/** "Não chegou nada" — outro código, e o anterior deixa de servir. */
export async function reenviarCodigo(): Promise<EstadoDoCodigo> {
  const frasco = await cookies();

  try {
    const email = await emailDoDesafio(frasco.get(NOME_DO_DESAFIO)?.value);

    if (!email) return { erro: "O código expirou. Volta a escrever o email." };

    /* O reenvio conta como pedido — senão era a porta das traseiras do limite. */
    if (!(await podePedirCodigo(email))) {
      await anotar("limite de pedidos esgotado no reenvio", email);
      return { erro: "Já pediste códigos demais. Espera uns minutos." };
    }

    await apagarDesafio(frasco.get(NOME_DO_DESAFIO)?.value);
    const codigo = gerarCodigo();

    await enviarCodigo({ para: email, codigo });

    frasco.set(
      NOME_DO_DESAFIO,
      await criarDesafio(email, codigo),
      opcoesDoCookie(VALIDADE_DO_DESAFIO),
    );
  } catch (erro) {
    /* Sem armazenamento não há como contar o reenvio, e um reenvio que não se
       conta é o buraco por onde o limite de pedidos se esvazia. */
    if (erro instanceof ErroDoRedis) return { erro: erro.paraOEcra };
    if (erro instanceof ErroAoEnviar) return { erro: erro.paraOEcra };
    throw erro;
  }

  return { reenviado: true };
}

export async function sair(): Promise<void> {
  await exigirSessaoNaAccao();

  /*
    O `delete` tem de levar o mesmo caminho com que o cookie foi posto. Sem
    `path`, apagava um cookie de `/` que não existe e deixava o de `/painel` no
    sítio, com a sessão viva e o botão a não fazer nada.

    O aparelho **fica**: sair é fechar a sessão, não desconfiar do telemóvel.
    Quem quiser esquecê-lo tem o botão do lado.
  */
  (await cookies()).delete({ name: NOME_DO_COOKIE, path: "/painel" });

  redirect("/painel/entrar");
}

/*
  Esquecer este aparelho.

  Apaga o registo no Redis, o cookie do aparelho e a sessão — a seguir a isto,
  este browser volta a pedir o código. É o que se carrega quando se empresta o
  telemóvel, ou quando se entrou num computador que não é nosso.
*/
export async function esquecerEsteAparelho(): Promise<void> {
  await exigirSessaoNaAccao();
  const frasco = await cookies();

  await esquecerAparelho(frasco.get(NOME_DO_APARELHO)?.value);
  frasco.delete({ name: NOME_DO_APARELHO, path: "/painel" });
  frasco.delete({ name: NOME_DO_COOKIE, path: "/painel" });

  redirect("/painel/entrar");
}
