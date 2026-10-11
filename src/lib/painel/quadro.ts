/*
  As contas do ecrã inicial do painel — o quadro com os cartões.

  Puras e sem `server-only`, para os testes em `testes/` as poderem carregar e
  para a página só ter de ir buscar os dados e passá-los por aqui. Nada disto
  fala com o Redis, com o Resend ou com o relógio: o "agora" chega sempre de
  fora.
*/

const DIA_MS = 24 * 60 * 60 * 1000;
const SEMANA_MS = 7 * DIA_MS;

/*
  `rafael.silva@…` → "Rafael". É o "Bem-vindo de volta" do topo, e não há
  outro nome a que ir: a lista do painel são emails e mais nada (ver
  `lib/painel/utilizadores.ts`).
*/
export function nomeDe(email: string): string {
  const primeiro = email.split("@")[0].split(/[._+-]/)[0] ?? "";
  return primeiro ? primeiro.charAt(0).toUpperCase() + primeiro.slice(1) : email;
}

/* `rafael.silva@…` → "RS"; `tomas@…` → "T". Para os avatares, que não têm
   fotografia — o painel não guarda nenhuma. */
export function iniciais(email: string): string {
  const partes = email.split("@")[0].split(/[._+-]/).filter(Boolean);
  return partes
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

/*
  Os inscritos ao fim de cada uma das últimas `semanas` semanas, da mais antiga
  para a mais recente — a linha que sobe no cartão da newsletter.

  Conta quem está inscrito **hoje** e se inscreveu até ao fim dessa semana. Quem
  cancelou não conta em semana nenhuma, porque o Resend não diz quando
  cancelou: com isso, a linha nunca desce, e o último ponto é sempre igual ao
  número grande do cartão — que é o que se lê primeiro.
*/
export function inscritosPorSemana(
  contactos: { criadoEm: string; cancelou: boolean }[],
  agora: number,
  semanas = 8,
): number[] {
  const desde = contactos
    .filter((c) => !c.cancelou)
    .map((c) => Date.parse(c.criadoEm))
    .filter(Number.isFinite);

  return Array.from({ length: semanas }, (_, i) => {
    const fim = agora - (semanas - 1 - i) * SEMANA_MS;
    return desde.filter((t) => t <= fim).length;
  });
}

/** Quantos dos inscritos de hoje se inscreveram nos últimos 30 dias. */
export function novosNoMes(contactos: { criadoEm: string; cancelou: boolean }[], agora: number): number {
  return contactos.filter((c) => !c.cancelou && Date.parse(c.criadoEm) > agora - 30 * DIA_MS).length;
}

/*
  O topo do eixo do gráfico das mesas, arredondado para um número "redondo"
  (1, 2, 5, 10, 20, 50…), e as quatro marcas até lá. Sem isto, uma noite de 37
  leituras dava um eixo que acabava em 37 e marcas em 9,25.
*/
export function escala(maximo: number): { topo: number; marcas: number[] } {
  if (maximo <= 0) return { topo: 4, marcas: [0, 1, 2, 3, 4] };

  const passoBruto = maximo / 4;
  const ordem = 10 ** Math.floor(Math.log10(passoBruto));
  const passo = ([1, 2, 5, 10].find((m) => m * ordem >= passoBruto) ?? 10) * ordem;
  const topo = passo * 4;
  return { topo, marcas: [0, 1, 2, 3, 4].map((i) => i * passo) };
}

/*
  Um caminho SVG suave a passar pelos pontos — a linha ondulada do cartão da
  newsletter. Curvas de Bézier com as alças a meio caminho na horizontal, que
  é o que faz a linha ondular sem passar acima nem abaixo dos pontos.

  `largura` × `altura` é a caixa do SVG; o ponto mais alto fica a 15% do topo,
  para a linha não colar à borda.
*/
export function linhaSuave(valores: number[], largura: number, altura: number): string {
  if (valores.length === 0) return "";
  const maior = Math.max(...valores);
  const menor = Math.min(...valores);
  const amplitude = maior - menor || 1;
  const pontos = valores.map((v, i) => ({
    x: valores.length === 1 ? largura / 2 : (i / (valores.length - 1)) * largura,
    /* Tudo igual (uma lista nova, ou parada): a linha fica a meia altura. */
    y: maior === menor ? altura * 0.55 : altura * 0.15 + (1 - (v - menor) / amplitude) * altura * 0.7,
  }));

  const arred = (n: number) => Math.round(n * 10) / 10;
  let d = `M${arred(pontos[0].x)} ${arred(pontos[0].y)}`;
  for (let i = 1; i < pontos.length; i++) {
    const a = pontos[i - 1];
    const b = pontos[i];
    const meio = (a.x + b.x) / 2;
    d += ` C${arred(meio)} ${arred(a.y)} ${arred(meio)} ${arred(b.y)} ${arred(b.x)} ${arred(b.y)}`;
  }
  return d;
}
