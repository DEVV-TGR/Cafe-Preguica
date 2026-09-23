import Link from "next/link";
import { exigirSessao } from "@/lib/painel/porta";
import { esquecerEsteAparelho } from "./accoes";
import { Cabecalho } from "@/components/painel/Cabecalho";

/**
 * A porta de dentro: três escolhas e mais nenhuma.
 *
 * `exigirSessao()` aqui e não no layout — ver o comentário do `layout.tsx`
 * sobre um layout não ser fronteira de segurança.
 */
const SECCOES = [
  {
    href: "/painel/ementa",
    olho: "A carta",
    titulo: "Ementa",
    frase: "Preços, artigos novos, nomes e descrições, esconder o que acabou, mudar a ordem.",
  },
  {
    href: "/painel/casa",
    olho: "A casa",
    titulo: "Horário e contactos",
    frase: "A que horas abre cada dia, o telefone, o email e as redes sociais.",
  },
  {
    href: "/painel/newsletter",
    olho: "Os contactos",
    titulo: "Newsletter",
    frase: "Escrever um email para quem se inscreveu no site, e ver quem está inscrito.",
  },
];

export default async function Painel() {
  const { email } = await exigirSessao();

  return (
    <>
      <Cabecalho titulo="Painel" quem={email} />

      <main className="pn-principal">
        <ul className="pn-pilha">
          {SECCOES.map(({ href, olho, titulo, frase }) => (
            <li key={href}>
              <Link href={href} className="pn-porta">
                <span className="pn-olho">{olho}</span>
                <span className="pn-porta__titulo">{titulo}</span>
                <span className="pn-texto-suave">{frase}</span>
                <span className="pn-porta__seta" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* O aviso que evita o telefonema: uma alteração aqui é um commit e uma
            reconstrução do site, não uma escrita que aparece no instante
            seguinte. Quem não souber disto recarrega, não vê nada mudar, e
            conclui que se perdeu. */}
        <p className="pn-texto-suave pn-espaco">
          O que se muda aqui não aparece no site logo a seguir. Cada publicação reconstrói o
          site, e isso costuma demorar <strong className="pn-forte">1 a 2 minutos</strong>.
        </p>

        {/* Este aparelho está lembrado 30 dias e por isso não pede o código. Quem
            emprestou o telemóvel precisa de uma forma de desfazer isso — aqui, e
            não escondida numa página de definições que o painel não tem. */}
        <form action={esquecerEsteAparelho} className="pn-separado">
          <button type="submit" className="pn-ligacao">
            Esquecer este aparelho
          </button>
          <p className="pn-nota">
            Este telemóvel ou computador não volta a pedir o código durante 30 dias. Se não for
            teu, ou se o emprestaste, carrega aqui — sais, e da próxima vez o código é pedido
            outra vez.
          </p>
        </form>
      </main>
    </>
  );
}
