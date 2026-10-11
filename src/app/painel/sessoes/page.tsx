import { exigirSessao } from "@/lib/painel/porta";
import { ErroDoRedis } from "@/lib/painel/redis";
import { todos } from "@/lib/painel/utilizadores";
import { ultimasEntradas, type Como, type Entrada } from "@/lib/painel/entradas";
import { Cabecalho } from "@/components/painel/Cabecalho";
import { Aviso } from "@/components/painel/Aviso";

/**
 * Quem entrou no painel, com que email, a que horas e de que aparelho.
 *
 * Lido do Redis de cada vez que a página abre, como as Mesas. O que se anota,
 * e o que fica de fora, está em `lib/painel/entradas.ts`.
 */

/* A hora é a de Lisboa, e não a da máquina da Vercel, que está em UTC: uma
   entrada às 23:30 de sábado não pode aparecer como domingo. */
const FUSO = "Europe/Lisbon";
const HORA = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: FUSO });
const DIA = new Intl.DateTimeFormat("pt-PT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: FUSO,
});
/* Só para agrupar: `2026-10-11`, na data de Lisboa. */
const CHAVE_DO_DIA = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO });

const FRASE: Record<Como, string> = {
  codigo: "entrou com o código",
  aparelho: "entrou pelo aparelho lembrado",
  saiu: "saiu",
  esqueceu: "esqueceu o aparelho",
};

function nomeDoDia(quando: number, agora: number): string {
  const dia = CHAVE_DO_DIA.format(quando);
  if (dia === CHAVE_DO_DIA.format(agora)) return "Hoje";
  if (dia === CHAVE_DO_DIA.format(agora - 24 * 60 * 60 * 1000)) return "Ontem";
  const nome = DIA.format(quando);
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

function porDia(entradas: Entrada[], agora: number) {
  const grupos: { dia: string; entradas: Entrada[] }[] = [];
  for (const e of entradas) {
    const dia = nomeDoDia(e.quando, agora);
    const ultimo = grupos.at(-1);
    if (ultimo?.dia === dia) ultimo.entradas.push(e);
    else grupos.push({ dia, entradas: [e] });
  }
  return grupos;
}

/* As entradas e a hora a que foram lidas, que é o "agora" do "Hoje" e do
   "Ontem". Fora do componente porque um componente não deve ler o relógio. */
async function lerSessoes() {
  return { entradas: await ultimasEntradas(), agora: Date.now() };
}

export default async function PaginaDasSessoes() {
  const { email } = await exigirSessao();

  let lidas: Awaited<ReturnType<typeof lerSessoes>>;
  try {
    lidas = await lerSessoes();
  } catch (erro) {
    return (
      <>
        <Cabecalho titulo="Sessões" voltarPara="/painel" quem={email} />
        <main className="pn-principal">
          <Aviso tom="mau">
            {erro instanceof ErroDoRedis ? erro.paraOEcra : "Não foi possível ir buscar as sessões."}
          </Aviso>
        </main>
      </>
    );
  }

  const { entradas, agora } = lidas;
  /* A última entrada de cada pessoa que hoje está na lista — quem saiu do
     `PAINEL_EMAILS` continua no histórico de baixo, mas não aqui. */
  const pessoas = todos().map((u) => ({
    email: u.email,
    ultima: entradas.find((e) => e.email === u.email && (e.como === "codigo" || e.como === "aparelho")),
  }));

  return (
    <>
      <Cabecalho titulo="Sessões" voltarPara="/painel" quem={email} />

      <main className="pn-principal pn-pilha-larga">
        <p className="pn-texto-suave">
          Quem entrou no painel, com que email, a que horas e de que aparelho. O aparelho é o que o
          próprio browser diz que é; se aparecer um que não reconheces, avisa o Tomás.
        </p>

        <section className="pn-pilha">
          <h2 className="pn-seccao__titulo">Última entrada de cada um</h2>
          <ul className="pn-lista">
            {pessoas.map(({ email: de, ultima }) => (
              <li key={de} className="pn-lista__linha">
                <span className="pn-lista__principal">
                  {de}
                  {de === email ? <span className="pn-texto-suave"> (tu)</span> : null}
                </span>
                <span className="pn-lista__lado">
                  {ultima
                    ? `${nomeDoDia(ultima.quando, agora)}, ${HORA.format(ultima.quando)} · ${ultima.aparelho}`
                    : "ainda não entrou"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="pn-pilha">
          <h2 className="pn-seccao__titulo">Tudo o que aconteceu</h2>
          {entradas.length === 0 ? (
            <p className="pn-texto-suave">Ainda não há nada anotado.</p>
          ) : (
            porDia(entradas, agora).map(({ dia, entradas: doDia }) => (
              <div key={dia} className="pn-pilha">
                <p className="pn-olho">{dia}</p>
                <ul className="pn-lista">
                  {doDia.map((e) => (
                    <li key={`${e.quando}-${e.email}-${e.como}`} className="pn-lista__linha">
                      <span className="pn-lista__principal">
                        <strong className="pn-forte pn-sessao__hora">{HORA.format(e.quando)}</strong>{" "}
                        {e.email} <span className="pn-texto-suave">{FRASE[e.como]}</span>
                      </span>
                      <span className="pn-lista__lado">{e.aparelho}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      </main>
    </>
  );
}
