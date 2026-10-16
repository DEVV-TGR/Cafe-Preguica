import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { exigirSessao } from "@/lib/painel/porta";
import { esquecerEsteAparelho } from "../accoes";
import { todos } from "@/lib/painel/utilizadores";
import { ErroDoRedis } from "@/lib/painel/redis";
import { ultimasEntradas, type Como, type Entrada } from "@/lib/painel/entradas";
import { resumoDasLeituras } from "@/lib/mesas/leituras";
import { noiteDeServico, type Resumo } from "@/lib/mesas/contas";
import { listarContactos, ErroDaNewsletter, type Contacto } from "@/lib/newsletter/resend";
import {
  inscritosPorSemana,
  iniciais,
  linhaSuave,
  nomeDe,
  novosNoMes,
} from "@/lib/painel/quadro";
import { artigos, artigosDaCartaSecreta, CARTA_CONFIRMADA, contarCocktails, porCapitulo } from "@/data/ementa";
import { cafe, DIAS } from "@/data/cafe";
import { Icone, type NomeDoIcone } from "@/components/painel/Icone";
import { GraficoDasMesas } from "@/components/painel/GraficoDasMesas";

/**
 * O quadro: o ecrã inicial do painel, com um cartão por secção.
 *
 * Desenhado a partir de um painel de finanças que o Tomás mostrou
 * (2026-10-11), com a mesma disposição e as cores da casa. Onde lá estava
 * dinheiro, aqui está o que a casa quer saber de relance:
 *
 * - o cartão de crédito é **a carta** (artigos, capítulos, se está confirmada);
 * - o "engagement rate" são **as leituras dos QR e NFC das mesas**;
 * - o saldo que sobe são **os inscritos na newsletter**;
 * - o histórico de pagamentos são **as últimas sessões**;
 * - o crédito é **o horário de hoje**, e os pagamentos com avatares são
 *   **quem tem acesso**.
 *
 * ## Cada cartão falha sozinho
 *
 * Três fontes — o Redis das mesas e das sessões, e o Resend da newsletter — e
 * nenhuma pode deitar abaixo o quadro inteiro. Pede-se tudo ao mesmo tempo
 * (`allSettled`), e um cartão sem dados diz porquê, no sítio dele.
 *
 * `exigirSessao()` aqui e não no layout — ver o comentário do `layout.tsx`
 * sobre um layout não ser fronteira de segurança.
 */

/* As leituras, os contactos e as sessões, e a hora a que foram lidos — o
   "agora" do "Hoje" e do horário. Fora do componente, que não lê o relógio. */
async function lerQuadro() {
  const [mesas, contactos, sessoes] = await Promise.allSettled([
    resumoDasLeituras(),
    listarContactos(),
    ultimasEntradas(),
  ]);
  return { mesas, contactos, sessoes, agora: Date.now() };
}

function porqueFalhou(erro: unknown, generico: string): string {
  if (erro instanceof ErroDoRedis || erro instanceof ErroDaNewsletter) return erro.paraOEcra;
  return generico;
}

const FUSO = "Europe/Lisbon";
const HOJE = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", timeZone: FUSO });
const DIA = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", timeZone: FUSO });
const HORA = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: FUSO });
const NOME_DO_DIA = new Intl.DateTimeFormat("pt-PT", { weekday: "long", timeZone: "UTC" });
const NUMERO = new Intl.NumberFormat("pt-PT");

const O_QUE: Record<Como, string> = {
  codigo: "Com o código",
  aparelho: "Pelo aparelho",
  saiu: "Saiu",
  esqueceu: "Esqueceu o aparelho",
  terminada: "Sessão terminada",
};

/** A cabeça de cada cartão: título, subtítulo e a seta para a secção. */
function Topo({
  titulo,
  sub,
  href,
  icone,
  extra,
}: {
  titulo: string;
  sub?: string;
  href?: string;
  icone?: NomeDoIcone;
  extra?: ReactNode;
}) {
  return (
    <div className="pn-bloco__topo">
      <div className="pn-bloco__nome">
        <h2 className="pn-bloco__titulo">
          {icone ? (
            <span className="pn-bloco__icone">
              <Icone nome={icone} tamanho={18} />
            </span>
          ) : null}
          {titulo}
        </h2>
        {sub ? <p className="pn-bloco__sub">{sub}</p> : null}
      </div>
      {extra}
      {href ? (
        <Link href={href} className="pn-seta" aria-label={`Abrir ${titulo}`}>
          <Icone nome="seta" tamanho={16} />
        </Link>
      ) : null}
    </div>
  );
}

export default async function Painel() {
  const { email } = await exigirSessao();
  const { mesas, contactos, sessoes, agora } = await lerQuadro();

  /* ---------------------------------------------------------- a carta -- */
  const visiveis = artigos.filter((a) => !a.escondido).length;
  const escondidos = artigos.length - visiveis;
  const capitulos = porCapitulo().length;
  const cocktails = contarCocktails().total;
  const secretos = artigosDaCartaSecreta().length;

  /* ------------------------------------------------------- a newsletter -- */
  const lista: Contacto[] | null = contactos.status === "fulfilled" ? contactos.value : null;
  const inscritos = lista ? lista.filter((c) => !c.cancelou).length : 0;
  const serie = lista ? inscritosPorSemana(lista, agora) : [];
  const novos = lista ? novosNoMes(lista, agora) : 0;

  /* ------------------------------------------------------- hoje na casa -- */
  /* A noite de serviço, e não o dia do calendário: à 01:00 de sábado ainda é
     a noite de sexta, e é o horário de sexta que interessa. */
  const noite = noiteDeServico(new Date(agora));
  const diaDaNoite = DIAS[(new Date(`${noite}T00:00:00Z`).getUTCDay() + 6) % 7];
  const horario = cafe.horarios ? cafe.horarios[diaDaNoite] : undefined;

  /* ------------------------------------------------------------ pessoas -- */
  const pessoas = todos();
  const entradas: Entrada[] | null = sessoes.status === "fulfilled" ? sessoes.value : null;

  return (
    <>
      <div className="pn-quadro">
        <main className="pn-quadro__principal">
          <div className="pn-boas-vindas">
            <h1 className="pn-boas-vindas__frase">
              <strong>Bem-vindo de volta,</strong> {nomeDe(email)}
            </h1>
            <div className="pn-boas-vindas__accoes">
              <span className="pn-pastilha">
                <Icone nome="calendario" tamanho={16} />
                {HOJE.format(agora)}
              </span>
              <Link href="/painel/newsletter#escrever" className="pn-pastilha pn-pastilha--forte">
                <Icone nome="mais" tamanho={16} />
                Nova newsletter
              </Link>
            </div>
          </div>

          <div className="pn-grelha">
            {/* ------------------------------------------------ A CARTA */}
            <section className="pn-bloco pn-grelha__carta">
              <Topo titulo="A carta" sub="O que está na ementa agora" href="/painel/ementa" />
              <Link href="/painel/ementa" className="pn-cartao-da-carta">
                <span className="pn-cartao-da-carta__cima">
                  <span className="pn-cartao-da-carta__marca">Café Preguiça</span>
                  <Icone nome="nfc" tamanho={20} />
                </span>
                <span className="pn-cartao-da-carta__rotulo">Artigos na carta</span>
                <span className="pn-cartao-da-carta__numero">{NUMERO.format(visiveis)}</span>
                <span className="pn-cartao-da-carta__baixo">
                  <span>•••• {capitulos} capítulos</span>
                  <span>{CARTA_CONFIRMADA ? "Confirmada" : "Provisória"}</span>
                </span>
                <Image
                  src="/marca/preguica.webp"
                  alt=""
                  width={325}
                  height={286}
                  className="pn-cartao-da-carta__preguica"
                />
              </Link>
              <div className="pn-bloco__pe">
                <div>
                  <p className="pn-bloco__sub">Cocktails na carta</p>
                  <p className="pn-bloco__valor">{cocktails}</p>
                </div>
                <span className="pn-selo">
                  {escondidos > 0 ? `${escondidos} escondidos` : `${secretos} secretos`}
                </span>
              </div>
            </section>

            {/* ------------------------------------------------ AS MESAS */}
            <section className="pn-bloco pn-grelha__mesas">
              <Topo titulo="Leituras das mesas" sub="QR e NFC, noite a noite" icone="mesas" href="/painel/mesas" />
              {mesas.status === "fulfilled" ? (
                <>
                  <GraficoDasMesas porNoite={(mesas.value as Resumo).porNoite} />
                  <dl className="pn-numeros-curtos">
                    <div>
                      <dt>Últimas 7 noites</dt>
                      <dd>{NUMERO.format(mesas.value.semana)}</dd>
                    </div>
                    <div>
                      <dt>Últimas 30</dt>
                      <dd>{NUMERO.format(mesas.value.mes)}</dd>
                    </div>
                    <div>
                      <dt>Desde o início</dt>
                      <dd>{NUMERO.format(mesas.value.sempre)}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="pn-bloco__falha">
                  {porqueFalhou(mesas.reason, "Não foi possível ir buscar as leituras das mesas.")}
                </p>
              )}
            </section>

            {/* ------------------------------------------- A NEWSLETTER */}
            <section className="pn-bloco pn-grelha__newsletter">
              <Topo titulo="Newsletter" sub="Quem recebe os emails da casa" href="/painel/newsletter" />
              {lista ? (
                <>
                  <div className="pn-saldo">
                    <p className="pn-bloco__sub">Inscritos</p>
                    <p className="pn-saldo__numero">{NUMERO.format(inscritos)}</p>
                    <p className="pn-nota">
                      {novos > 0 ? `+${novos} nos últimos 30 dias` : "Sem inscrições novas nos últimos 30 dias"}
                    </p>
                  </div>
                  <svg className="pn-onda" viewBox="0 0 300 110" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <linearGradient id="pn-onda-fundo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="var(--color-ouro)" stopOpacity="0.32" />
                        <stop offset="1" stopColor="var(--color-ouro)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={`${linhaSuave(serie, 300, 110)} L300 110 L0 110 Z`} fill="url(#pn-onda-fundo)" />
                    <path d={linhaSuave(serie, 300, 110)} fill="none" stroke="var(--color-ouro)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <p className="pn-so-leitor">
                    Nas últimas 8 semanas, os inscritos passaram de {serie[0]} para {serie.at(-1)}.
                  </p>
                </>
              ) : (
                <p className="pn-bloco__falha">
                  {porqueFalhou(contactos.status === "rejected" ? contactos.reason : null, "Não foi possível ir buscar os inscritos.")}
                </p>
              )}
              <div className="pn-par-de-botoes">
                <Link href="/painel/newsletter#escrever" className="pn-botao-redondo pn-botao-redondo--cheio">
                  Escrever <Icone nome="subir" tamanho={16} />
                </Link>
                <Link href="/painel/newsletter#contactos" className="pn-botao-redondo">
                  Contactos <Icone nome="descer" tamanho={16} />
                </Link>
              </div>
            </section>

            {/* ---------------------------------------------- AS SESSÕES */}
            <section className="pn-bloco pn-grelha__sessoes">
              <Topo titulo="Sessões recentes" sub="Quem entrou no painel" href="/painel/sessoes" />
              {entradas === null ? (
                <p className="pn-bloco__falha">
                  {porqueFalhou(sessoes.status === "rejected" ? sessoes.reason : null, "Não foi possível ir buscar as sessões.")}
                </p>
              ) : entradas.length === 0 ? (
                <p className="pn-texto-suave">Ainda não há nada anotado.</p>
              ) : (
                <div className="pn-tabela__caixa">
                <table className="pn-tabela">
                  <thead>
                    <tr>
                      <th scope="col">Quem</th>
                      <th scope="col" className="pn-tabela__media">Dia</th>
                      <th scope="col">Hora</th>
                      <th scope="col">Como</th>
                      <th scope="col" className="pn-tabela__larga">Aparelho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entradas.slice(0, 6).map((e) => (
                      <tr key={`${e.quando}-${e.email}-${e.como}`}>
                        <td>
                          <span className="pn-pessoa">
                            <span className="pn-avatar" aria-hidden="true">
                              {iniciais(e.email)}
                            </span>
                            <span className="pn-pessoa__nome">
                              {nomeDe(e.email)}
                              {e.email === email ? <span className="pn-pessoa__tu"> · tu</span> : null}
                            </span>
                          </span>
                        </td>
                        <td className="pn-tabela__media">{DIA.format(e.quando)}</td>
                        <td>{HORA.format(e.quando)}</td>
                        <td>
                          <span className="pn-estado" data-como={e.como}>
                            {O_QUE[e.como]}
                          </span>
                        </td>
                        <td className="pn-tabela__larga">{e.aparelho}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </section>

            {/* --------------------------------------------- HOJE NA CASA */}
            <section className="pn-bloco pn-grelha__hoje">
              <Topo
                titulo="Hoje na casa"
                sub={`O horário de ${NOME_DO_DIA.format(new Date(`${noite}T00:00:00Z`))}`}
                icone="casa"
                href="/painel/casa"
              />
              <div className="pn-bloco__pe">
                <p className="pn-bloco__valor pn-bloco__valor--grande">
                  {horario === undefined
                    ? "Por confirmar"
                    : horario === null
                      ? "Encerrado"
                      : `${horario.abre} – ${horario.fecha}`}
                </p>
                {horario?.cozinhaFecha ? <span className="pn-selo">Cozinha até {horario.cozinhaFecha}</span> : null}
              </div>
            </section>

            {/* --------------------------------------- QUEM TEM ACESSO */}
            <section className="pn-bloco pn-grelha__acesso">
              <Topo titulo="Quem tem acesso" sub="Os emails que entram no painel" href="/painel/sessoes" />
              <ul className="pn-avatares">
                {pessoas.slice(0, 4).map((p) => (
                  <li key={p.email} className="pn-avatar pn-avatar--grande" title={p.email}>
                    {iniciais(p.email)}
                  </li>
                ))}
                {pessoas.length > 4 ? (
                  <li className="pn-avatar pn-avatar--grande pn-avatar--mais">+{pessoas.length - 4}</li>
                ) : null}
              </ul>
              <p className="pn-nota">{pessoas.map((p) => nomeDe(p.email)).join(", ")}</p>
            </section>
          </div>

          {/* O aviso que evita o telefonema: uma alteração aqui é um commit e uma
              reconstrução do site, não uma escrita que aparece no instante
              seguinte. Quem não souber disto recarrega, não vê nada mudar, e
              conclui que se perdeu. */}
          <p className="pn-nota pn-quadro__aviso">
            O que se muda no painel não aparece no site logo a seguir. Cada publicação reconstrói o
            site, e isso costuma demorar <strong className="pn-forte">1 a 2 minutos</strong>.
          </p>

          {/* Se quem entrou pediu para lembrar este aparelho, ele não pede o código
              durante 30 dias. Quem emprestou o telemóvel precisa de uma forma de
              desfazer isso — aqui, e não escondida numa página de definições que o
              painel não tem. Sem aparelho lembrado, o botão apaga só a sessão. */}
          <form action={esquecerEsteAparelho} className="pn-quadro__esquecer">
            <button type="submit" className="pn-ligacao">
              <Icone nome="aparelho" tamanho={16} /> Esquecer este aparelho
            </button>
            <p className="pn-nota">
              Se pediste para lembrar este telemóvel ou computador, ele não volta a pedir o código
              durante 30 dias. Se não for teu, ou se o emprestaste, carrega aqui — sais, o cookie do
              aparelho é apagado, e da próxima vez o código é pedido outra vez.
            </p>
          </form>
        </main>
      </div>
    </>
  );
}
