import "server-only";
import { headers } from "next/headers";
import { empurrarNaLista, lerLista } from "./redis";

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

  ## Quanto tempo

  As últimas `MAXIMO` linhas, numa lista do Redis que se corta sozinha
  (`empurrarNaLista`). Para duas pessoas, que com o aparelho lembrado entram
  sem código durante 30 dias, são meses de histórico.

  ## Anotar nunca impede ninguém de entrar

  Se o armazenamento falhar a meio de anotar, quem estava a entrar entra na
  mesma: o registo é para consultar, não é um trinco. A falha fica no registo
  da Vercel.
*/

const CHAVE = "painel:entradas";
const MAXIMO = 300;
const PRAZO_S = 365 * 24 * 60 * 60;

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
    await empurrarNaLista(CHAVE, JSON.stringify(entrada), MAXIMO, PRAZO_S);
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
  return (await lerLista(CHAVE, MAXIMO))
    .flatMap((linha) => {
      try {
        return [JSON.parse(linha) as Entrada];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.quando - a.quando);
}
