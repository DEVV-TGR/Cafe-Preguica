import "server-only";
import { headers } from "next/headers";
import { apagar, empurrarAte, lerListas } from "./redis";

/*
  Quem entrou no painel, com que email, a que horas e de que aparelho.

  Pedido do Tomás (2026-10-11): ver as sessões como se vê a newsletter ou a
  ementa, numa secção do painel. Escreve-se uma linha a cada entrada — com o
  código ou pelo aparelho lembrado —, a cada saída, a cada "esquecer este
  aparelho" e a cada sessão terminada a partir da página das Sessões.

  ## O que fica, e o que não fica

  O email inteiro, porque é o que a secção existe para mostrar — e quem a vê já
  está na lista. O aparelho fica resumido a duas palavras ("iPhone · Safari"),
  tiradas do `User-Agent`: chega para reconhecer o próprio telemóvel e para
  estranhar um que não se conhece. **O IP não fica.** Diria de onde se entrou,
  o que é mais do que esta lista precisa de saber sobre duas pessoas da casa.

  ## Quanto tempo: 30 dias, contados por linha

  A página de privacidade promete que cada registo de entrada dura 30 dias, no
  máximo — e é o código que o tem de cumprir, não um `EXPIRE` simpático.

  Já foi uma lista só, com as últimas 300 linhas e um prazo de 365 dias **para
  a lista**, renovado a cada escrita (revisão legal de 2026-10-15). Isso não
  garantia nem os 30 dias nem um ano: enquanto alguém entrasse, a lista nunca
  expirava, e a linha mais velha ficava lá até ser empurrada pelo fim.

  Agora há uma lista por dia (UTC), `painel:entradas:<AAAA-MM-DD>`, e cada uma
  leva uma hora de morte absoluta (`PEXPIREAT`): o início desse dia mais 30
  dias. Uma linha escrita às 00:00:01 vive 30 dias menos um segundo; uma escrita
  às 23:59 vive 29 dias e um minuto. Nenhuma passa dos 30, e é o Redis que as
  apaga, quer alguém abra a página das Sessões quer não. Escrever outra vez no
  mesmo dia não mexe na hora.

  O teto de `MAXIMO` linhas continua, por dia e na leitura: é o que a página
  mostra, e um dia anormal (alguém a carregar em "sair" num ciclo) não enche o
  armazenamento.

  ## Anotar nunca impede ninguém de entrar

  Se o armazenamento falhar a meio de anotar, quem estava a entrar entra na
  mesma: o registo é para consultar, não é um trinco. A falha fica no registo
  da Vercel.
*/

const PREFIXO = "painel:entradas:";
/** A lista única de antes — apaga-se à primeira escrita ou leitura deste código. */
const CHAVE_ANTIGA = "painel:entradas";
const MAXIMO = 300;
const DIA_MS = 24 * 60 * 60 * 1000;
export const PRAZO_DAS_ENTRADAS_MS = 30 * DIA_MS;

/** O início (UTC) do dia de `quando`. */
function inicioDoDia(quando: number): number {
  return Math.floor(quando / DIA_MS) * DIA_MS;
}

function chaveDoDia(inicio: number): string {
  return `${PREFIXO}${new Date(inicio).toISOString().slice(0, 10)}`;
}

/* Um `DEL` a uma chave que já não existe não custa nada, e assim não há
   instância nenhuma que se esqueça de o fazer. */
async function apagarAntiga(): Promise<void> {
  await apagar(CHAVE_ANTIGA);
}

export type Como = "codigo" | "aparelho" | "saiu" | "esqueceu" | "terminada";

export type Entrada = {
  /** Milissegundos desde 1970, em UTC; a página converte para a hora de Lisboa. */
  quando: number;
  email: string;
  como: Como;
  aparelho: string;
};

/*
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) … Safari/604.1" →
  "iPhone · Safari".

  A ordem dos testes importa, e é a que já toda a gente aprendeu a usar: o
  Chrome diz que é Safari, o Edge diz que é Chrome, e o iPad em modo
  computador diz que é um Mac. Não se tenta acertar no iPad disfarçado — sem JS
  do lado do browser não há como, e "Mac · Safari" num iPad não engana ninguém
  que o tenha na mão.
*/
export function aparelhoDe(agente: string | null | undefined): string {
  const ua = agente ?? "";
  if (!ua) return "aparelho desconhecido";

  const sistema = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Macintosh|Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux|CrOS/.test(ua)
              ? "Linux"
              : null;

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser\//.test(ua)
      ? "Samsung Internet"
      : /OPR\/|Opera/.test(ua)
        ? "Opera"
        : /Firefox\/|FxiOS\//.test(ua)
          ? "Firefox"
          : /Chrome\/|CriOS\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : null;

  return [sistema, browser].filter(Boolean).join(" · ") || "aparelho desconhecido";
}

/* `aparelho` só vem de fora quando a linha é sobre **outro** aparelho — uma
   sessão terminada a partir deste. Nos outros casos é o deste pedido. */
export async function anotarEntrada(email: string, como: Como, aparelho?: string): Promise<void> {
  try {
    const entrada: Entrada = {
      quando: Date.now(),
      email,
      como,
      aparelho: aparelho ?? aparelhoDe((await headers()).get("user-agent")),
    };
    const inicio = inicioDoDia(entrada.quando);
    await apagarAntiga();
    await empurrarAte(chaveDoDia(inicio), JSON.stringify(entrada), MAXIMO, inicio + PRAZO_DAS_ENTRADAS_MS);
  } catch (erro) {
    console.error(`[painel] não foi possível anotar a entrada (${como}):`, erro);
  }
}

/**
 * As entradas, da mais recente para a mais antiga. Atira se o armazenamento
 * falhar.
 *
 * A lista já vem por essa ordem (cada linha nova entra à cabeça), mas ordena-se
 * pela hora na mesma: duas entradas quase ao mesmo tempo, de dois aparelhos,
 * podem chegar ao Redis trocadas, e a página das Sessões agrupa por dia
 * assumindo a ordem certa.
 */
export async function ultimasEntradas(): Promise<Entrada[]> {
  await apagarAntiga();
  const agora = Date.now();
  const hoje = inicioDoDia(agora);
  /* Os 31 dias que ainda podem ter listas vivas: hoje e os 30 de trás (o de
     há 30 dias só se já tiver morrido, mas perguntar não custa). */
  const dias = Array.from({ length: 31 }, (_, i) => chaveDoDia(hoje - i * DIA_MS));
  return (await lerListas(dias, MAXIMO))
    .flat()
    .flatMap((linha) => {
      try {
        return [JSON.parse(linha) as Entrada];
      } catch {
        return [];
      }
    })
    /* O Redis já as apagou a horas; o filtro é para a página nunca mostrar uma
       que ainda não tenha sido varrida no segundo exacto. */
    .filter((e) => e.quando > agora - PRAZO_DAS_ENTRADAS_MS)
    .sort((a, b) => b.quando - a.quando)
    .slice(0, MAXIMO);
}
