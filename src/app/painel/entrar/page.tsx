import Image from "next/image";
import { redirect } from "next/navigation";
import { sessao } from "@/lib/painel/porta";
import { FormularioDeEntrada } from "@/components/painel/FormularioDeEntrada";

/**
 * O ecrã de entrada.
 *
 * A única página do painel que não chama `exigirSessao()` — seria um ciclo. Faz
 * o contrário: quem já tem sessão vai para dentro.
 *
 * Nada aqui toca em variáveis de ambiente até o formulário ser submetido, e não
 * é acaso: é o que deixa o CI abrir esta página sem um único segredo definido.
 */
export default async function Entrar() {
  if (await sessao()) redirect("/painel");

  return (
    <main className="pn-entrada-ecra">
      <div className="pn-entrada-ecra__caixa">
        <header className="pn-entrada-ecra__topo">
          <Image src="/marca/marca.webp" alt="Café Preguiça" width={96} height={96} className="pn-entrada-ecra__marca" priority />
          <p className="pn-olho">Painel da casa</p>
          <h1 className="pn-titulo">Entrar</h1>
          <p className="pn-texto-suave">Escreve o teu email e recebes um código.</p>
        </header>

        <div className="pn-cartao">
          <FormularioDeEntrada />
        </div>

        <p className="pn-nota pn-centro">
          Não há palavra-passe para decorar. Se o código não chegar, confirma o endereço e vê o
          spam.
        </p>
      </div>
    </main>
  );
}
