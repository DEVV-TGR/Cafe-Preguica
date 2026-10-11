import { exigirSessao } from "@/lib/painel/porta";
import { ErroDoRedis } from "@/lib/painel/redis";
import { dadosDasMesas } from "@/lib/mesas/leituras";
import { TituloDaPagina } from "@/components/painel/TituloDaPagina";
import { Aviso } from "@/components/painel/Aviso";
import { EstatisticaDasMesas } from "@/components/painel/EstatisticaDasMesas";

/**
 * As leituras das mesas (QR e NFC juntos) — para saber se as pessoas as usam.
 *
 * Lido do Redis de cada vez que a página abre; ver `lib/mesas/contas.ts` para o
 * que se conta e o que fica de fora. Os três números de cima são de sempre;
 * por baixo, a estatística com filtro (`EstatisticaDasMesas`), que corre no
 * browser sobre os dados que vão daqui.
 */

const UMA_CASA = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 });
const media = (total: number, noites: number) => `${UMA_CASA.format(total / noites)} por noite`;

const INTRODUCAO =
  "Quantas vezes a carta foi aberta pelo QR ou pelo NFC de cada mesa — os dois contam juntos. " +
  "Conta leituras, não pessoas: quatro amigos na mesma mesa contam quatro. A noite vai das 06:00 " +
  "às 06:00, para o fecho depois da meia-noite contar na noite certa.";

export default async function PaginaDasMesas() {
  await exigirSessao();

  let dados: Awaited<ReturnType<typeof dadosDasMesas>>;
  try {
    dados = await dadosDasMesas();
  } catch (erro) {
    return (
      <main className="pn-principal">
        <TituloDaPagina olho="Os QR e os NFC" titulo="Mesas" frase={INTRODUCAO} />
        <Aviso tom="mau">
          {erro instanceof ErroDoRedis
            ? erro.paraOEcra
            : "Não foi possível ir buscar as leituras das mesas."}
        </Aviso>
      </main>
    );
  }

  const { resumo } = dados;
  /* A média conta as noites em que a casa está fechada: é para comparar
     semanas entre si, não para dizer quanto rende uma noite aberta. */
  const blocos = [
    { titulo: "Últimas 7 noites", total: resumo.semana, nota: media(resumo.semana, 7) },
    { titulo: "Últimas 30 noites", total: resumo.mes, nota: media(resumo.mes, 30) },
    { titulo: "Desde o início", total: resumo.sempre, nota: "leituras ao todo" },
  ];

  return (
    <main className="pn-principal pn-pilha-larga">
      <TituloDaPagina olho="Os QR e os NFC" titulo="Mesas" frase={INTRODUCAO} />

      <ul className="pn-numeros">
        {blocos.map(({ titulo, total, nota }) => (
          <li key={titulo} className="pn-bloco">
            <span className="pn-olho">{titulo}</span>
            <span className="pn-numero">{total}</span>
            <span className="pn-texto-suave">{nota}</span>
          </li>
        ))}
      </ul>

      <EstatisticaDasMesas
        leituras={dados.leituras}
        horas={dados.horas}
        ultimas={dados.ultimas}
        hoje={dados.hoje}
      />
    </main>
  );
}
