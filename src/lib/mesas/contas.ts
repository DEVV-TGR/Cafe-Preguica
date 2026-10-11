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

/*
  ## A hora, desde 2026-10-12

  O Tomás quis ver a que horas se lê, e cada mesa e cada noite em separado.
  Desde então cada leitura escreve mais duas coisas, sem nada sobre quem lê:

  - `mesas:horas`, campos `noite|mesa|HH` — a hora de Lisboa da leitura;
  - `mesas:ultimas`, uma lista com as últimas `ULTIMAS` leituras, com o
    instante exato e a mesa, para o painel as mostrar com data e hora.

  As leituras de antes só têm a noite: o painel diz desde quando há horas.
*/
export const CHAVE_DAS_HORAS = "mesas:horas";
export const CHAVE_DAS_ULTIMAS = "mesas:ultimas";
export const ULTIMAS = 300;

const HORA_EM_LISBOA = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Lisbon",
  hour: "2-digit",
  hourCycle: "h23",
});

/** `"23"`, `"00"`, `"01"` — a hora de Lisboa, sempre com dois algarismos. */
export function horaEmLisboa(agora: Date): string {
  return HORA_EM_LISBOA.format(agora).padStart(2, "0");
}

export function campoDaHora(noite: string, mesa: number, hora: string): string {
  return `${noite}|${mesa}|${hora}`;
}

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

export type Leitura = { noite: string; mesa: number; total: number };

export function lerCampos(hash: Record<string, number>): Leitura[] {
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

/* ------------------------------------------------- a estatística do painel */

export type LeituraComHora = Leitura & { hora: number };
export type UltimaLeitura = { quando: number; mesa: number };

/** Os campos `noite|mesa|HH` de `mesas:horas`. Os que não tiverem esta forma ficam de fora. */
export function lerHoras(hash: Record<string, number>): LeituraComHora[] {
  const lidas: LeituraComHora[] = [];
  for (const [campo, total] of Object.entries(hash)) {
    const [noite, textoDaMesa, textoDaHora, ...resto] = campo.split("|");
    const mesa = mesaValida(textoDaMesa ?? "");
    const hora = Number(textoDaHora);
    if (resto.length || !/^\d{4}-\d{2}-\d{2}$/.test(noite) || mesa === null) continue;
    if (!/^\d{2}$/.test(textoDaHora ?? "") || hora > 23 || !Number.isFinite(total)) continue;
    lidas.push({ noite, mesa, hora, total });
  }
  return lidas;
}

/** O que o painel escolhe ver: uma mesa (ou todas) e um período. */
export type Filtro = { mesa: number | null; periodo: 7 | 30 | { noite: string } };

/*
  A ordem das horas no gráfico é a da noite de serviço: das 06:00 de um dia às
  05:59 do seguinte, para o fecho depois da meia-noite ficar à direita, onde
  acontece, e não à esquerda, antes da abertura.
*/
const ORDEM_DAS_HORAS = [...Array.from({ length: 18 }, (_, i) => i + 6), 0, 1, 2, 3, 4, 5];

export type Estatistica = {
  total: number;
  /** As noites do período, da mais antiga para a mais recente. */
  noites: string[];
  porNoite: { noite: string; total: number }[];
  /** Só as horas com leituras, alargadas para as 16h–01h quando há poucas. */
  porHora: { hora: number; total: number }[];
  /** Todas as mesas do período, **sem** o filtro da mesa — é o mapa que a escolhe. */
  porMesa: Map<number, number>;
  /** A média por dia da semana, de segunda (0) a domingo (6). */
  porDiaDaSemana: { dia: number; media: number }[];
  ultimas: UltimaLeitura[];
  /** A primeira noite com horas guardadas, ou `null` se ainda não há nenhuma. */
  horasDesde: string | null;
};

export function estatistica(
  dados: { leituras: Leitura[]; horas: LeituraComHora[]; ultimas: UltimaLeitura[] },
  filtro: Filtro,
  hoje: string,
): Estatistica {
  const { periodo } = filtro;
  const noites =
    typeof periodo === "object"
      ? [periodo.noite]
      : Array.from({ length: periodo }, (_, i) => noiteAntes(hoje, periodo - 1 - i));
  const doPeriodo = new Set(noites);
  const daMesa = (mesa: number) => filtro.mesa === null || mesa === filtro.mesa;

  const porNoite = new Map(noites.map((n) => [n, 0]));
  const porMesa = new Map<number, number>();
  let total = 0;
  for (const l of dados.leituras) {
    if (!doPeriodo.has(l.noite)) continue;
    porMesa.set(l.mesa, (porMesa.get(l.mesa) ?? 0) + l.total);
    if (!daMesa(l.mesa)) continue;
    porNoite.set(l.noite, (porNoite.get(l.noite) ?? 0) + l.total);
    total += l.total;
  }

  const porHoraMapa = new Map<number, number>();
  for (const h of dados.horas) {
    if (!doPeriodo.has(h.noite) || !daMesa(h.mesa)) continue;
    porHoraMapa.set(h.hora, (porHoraMapa.get(h.hora) ?? 0) + h.total);
  }
  const indices = [...porHoraMapa.keys()].map((h) => ORDEM_DAS_HORAS.indexOf(h));
  const de = Math.min(ORDEM_DAS_HORAS.indexOf(16), ...indices);
  const ate = Math.max(ORDEM_DAS_HORAS.indexOf(1), ...indices);
  const porHora = ORDEM_DAS_HORAS.slice(de, ate + 1).map((hora) => ({
    hora,
    total: porHoraMapa.get(hora) ?? 0,
  }));

  /* A média de cada dia da semana nas noites do período: soma das leituras
     desse dia a dividir pelas noites desse dia que o período tem. */
  const somas = Array(7).fill(0);
  const quantas = Array(7).fill(0);
  for (const noite of noites) {
    const dia = (new Date(`${noite}T00:00:00Z`).getUTCDay() + 6) % 7;
    somas[dia] += porNoite.get(noite) ?? 0;
    quantas[dia] += 1;
  }
  const porDiaDaSemana = somas.map((soma, dia) => ({
    dia,
    media: quantas[dia] ? soma / quantas[dia] : 0,
  }));

  const ultimas = dados.ultimas.filter(
    (u) => daMesa(u.mesa) && doPeriodo.has(noiteDeServico(new Date(u.quando))),
  );

  const comHoras = dados.horas.map((h) => h.noite).sort();

  return {
    total,
    noites,
    porNoite: noites.map((noite) => ({ noite, total: porNoite.get(noite) ?? 0 })),
    porHora,
    porMesa,
    porDiaDaSemana,
    ultimas,
    horasDesde: comHoras[0] ?? null,
  };
}
