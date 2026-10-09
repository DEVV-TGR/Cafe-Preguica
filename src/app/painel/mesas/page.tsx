import { exigirSessao } from "@/lib/painel/porta";
import { ErroDoRedis } from "@/lib/painel/redis";
import { resumoDasLeituras } from "@/lib/mesas/leituras";
import { NOITES_A_MOSTRAR, type PorOrigem, type Resumo } from "@/lib/mesas/contas";
import { Cabecalho } from "@/components/painel/Cabecalho";
import { Aviso } from "@/components/painel/Aviso";

/**
 * As leituras dos QR e dos NFC das mesas — para saber se as pessoas os usam.
 *
 * Lido do Redis de cada vez que a página abre; ver `lib/mesas/contas.ts` para o
 * que se conta e o que fica de fora.
 */

/* A noite é uma data sem hora; em UTC para o dia da semana não escorregar. */
const NOITE = new Intl.DateTimeFormat("pt-PT", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const nomeDaNoite = (noite: string) => NOITE.format(new Date(`${noite}T00:00:00Z`));

const total = ({ qr, nfc }: PorOrigem) => qr + nfc;

function Divisao({ contas }: { contas: PorOrigem }) {
  return (
    <>
      QR {contas.qr} · NFC {contas.nfc}
    </>
  );
}

function Barra({ valor, maximo }: { valor: number; maximo: number }) {
  return (
    <span className="pn-barra" aria-hidden="true">
      <span style={{ width: `${maximo ? (valor / maximo) * 100 : 0}%` }} />
    </span>
  );
}

export default async function PaginaDasMesas() {
  const { email } = await exigirSessao();

  let resumo: Resumo;
  try {
    resumo = await resumoDasLeituras();
  } catch (erro) {
    return (
      <>
        <Cabecalho titulo="Mesas" voltarPara="/painel" quem={email} />
        <main className="pn-principal">
          <Aviso tom="mau">
            {erro instanceof ErroDoRedis
              ? erro.paraOEcra
              : "Não foi possível ir buscar as leituras das mesas."}
          </Aviso>
        </main>
      </>
    );
  }

  const blocos = [
    { titulo: "Últimas 7 noites", contas: resumo.semana },
    { titulo: "Últimas 30 noites", contas: resumo.mes },
    { titulo: "Desde o início", contas: resumo.sempre },
  ];
  const maximoDaNoite = Math.max(...resumo.porNoite.map(total));
  const maximoDaMesa = Math.max(0, ...resumo.porMesa.map(total));

  return (
    <>
      <Cabecalho titulo="Mesas" voltarPara="/painel" quem={email} />

      <main className="pn-principal pn-pilha-larga">
        <p className="pn-texto-suave">
          Quantas vezes a carta foi aberta pelo QR ou pelo NFC de cada mesa. Conta leituras, não
          pessoas: quatro amigos na mesma mesa contam quatro, e quem ler duas vezes conta duas. A
          noite vai das 06:00 às 06:00, para o fecho depois da meia-noite contar na noite certa.
        </p>

        <ul className="pn-numeros">
          {blocos.map(({ titulo, contas }) => (
            <li key={titulo} className="pn-cartao">
              <span className="pn-olho">{titulo}</span>
              <span className="pn-numero">{total(contas)}</span>
              <span className="pn-texto-suave">
                <Divisao contas={contas} />
              </span>
            </li>
          ))}
        </ul>

        <section aria-labelledby="noites">
          <h2 id="noites" className="pn-seccao__titulo">
            Noite a noite
          </h2>
          <p className="pn-nota">As últimas {NOITES_A_MOSTRAR}, da mais recente para trás.</p>
          <ul className="pn-lista">
            {resumo.porNoite.map((noite) => (
              <li key={noite.noite} className="pn-lista__linha">
                <span className="pn-lista__principal">{nomeDaNoite(noite.noite)}</span>
                <Barra valor={total(noite)} maximo={maximoDaNoite} />
                <span className="pn-lista__lado">
                  <strong className="pn-forte">{total(noite)}</strong> · <Divisao contas={noite} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="por-mesa">
          <h2 id="por-mesa" className="pn-seccao__titulo">
            Por mesa
          </h2>
          <p className="pn-nota">As últimas 30 noites. Uma mesa que não aparece não foi lida.</p>
          {resumo.porMesa.length === 0 ? (
            <p className="pn-texto-suave">Ainda não há leituras.</p>
          ) : (
            <ul className="pn-lista">
              {resumo.porMesa.map((mesa) => (
                <li key={mesa.mesa} className="pn-lista__linha">
                  <span className="pn-lista__principal">Mesa {mesa.mesa}</span>
                  <Barra valor={total(mesa)} maximo={maximoDaMesa} />
                  <span className="pn-lista__lado">
                    <strong className="pn-forte">{total(mesa)}</strong> · <Divisao contas={mesa} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="pn-nota pn-separado">
          O NFC só aparece separado se o autocolante tiver <code>?nfc</code> no fim do endereço
          (por exemplo <code>cafepreguica.pt/m/7?nfc</code>). Sem isso, conta como QR.
        </p>
      </main>
    </>
  );
}
