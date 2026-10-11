/*
  As contas das leituras das mesas — quantas vezes a carta foi aberta pelo QR
  ou pelo NFC de cada mesa, em cada noite.

  ## O que se guarda, e o que não

  Um número por noite e por mesa, num hash do Redis (`CHAVE_DAS_LEITURAS`), com
  campos `2026-10-09|7`. **Nada sobre quem lê:** nem IP, nem telemóvel, nem
  cookie. Não dá para saber se foram quatro pessoas ou a mesma quatro vezes, e
  é de propósito — para medir a adesão às mesas chega, e um contador que não
  sabe quem é ninguém não precisa de consentimento.

  ## QR e NFC contam juntos

  O QR e o NFC de cada mesa levam ao mesmo endereço (`/m/<mesa>`), e por isso
  não há como os separar — nem é isso que se quer saber. Nos primeiros dias os
  campos tinham a origem no meio (`2026-10-09|qr|7`); continuam a ser lidos, e
  somam na mesa e na noite deles como os outros.

  ## A noite de serviço, e não o dia do calendário

  A casa abre às 16:00 e fecha à 01:30. Uma leitura à meia-noite e meia é da
  mesma noite que uma às 23:00, e contá-la no dia seguinte partia cada sexta em
  duas. Por isso a noite muda às 06:00 de Lisboa, e não à meia-noite.

  Sem `server-only` e sem imports, como o `rede.ts`: é o que deixa os testes de
  `testes/` carregá-lo com o `node --test`.
*/

export const CHAVE_DAS_LEITURAS = "mesas:leituras";

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;
const VIRAGEM_DA_NOITE_H = 6;

/* `en-CA` porque é o formato que dá `AAAA-MM-DD` sem mais nada. */
const DATA_EM_LISBOA = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Lisbon",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function noiteDeServico(agora: Date): string {
  return DATA_EM_LISBOA.format(new Date(agora.getTime() - VIRAGEM_DA_NOITE_H * HORA_MS));
}

/* A noite `dias` antes de outra. As duas são datas sem hora, por isso a conta
   faz-se em UTC e a mudança da hora de verão não a afeta. */
export function noiteAntes(noite: string, dias: number): string {
  return new Date(Date.parse(`${noite}T00:00:00Z`) - dias * DIA_MS).toISOString().slice(0, 10);
}

/*
  Só números de 1 a 99. Os QR impressos vão da 1 à 22, mas uma mesa nova não
  devia obrigar a mexer aqui. O que não for um número curto não conta: o
  caminho vem de quem faz o pedido, e cada texto diferente seria um campo novo
  no Redis.
*/
export function mesaValida(texto: string): number | null {
  if (!/^\d{1,2}$/.test(texto)) return null;
  const mesa = Number(texto);
  return mesa >= 1 ? mesa : null;
}

/*
  O que abre links sem ser uma pessoa a apontar a câmara: os robôs de pesquisa,
  as pré-visualizações do WhatsApp e companhia quando alguém partilha o link, e
  quem testa com o `curl`. Um pedido sem `User-Agent` também não conta — um
  browser manda-o sempre.
*/
const ROBO =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|slack|discord|curl|wget|python|headless|monitor/i;

export function pareceRobo(userAgent: string | null): boolean {
  return !userAgent || ROBO.test(userAgent);
}

export function campoDaLeitura(noite: string, mesa: number): string {
  return `${noite}|${mesa}`;
}

type Leitura = { noite: string; mesa: number; total: number };

function lerCampos(hash: Record<string, number>): Leitura[] {
  const leituras: Leitura[] = [];
  for (const [campo, total] of Object.entries(hash)) {
    const partes = campo.split("|");
    /* `noite|mesa`, ou o antigo `noite|qr|mesa` / `noite|nfc|mesa`. */
    const valido =
      partes.length === 2 || (partes.length === 3 && (partes[1] === "qr" || partes[1] === "nfc"));
    const noite = partes[0];
    const mesa = mesaValida(partes[partes.length - 1]);
    if (!valido || !/^\d{4}-\d{2}-\d{2}$/.test(noite) || mesa === null) continue;
    if (!Number.isFinite(total)) continue;
    leituras.push({ noite, mesa, total });
  }
  return leituras;
}

export type Resumo = {
  semana: number;
  mes: number;
  sempre: number;
  /** As últimas `NOITES_A_MOSTRAR` noites, da mais recente para trás, com as vazias. */
  porNoite: { noite: string; total: number }[];
  /** As mesas lidas nas últimas 30 noites, por número. */
  porMesa: { mesa: number; total: number }[];
};

export const NOITES_A_MOSTRAR = 14;

export function resumir(hash: Record<string, number>, hoje: string): Resumo {
  const inicioSemana = noiteAntes(hoje, 6);
  const inicioMes = noiteAntes(hoje, 29);

  let semana = 0;
  let mes = 0;
  let sempre = 0;
  const noites = new Map<string, number>();
  const mesas = new Map<number, number>();

  for (const { noite, mesa, total } of lerCampos(hash)) {
    sempre += total;
    if (noite > hoje) continue;
    if (noite >= inicioSemana) semana += total;
    if (noite >= inicioMes) {
      mes += total;
      mesas.set(mesa, (mesas.get(mesa) ?? 0) + total);
    }
    noites.set(noite, (noites.get(noite) ?? 0) + total);
  }

  const porNoite = Array.from({ length: NOITES_A_MOSTRAR }, (_, i) => {
    const noite = noiteAntes(hoje, i);
    return { noite, total: noites.get(noite) ?? 0 };
  });

  const porMesa = [...mesas.entries()]
    .sort(([a], [b]) => a - b)
    .map(([mesa, total]) => ({ mesa, total }));

  return { semana, mes, sempre, porNoite, porMesa };
}
