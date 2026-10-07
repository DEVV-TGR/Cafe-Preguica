/*
  Depois do `npm run build`: nada do que é do servidor foi parar ao browser.

  O `server-only` já faz o build rebentar se um módulo marcado for importado
  por um componente do browser, mas só protege os ficheiros que se lembraram
  de o importar. Isto olha para o **resultado** — o JavaScript em
  `.next/static` e o HTML e RSC que o build pré-gerou — e procura três coisas:

  1. **Valores de segredos.** O CI faz o build com valores sentinela nas
     variáveis sensíveis (ver `.github/workflows/ci.yml`). O build não as lê,
     e é isso que se prova: se uma aparecer aqui, alguém a pôs num sítio
     onde o Next a embute.
  2. **Código que só o servidor pode ter** — os endereços das APIs que usam
     chaves, os nomes das variáveis e a chave do segredo no Redis. Um destes no
     browser quer dizer que um módulo do painel foi parar ao cliente.
  3. **A carta secreta.** Os artigos da lista `secretos` do `ementa.json` só
     podem sair da `/api/carta-secreta`. Um componente do browser que importe
     um valor de `data/ementa.ts` mete a carta inteira no JavaScript da
     `/ementa` — já aconteceu, ver `docs/NEWSLETTER.md`.

  Nunca imprime o valor de um segredo encontrado: só o nome da variável e o
  ficheiro.
*/
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const RAIZ = new URL("..", import.meta.url).pathname;
const NEXT = join(RAIZ, ".next");

if (!existsSync(NEXT)) {
  console.error("✖ Falta o .next — correr `npm run build` primeiro.");
  process.exit(1);
}

function ficheiros(pasta, aceitar) {
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return ficheiros(caminho, aceitar);
    return aceitar(caminho) ? [caminho] : [];
  });
}

/* O que o browser pode receber: os pedaços de JavaScript e CSS, e o HTML e
   RSC das páginas pré-geradas. */
const PUBLICOS = [
  ...ficheiros(join(NEXT, "static"), () => true),
  ...ficheiros(join(NEXT, "server", "app"), (c) => /\.(html|rsc|body)$/.test(c)),
];

const SENSIVEIS = [
  "PAINEL_GITHUB_TOKEN",
  "RESEND_API_KEY",
  "RESEND_NEWSLETTER_API_KEY",
  "UPSTASH_REDIS_REST_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "KV_REST_API_TOKEN",
  "KV_REST_API_URL",
  /* Não são chaves, mas também não são do browser: o segmento é o endereço da
     lista de contactos no Resend, e os remetentes dizem que conta envia. */
  "RESEND_NEWSLETTER_SEGMENTO",
  "RESEND_REMETENTE",
  "RESEND_NEWSLETTER_REMETENTE",
];

/* Quem entra no painel: dados pessoais, e a lista que o ecrã de entrada se
   esforça por não revelar. Procura-se cada endereço à parte. */
const EMAILS_DO_PAINEL = (process.env.PAINEL_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter((e) => e.length >= 8);

const SO_DO_SERVIDOR = [
  "api.github.com",
  "api.resend.com",
  "painel:segredo",
  ...SENSIVEIS,
];

const ementa = JSON.parse(readFileSync(join(RAIZ, "src/data/ementa.json"), "utf8"));
const porId = new Map(ementa.artigos.map((a) => [a.id, a]));
/*
  Os nomes da carta secreta procuram-se como palavra inteira, e não como
  pedaço de texto: o "Hurricane" secreto não pode ser apanhado dentro do
  "Virgin Hurricane", que é um mocktail à vista na ementa. Foi o que pôs este
  passo vermelho quando o painel mandou o Hurricane para a carta secreta.
  "Palavra inteira" quer dizer sem letra ou algarismo logo a seguir, e sem
  outra palavra imediatamente antes (letra, ou letra e um espaço ou hífen) —
  ">Hurricane · 6,20 €<" e "\"Hurricane\"" contam; "Virgin Hurricane" não.
*/
const escapar = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const comoPalavra = (texto) =>
  new RegExp(`(?<![\\p{L}\\p{N}][ -]?)${escapar(texto)}(?![\\p{L}\\p{N}])`, "u");
const SECRETOS = (ementa.secretos ?? []).flatMap((id) => {
  const artigo = porId.get(id);
  return artigo
    ? Object.values(artigo.nome).map((nome) => ({ id, nome, padrao: comoPalavra(nome) }))
    : [];
});

const problemas = [];
const relativo = (c) => c.slice(RAIZ.length);

for (const caminho of PUBLICOS) {
  const texto = readFileSync(caminho, "utf8");

  for (const nome of SENSIVEIS) {
    const valor = process.env[nome];
    if (valor && valor.length >= 8 && texto.includes(valor)) {
      problemas.push(`o valor de ${nome} está em ${relativo(caminho)}`);
    }
  }

  for (const email of EMAILS_DO_PAINEL) {
    if (texto.includes(email)) problemas.push(`um endereço de PAINEL_EMAILS está em ${relativo(caminho)}`);
  }

  for (const marca of SO_DO_SERVIDOR) {
    if (texto.includes(marca)) problemas.push(`"${marca}" está em ${relativo(caminho)}`);
  }

  for (const { id, padrao } of SECRETOS) {
    if (padrao.test(texto)) {
      problemas.push(`o artigo secreto "${id}" está em ${relativo(caminho)}`);
    }
  }
}

if (problemas.length) {
  console.error("✖ Há coisas do servidor no que vai para o browser:");
  for (const p of problemas) console.error(`  - ${p}`);
  process.exit(1);
}

const sentinelas = SENSIVEIS.filter((n) => process.env[n]).length + EMAILS_DO_PAINEL.length;
console.log(
  `✓ ${PUBLICOS.length} ficheiros públicos sem segredos (${sentinelas} valores procurados), ` +
    `sem código do servidor e sem os ${SECRETOS.length} nomes da carta secreta.`,
);
