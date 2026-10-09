/*
  As contas das leituras das mesas — quantas vezes a carta foi aberta pelo QR
  ou pelo NFC de cada mesa, em cada noite.

  ## O que se guarda, e o que não

  Um número por noite, por mesa e por origem, num hash do Redis
  (`CHAVE_DAS_LEITURAS`), com campos `2026-10-09|qr|7`. **Nada sobre quem lê:**
  nem IP, nem telemóvel, nem cookie. Não dá para saber se foram quatro pessoas
  ou a mesma quatro vezes, e é de propósito — para medir a adesão aos QR chega,
  e um contador que não sabe quem é ninguém não precisa de consentimento.

  ## A noite de serviço, e não o dia do calendário

  A casa abre às 16:00 e fecha à 01:30. Uma leitura à meia-noite e meia é da
  mesma noite que uma às 23:00, e contá-la no dia seguinte partia cada sexta em
  duas. Por isso a noite muda às 06:00 de Lisboa, e não à meia-noite.

  Sem `server-only` e sem imports, como o `rede.ts`: é o que deixa os testes de
  `testes/` carregá-lo com o `node --test`.
*/

export const CHAVE_DAS_LEITURAS = "mesas:leituras";

export type Origem = "qr" | "nfc";
export const ORIGENS: readonly Origem[] = ["qr", "nfc"];

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

export function campoDaLeitura(noite: string, origem: Origem, mesa: number): string {
  return `${noite}|${origem}|${mesa}`;
}

type Leitura = { noite: string; origem: Origem; mesa: number; total: number };

function lerCampos(hash: Record<string, number>): Leitura[] {
  const leituras: Leitura[] = [];
  for (const [campo, total] of Object.entries(hash)) {
    const [noite, origem, mesa] = campo.split("|");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(noite) || !ORIGENS.includes(origem as Origem)) continue;
    if (!Number.isFinite(total) || mesaValida(mesa) === null) continue;
    leituras.push({ noite, origem: origem as Origem, mesa: Number(mesa), total });
  }
  return leituras;
}

export type PorOrigem = Record<Origem, number>;

export type Resumo = {
  semana: PorOrigem;
  mes: PorOrigem;
  sempre: PorOrigem;
  /** As últimas `NOITES_A_MOSTRAR` noites, da mais recente para trás, com as vazias. */
  porNoite: ({ noite: string } & PorOrigem)[];
  /** As mesas lidas nas últimas 30 noites, por número. */
  porMesa: ({ mesa: number } & PorOrigem)[];
};

export const NOITES_A_MOSTRAR = 14;

const zero = (): PorOrigem => ({ qr: 0, nfc: 0 });

export function resumir(hash: Record<string, number>, hoje: string): Resumo {
  const inicioSemana = noiteAntes(hoje, 6);
  const inicioMes = noiteAntes(hoje, 29);

  const semana = zero();
  const mes = zero();
  const sempre = zero();
  const noites = new Map<string, PorOrigem>();
  const mesas = new Map<number, PorOrigem>();

  for (const { noite, origem, mesa, total } of lerCampos(hash)) {
    sempre[origem] += total;
    if (noite > hoje) continue;
    if (noite >= inicioSemana) semana[origem] += total;
    if (noite >= inicioMes) {
      mes[origem] += total;
      const daMesa = mesas.get(mesa) ?? zero();
      daMesa[origem] += total;
      mesas.set(mesa, daMesa);
    }
    const daNoite = noites.get(noite) ?? zero();
    daNoite[origem] += total;
    noites.set(noite, daNoite);
  }

  const porNoite = Array.from({ length: NOITES_A_MOSTRAR }, (_, i) => {
    const noite = noiteAntes(hoje, i);
    return { noite, ...(noites.get(noite) ?? zero()) };
  });

  const porMesa = [...mesas.entries()]
    .sort(([a], [b]) => a - b)
    .map(([mesa, contas]) => ({ mesa, ...contas }));

  return { semana, mes, sempre, porNoite, porMesa };
}
