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
  — a mesma barra do site. O logótipo é um PNG com o fundo escuro já pintado
  (`public/marca/email.png`, 360 px para ecrãs de alta densidade, mostrado a
  180): o Outlook não lê WebP, e um PNG transparente fica dourado sobre branco
  nos clientes que inventam o fundo.

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
  /** "Café Preguiça · R. José Joaquim Ribeiro Teles, 560 · Ermesinde" */
  remetente: string;
  /** O link de cancelar. No envio a sério é a `MARCA_DO_CANCELAMENTO`; no teste
      e na pré-visualização não há pessoa a quem cancelar, e aponta ao site. */
  cancelar: string;
};

/** Onde está o logótipo do email, a partir da raiz do site. */
export const CAMINHO_DO_LOGO = "/marca/email.png";

/**
 * O email inteiro, em tabelas e estilos em linha — é a única forma de o Outlook
 * o mostrar como os outros o mostram.
 */
export function emailEmHtml(assunto: string, texto: string, moldura: Moldura): string {
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
    moldura.cancelar === MARCA_DO_CANCELAMENTO ? moldura.cancelar : escapar(moldura.cancelar);

  return `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapar(assunto)}</title>
</head>
<body style="margin:0;padding:0;background:${CORES.papel};color:${CORES.tinta};font-family:Georgia,'Times New Roman',serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CORES.papel}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${CORES.folha}">
<tr><td align="center" style="padding:24px 28px;background:${CORES.escuro};border-bottom:3px solid ${CORES.fio}"><img src="${escapar(moldura.logo)}" width="180" height="112" alt="Café Preguiça" style="display:block;border:0;outline:none;width:180px;height:auto;color:${CORES.fio};font-family:Georgia,serif;font-size:22px"></td></tr>
<tr><td style="padding:28px 28px 12px;font-size:26px;line-height:1.2;color:${CORES.tinta}">${escapar(assunto)}</td></tr>
<tr><td style="padding:12px 28px;font-family:Helvetica,Arial,sans-serif;color:${CORES.tinta}">${corpo}</td></tr>
<tr><td style="padding:16px 28px 28px;border-top:1px solid #e4d8c6;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${CORES.suave}">
${escapar(moldura.remetente)}<br>
Recebe este email porque se inscreveu na newsletter no site da casa.
<a href="${cancelar}" style="color:${CORES.suave};text-decoration:underline">Cancelar a inscrição</a>.
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
export function emailEmTexto(texto: string, moldura: Moldura): string {
  return [
    ...paragrafos(texto).map((p) => p.replace(/\*\*(.+?)\*\*/g, "$1")),
    "—",
    moldura.remetente,
    `Recebe este email porque se inscreveu na newsletter no site da casa. Cancelar a inscrição: ${moldura.cancelar}`,
  ].join("\n\n");
}
