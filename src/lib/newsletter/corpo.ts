/*
  O texto que o Rafael escreve, transformado no email que sai.

  Corre nos dois lados, e é por isso que não importa `server-only`: o painel usa
  isto para a pré-visualização, no browser, e a acção usa isto para o envio, no
  servidor. **A pré-visualização é o email**, e não uma imitação dele — se fossem
  duas funções, mais dia menos dia deixavam de concordar.

  ## O formato é o de uma mensagem, não o de um editor

  Um editor de texto rico era mais uma dependência, mais uma superfície de ataque
  (HTML colado de outro sítio), e um sítio onde o telemóvel costuma sofrer. O que
  entra é texto simples, com três regras que se explicam numa linha cada:

  - uma linha em branco separa parágrafos;
  - `**assim**` fica a negrito;
  - um endereço `https://…` fica clicável.

  Tudo o resto é escapado. Um `<script>` escrito no painel sai como texto.

  ## Porque é que o email é claro e o site é escuro

  Os clientes de email tratam fundos escuros cada um à sua maneira — o Gmail no
  telemóvel inverte as cores, o Outlook ignora metade do CSS. Um fundo papel com
  tinta castanha sobrevive a todos.

  O escuro fica só na faixa do logótipo, lá em cima, com o fio de ouro por baixo
  — a mesma barra do site. **A faixa inteira é uma imagem**
  (`public/marca/email-cabecalho.png`, desenhada por
  `scripts/desenhar-cabecalho-email.mjs`): já foi uma célula com fundo escuro, e
  o Gmail do telemóvel em modo escuro invertia esse fundo para branco, deixando
  só o logótipo preto no meio. Os clientes invertem cores, nunca imagens.

  O `color-scheme: light only` faz o Mail da Apple deixar o email claro em modo
  escuro. O Gmail do telemóvel ignora-o e inverte o papel e a tinta à mesma — isso
  ninguém consegue impedir sem transformar o texto em imagem —, mas a faixa, que
  é o que se estragava, fica igual em todo o lado.

  **A imagem vem do site em produção**, por endereço absoluto, porque um email
  não tem onde ir buscar ficheiros relativos. Consequência: um teste enviado de
  uma pré-visualização mostra o logótipo que estiver no ar, e se o ficheiro
  ainda lá não estiver, sai o texto alternativo.
*/

/** O Resend troca isto, em cada envio, pelo link de cancelar dessa pessoa. */
export const MARCA_DO_CANCELAMENTO = "{{{RESEND_UNSUBSCRIBE_URL}}}";

const CORES = {
  papel: "#f2e9dc",
  folha: "#fbf7f1",
  tinta: "#1a100a",
  suave: "#6b5a48",
  /* O ouro da marca não passa o contraste como texto sobre papel; este é o
     mesmo tom escurecido até ~5:1, e só se usa nos links. */
  ligacao: "#7a5d0c",
  fio: "#c9a227",
  /* O canvas do site — o mesmo com que o PNG do logótipo foi achatado, para a
     imagem e a faixa não se verem como dois castanhos diferentes. */
  escuro: "#0b0806",
};

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/*
  Depois de escapar, e não antes: assim o `**` e o endereço são as únicas coisas
  que alguma vez viram HTML, e o HTML que produzem está escrito aqui, à mão.

  Pontuação colada ao fim de um endereço fica de fora do link — "vejam em
  https://cafepreguica.pt." é como as pessoas escrevem.
*/
function linha(texto: string): string {
  return escapar(texto)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /https:\/\/[^\s<]+?(?=[.,;:!?)]*(?:\s|$))/g,
      (endereco) =>
        `<a href="${endereco}" style="color:${CORES.ligacao};text-decoration:underline">${endereco}</a>`,
    );
}

export function paragrafos(texto: string): string[] {
  return texto
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** O que envolve o texto: o logótipo em cima, a morada e o cancelar em baixo. */
export type Moldura = {
  /** O endereço do logótipo. Absoluto no email; relativo na pré-visualização do
      painel, que só pode carregar imagens do próprio domínio (CSP). */
  logo: string;
  /** O ícone da DevPlus — absoluto ou relativo, pela mesma razão do `logo`. */
  estudio: string;
  /** "Café Preguiça · R. José Joaquim Ribeiro Teles, 560 · Ermesinde" */
  remetente: string;
  /** O link de cancelar. No envio a sério é a `MARCA_DO_CANCELAMENTO`; no teste
      e na pré-visualização não há pessoa a quem cancelar, e aponta ao site.
      `null` no email de confirmação: quem o recebe ainda não está inscrito, e
      "recebe isto porque se inscreveu" seria falso. */
  cancelar: string | null;
  /** A língua do email (`lang`). A newsletter é só em português; a confirmação
      segue a língua em que a pessoa se inscreveu. */
  lingua?: string;
  /** A assinatura da DevPlus noutra língua. Sem ela, vai a portuguesa. */
  assinatura?: Assinatura;
};

/** "Site feito *sem preguiça nenhuma* pela DevPlus." — o nome do estúdio e o
    ponto final são postos aqui; o resto vem de quem chama. */
export type Assinatura = { antes: string; enfase: string; depois: string };

/** O que só o email de confirmação tem: um título que não é o assunto, o botão,
    e uma nota pequena por baixo dele. */
export type Extras = {
  titulo?: string;
  botao?: { texto: string; endereco: string };
  nota?: string;
};

/** Onde está a faixa do topo do email, a partir da raiz do site. O `email.png`
    antigo fica em `public/marca`: os emails já enviados ainda apontam para ele. */
export const CAMINHO_DO_LOGO = "/marca/email-cabecalho.png";

/** O ícone da DevPlus, para a assinatura do fim. */
export const CAMINHO_DO_ESTUDIO = "/marca/devplus.png";

/*
  A assinatura da DevPlus, no fim de cada email.

  Um trocadilho com o nome da casa, e não o "site desenvolvido por" de sempre:
  quem lê é cliente do bar, não nosso, e uma piada lê-se onde um crédito se
  salta. Sem o contacto de apoio que vai nos emails do painel — um cliente do
  bar com uma dúvida é para a casa, não para nós.
*/
const ESTUDIO = { nome: "DevPlus", url: "https://devplus.pt" };
/* Em código, e não em `messages/`, porque este ficheiro também corre no
   browser do painel, onde a pré-visualização não tem o `next-intl` à mão. A
   confirmação em inglês traz a sua na `Moldura`. */
const ASSINATURA_PT: Assinatura = { antes: "Site feito", enfase: "sem preguiça nenhuma", depois: "pela" };
const LARANJA_DEVPLUS = "#ff780a";

/**
 * O email inteiro, em tabelas e estilos em linha — é a única forma de o Outlook
 * o mostrar como os outros o mostram.
 */
export function emailEmHtml(
  assunto: string,
  texto: string,
  moldura: Moldura,
  extras: Extras = {},
): string {
  const corpo = paragrafos(texto)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6">${p
          .split("\n")
          .map(linha)
          .join("<br>")}</p>`,
    )
    .join("");

  /* A marca do Resend tem chavetas, e escapar não lhe mexe; um endereço
     qualquer passa pelo `escapar` como o resto. */
  const cancelar =
    moldura.cancelar === null || moldura.cancelar === MARCA_DO_CANCELAMENTO
      ? moldura.cancelar
      : escapar(moldura.cancelar);
  const assinatura = moldura.assinatura ?? ASSINATURA_PT;

  /* Um botão em tabela, com a cor na célula e no link: é o que o Outlook
     respeita. Ouro com tinta escura, como o fio por baixo da faixa. */
  const botao = extras.botao
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px"><tr>
<td bgcolor="${CORES.fio}" style="background:${CORES.fio};border-radius:4px"><a href="${escapar(extras.botao.endereco)}" style="display:inline-block;padding:13px 26px;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;line-height:1.2;color:${CORES.escuro};text-decoration:none">${escapar(extras.botao.texto)}</a></td>
</tr></table>`
    : "";
  const nota = extras.nota
    ? `<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:${CORES.suave}">${escapar(extras.nota)}</p>`
    : "";
  const porque =
    cancelar === null
      ? ""
      : `<br>
Recebe este email porque se inscreveu na newsletter no site da casa.
<a href="${cancelar}" style="color:${CORES.suave};text-decoration:underline">Cancelar a inscrição</a>.`;

  return `<!doctype html>
<html lang="${escapar(moldura.lingua ?? "pt-PT")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<style>:root{color-scheme:light only;supported-color-schemes:light only}</style>
<title>${escapar(assunto)}</title>
</head>
<body style="margin:0;padding:0;background:${CORES.papel};color:${CORES.tinta};font-family:Georgia,'Times New Roman',serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CORES.papel}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${CORES.folha}">
<tr><td style="padding:0;background:${CORES.escuro};line-height:0;font-size:0"><img src="${escapar(moldura.logo)}" width="560" alt="Café Preguiça" style="display:block;border:0;outline:none;width:100%;max-width:560px;height:auto;color:${CORES.fio};font-family:Georgia,serif;font-size:22px;line-height:1.4"></td></tr>
<tr><td style="padding:28px 28px 12px;font-size:26px;line-height:1.2;color:${CORES.tinta}">${escapar(extras.titulo ?? assunto)}</td></tr>
<tr><td style="padding:12px 28px;font-family:Helvetica,Arial,sans-serif;color:${CORES.tinta}">${corpo}${botao}${nota}</td></tr>
<tr><td style="padding:16px 28px 28px;border-top:1px solid #e4d8c6;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${CORES.suave}">
${escapar(moldura.remetente)}${porque}
</td></tr>
<tr><td style="padding:18px 28px 24px;background:${CORES.papel};font-family:Helvetica,Arial,sans-serif">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;vertical-align:middle"><a href="${ESTUDIO.url}"><img src="${escapar(moldura.estudio)}" width="32" height="32" alt="${ESTUDIO.nome}" style="display:block;width:32px;height:32px;border:0;border-radius:7px"></a></td>
<td style="vertical-align:middle;font-size:12px;line-height:1.55;color:${CORES.suave}">
${escapar(assinatura.antes)} <em>${escapar(assinatura.enfase)}</em> ${escapar(assinatura.depois)} <a href="${ESTUDIO.url}" style="color:${CORES.tinta};font-weight:bold;text-decoration:none;border-bottom:1px solid ${LARANJA_DEVPLUS}">${ESTUDIO.nome}</a>.
</td>
</tr></table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * A versão só de texto, que vai ao lado da HTML — para quem lê no relógio, e
 * para os filtros de spam, que desconfiam de um email sem ela.
 */
export function emailEmTexto(texto: string, moldura: Moldura, extras: Extras = {}): string {
  const a = moldura.assinatura ?? ASSINATURA_PT;
  return [
    ...paragrafos(texto).map((p) => p.replace(/\*\*(.+?)\*\*/g, "$1")),
    ...(extras.botao ? [`${extras.botao.texto}: ${extras.botao.endereco}`] : []),
    ...(extras.nota ? [extras.nota] : []),
    "—",
    moldura.remetente,
    ...(moldura.cancelar === null
      ? []
      : [`Recebe este email porque se inscreveu na newsletter no site da casa. Cancelar a inscrição: ${moldura.cancelar}`]),
    `${a.antes} ${a.enfase} ${a.depois} ${ESTUDIO.nome} (${ESTUDIO.url}).`,
  ].join("\n\n");
}
