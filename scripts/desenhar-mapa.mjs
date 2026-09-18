/**
 * Desenha o mapa da secção "Onde estamos" a partir do OpenStreetMap.
 *
 *   npm run mapa            descarrega as ruas e desenha
 *   npm run mapa -- --cache desenha outra vez a partir do que já foi descarregado
 *
 * ## Porque é que o mapa é um SVG nosso e não o Google Maps
 *
 * ⚠️ O `<iframe>` do Google Maps carrega script e cookies da Google em **cada
 * visita**, mesmo de quem nunca olha para o mapa. Obrigava a abrir a CSP, a pôr
 * um banner de consentimento, e fazia `/cookies` e `/privacidade` mentir. E não
 * deixa mudar as cores — para o mapa escuro e dourado era preciso a API de
 * JavaScript, com chave e faturação.
 *
 * Assim, as ruas descarregam-se **uma vez**, aqui, e o site serve um ficheiro
 * seu, pintado com a paleta da casa. Nenhum pedido a terceiros a partir do
 * browser de quem visita. O custo é o mapa não se arrastar nem fazer zoom — e
 * para isso há o botão "Abrir no Google Maps", que é um link normal.
 *
 * ## Licença
 *
 * Os dados são © contribuidores do OpenStreetMap, sob ODbL. **O crédito tem de
 * estar visível junto ao mapa** — está na página, em `inicio.onde.credito`.
 * Tirá-lo não é uma questão de gosto, é uma condição da licença.
 *
 * ## O ponto da casa
 *
 * Vem do OpenStreetMap (o nó `amenity=bar`, "Preguiça", id 9989307898) e bate
 * com o da ficha do Google ao metro. Se a casa mudar de sítio, muda aqui.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";

/* ---------------------------------------------------------- o enquadramento */

const CASA = { lat: 41.2125481, lon: -8.5493786 };

/** Tamanho do desenho em unidades SVG, e quantos metros vale cada uma. */
const LARGURA = 1600;
const ALTURA = 820;
const METROS_POR_UNIDADE = 0.85;

/**
 * Onde a casa fica no desenho. **Não é ao centro**: no ecrã largo o cartão com
 * a morada tapa o terço da esquerda, e o alfinete tem de ficar à vista ao lado
 * dele. O mesmo valor está em `.pg-onde__alfinete`, em `catalogo.css`.
 */
const POSICAO_CASA = { x: 0.64, y: 0.5 };

const M_POR_GRAU_LAT = 111_132;
const M_POR_GRAU_LON = 111_320 * Math.cos((CASA.lat * Math.PI) / 180);

const lonOeste = CASA.lon - (LARGURA * POSICAO_CASA.x * METROS_POR_UNIDADE) / M_POR_GRAU_LON;
const latNorte = CASA.lat + (ALTURA * POSICAO_CASA.y * METROS_POR_UNIDADE) / M_POR_GRAU_LAT;
const lonEste = lonOeste + (LARGURA * METROS_POR_UNIDADE) / M_POR_GRAU_LON;
const latSul = latNorte - (ALTURA * METROS_POR_UNIDADE) / M_POR_GRAU_LAT;

const x = (lon) => ((lon - lonOeste) * M_POR_GRAU_LON) / METROS_POR_UNIDADE;
const y = (lat) => ((latNorte - lat) * M_POR_GRAU_LAT) / METROS_POR_UNIDADE;

/* ------------------------------------------------------------- os dados --- */

const CACHE = "fotos/osm/ermesinde.json";
const DESTINO = "public/mapa/ermesinde.svg";

async function descarregar() {
  // Uma margem à volta, para as ruas não acabarem a direito na borda.
  const m = 0.002;
  const bbox = [latSul - m, lonOeste - m, latNorte + m, lonEste + m].join(",");
  const consulta = `[out:json][timeout:90];
(
  way[highway](${bbox});
  way[building](${bbox});
  way[leisure~"^(park|garden|pitch|playground)$"](${bbox});
  way[landuse~"^(grass|recreation_ground|forest|meadow|cemetery|village_green)$"](${bbox});
  way[natural~"^(water|wood|scrub)$"](${bbox});
  way[waterway](${bbox});
  way[railway=rail](${bbox});
);
out geom;`;
  /* O Overpass é um serviço público e gratuito, e ao fim da tarde responde
     504 com frequência. Tenta-se três vezes em dois servidores antes de
     desistir. */
  const servidores = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ];
  let dados = null;
  for (let tentativa = 0; tentativa < 6 && !dados; tentativa++) {
    const servidor = servidores[tentativa % servidores.length];
    try {
      const resposta = await fetch(servidor, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "cafe-preguica-site (mapa estatico, uma vez)",
        },
        body: new URLSearchParams({ data: consulta }),
      });
      if (!resposta.ok) throw new Error(`respondeu ${resposta.status}`);
      dados = await resposta.json();
    } catch (erro) {
      console.warn(`${servidor}: ${erro.message}; a tentar outra vez…`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  if (!dados) throw new Error("O Overpass não respondeu. Tentar mais tarde.");
  await mkdir("fotos/osm", { recursive: true });
  await writeFile(CACHE, JSON.stringify(dados));
  return dados;
}

const dados = process.argv.includes("--cache")
  ? JSON.parse(await readFile(CACHE, "utf8"))
  : await descarregar();

/* ------------------------------------------------------------ o desenho --- */

const r = (n) => Math.round(n * 10) / 10;
const pontos = (geom) => geom.map((p) => [x(p.lon), y(p.lat)]);
const caminho = (pts, fechar = false) =>
  "M" + pts.map(([a, b]) => `${r(a)} ${r(b)}`).join("L") + (fechar ? "Z" : "");

/** Fora do desenho por completo? Então não vale os bytes. */
const fora = (pts) =>
  pts.every(([a]) => a < -50) || pts.every(([a]) => a > LARGURA + 50) ||
  pts.every(([, b]) => b < -50) || pts.every(([, b]) => b > ALTURA + 50);

/**
 * As classes de rua, da mais importante para a menos. A largura é em unidades
 * do desenho; a cor sai das variáveis em cima do SVG.
 */
const RUAS = [
  { classe: "principal", tipos: ["motorway", "trunk", "primary", "motorway_link", "trunk_link", "primary_link"], largura: 11 },
  { classe: "secundaria", tipos: ["secondary", "secondary_link", "tertiary", "tertiary_link"], largura: 8.5 },
  { classe: "local", tipos: ["residential", "unclassified", "living_street", "road"], largura: 5.5 },
  { classe: "servico", tipos: ["service"], largura: 2.6 },
  { classe: "pe", tipos: ["pedestrian", "footway", "path", "steps", "cycleway", "track"], largura: 1.4 },
];

const camadas = { verde: [], agua: [], predios: [], linha: [] };
const ruas = Object.fromEntries(RUAS.map((c) => [c.classe, []]));
const nomes = [];

for (const el of dados.elements) {
  if (el.type !== "way" || !el.geometry) continue;
  const t = el.tags ?? {};
  const pts = pontos(el.geometry);
  if (fora(pts)) continue;

  if (t.highway) {
    const tipo = RUAS.find((c) => c.tipos.includes(t.highway));
    if (!tipo) continue;
    ruas[tipo.classe].push(caminho(pts));
    if (t.name && ["principal", "secundaria", "local"].includes(tipo.classe)) {
      nomes.push({ nome: t.name, pts, classe: tipo.classe });
    }
  } else if (t.building) {
    camadas.predios.push(caminho(pts, true));
  } else if (t.natural === "water" || t.waterway) {
    (t.waterway ? camadas.linha : camadas.agua).push({ d: caminho(pts, !t.waterway), agua: true });
  } else if (t.railway === "rail") {
    camadas.linha.push({ d: caminho(pts), comboio: true });
  } else {
    camadas.verde.push(caminho(pts, true));
  }
}

/* ------------------------------------------------------------- os nomes --- */

/**
 * Um nome por rua, no troço mais comprido, e só se couber. Nomes a menos de
 * 110 unidades de outro saem: dois rótulos encavalitados lêem-se pior do que
 * nenhum. O texto vai sempre da esquerda para a direita, senão lia-se de
 * cabeça para baixo.
 */
const comprimento = (pts) =>
  pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

/**
 * As avenidas vêm no OpenStreetMap partidas em dezenas de troços curtos, e
 * nenhum sozinho tinha comprimento para o nome — o resultado era um mapa com
 * as travessas todas legendadas e as ruas principais mudas. Por isso os troços
 * com o mesmo nome **encadeiam-se** pelas pontas antes de se medir.
 */
const perto = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1;

function encadear(trocos) {
  const livres = trocos.map((t) => [...t]);
  const cadeias = [];
  while (livres.length) {
    let cadeia = livres.shift();
    for (let juntou = true; juntou; ) {
      juntou = false;
      for (let i = 0; i < livres.length; i++) {
        const t = livres[i];
        const [ini, fim] = [cadeia[0], cadeia[cadeia.length - 1]];
        if (perto(fim, t[0])) cadeia = [...cadeia, ...t.slice(1)];
        else if (perto(fim, t[t.length - 1])) cadeia = [...cadeia, ...[...t].reverse().slice(1)];
        else if (perto(ini, t[t.length - 1])) cadeia = [...t, ...cadeia.slice(1)];
        else if (perto(ini, t[0])) cadeia = [...[...t].reverse(), ...cadeia.slice(1)];
        else continue;
        livres.splice(i, 1);
        juntou = true;
        break;
      }
    }
    cadeias.push(cadeia);
  }
  return cadeias;
}

const agrupados = new Map();
for (const n of nomes) {
  if (!agrupados.has(n.nome)) agrupados.set(n.nome, { classe: n.classe, trocos: [] });
  agrupados.get(n.nome).trocos.push(n.pts);
}

const porNome = new Map();
for (const [nome, { classe, trocos }] of agrupados) {
  // Só a parte dentro do desenho conta para o comprimento e para o meio.
  const dentro = encadear(trocos).map((c) =>
    c.filter(([a, b]) => a > 0 && a < LARGURA && b > 0 && b < ALTURA),
  );
  const maior = dentro.sort((a, b) => comprimento(b) - comprimento(a))[0];
  if (maior && maior.length > 1) porNome.set(nome, { nome, classe, pts: maior, c: comprimento(maior) });
}

const TAMANHO = { principal: 17, secundaria: 16, local: 14 };
const rotulos = [];
const ocupados = [[LARGURA * POSICAO_CASA.x, ALTURA * POSICAO_CASA.y]];

/* As ruas grandes primeiro, e só depois as locais: é por elas que alguém se
   orienta, e se o espaço acabar é uma travessa que fica sem nome. */
const PESO = { principal: 0, secundaria: 1, local: 2 };

/**
 * A rua da casa leva sempre nome, e vai à frente de todas. Como o alfinete
 * está em cima dela, a cadeia parte-se no ponto mais perto da casa e o nome vai
 * para o lado mais comprido — senão ficava escondido debaixo do alfinete.
 */
const RUA_DA_CASA = "Rua José Joaquim Ribeiro Teles";
const daCasa = porNome.get(RUA_DA_CASA);
if (daCasa) {
  const [cx, cy] = [LARGURA * POSICAO_CASA.x, ALTURA * POSICAO_CASA.y];
  const dist = daCasa.pts.map(([a, b]) => Math.hypot(a - cx, b - cy));
  const i = dist.indexOf(Math.min(...dist));
  const lados = [daCasa.pts.slice(0, i + 1), daCasa.pts.slice(i)];
  const lado = lados.sort((a, b) => comprimento(b) - comprimento(a))[0];
  // Afasta o rótulo do alfinete: começa a 70 unidades da casa.
  const longe = lado.filter(([a, b]) => Math.hypot(a - cx, b - cy) > 70);
  // O troço da casa é curto (uns 250 m no desenho), e o nome por extenso não
  // cabia: vai abreviado e um ponto mais pequeno, como na placa da rua.
  porNome.set(RUA_DA_CASA, {
    ...daCasa, nome: "R. José Joaquim Ribeiro Teles", classe: "local",
    pts: longe, c: comprimento(longe), casa: true,
  });
}
for (const n of [...porNome.values()].sort((a, b) => (b.casa ? 1 : 0) - (a.casa ? 1 : 0) || PESO[a.classe] - PESO[b.classe] || b.c - a.c)) {
  const precisa = n.nome.length * TAMANHO[n.classe] * 0.55 + 60;
  if (n.c < precisa) continue;
  // Numa curva apertada as letras amontoam-se e lêem-se ao contrário; só leva
  // nome o troço que for quase direito.
  const corda = Math.hypot(n.pts.at(-1)[0] - n.pts[0][0], n.pts.at(-1)[1] - n.pts[0][1]);
  if (corda / n.c < 0.8) continue;
  let pts = n.pts;
  if (pts[pts.length - 1][0] < pts[0][0]) pts = [...pts].reverse();
  const meio = pts[Math.floor(pts.length / 2)];
  if (meio[0] < 40 || meio[0] > LARGURA - 40 || meio[1] < 30 || meio[1] > ALTURA - 30) continue;
  // O primeiro "ocupado" é o alfinete, e basta-lhe metade do raio.
  if (!n.casa && ocupados.some(([a, b], i) => Math.hypot(a - meio[0], b - meio[1]) < (i === 0 ? 60 : 110))) continue;
  ocupados.push(meio);
  rotulos.push({ id: `r${rotulos.length}`, d: caminho(pts), nome: n.nome, classe: n.classe });
  if (rotulos.length >= 14) break;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/* --------------------------------------------------------------- o SVG --- */

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGURA} ${ALTURA}" preserveAspectRatio="xMidYMid slice">
<!-- Dados © contribuidores do OpenStreetMap, ODbL. Gerado por scripts/desenhar-mapa.mjs — não editar à mão. -->
<defs>${rotulos.map((l) => `<path id="${l.id}" d="${l.d}"/>`).join("")}</defs>
<rect width="100%" height="100%" fill="#0d0906"/>
<g fill="#15170d">${camadas.verde.map((d) => `<path d="${d}"/>`).join("")}</g>
<g fill="#0e171b">${camadas.agua.map((a) => `<path d="${a.d}"/>`).join("")}</g>
<g fill="#1b130d" stroke="#261b12" stroke-width="1">${camadas.predios.map((d) => `<path d="${d}"/>`).join("")}</g>
<g fill="none" stroke-linecap="round" stroke-linejoin="round">
<g stroke="#2c2317" stroke-width="1.4" stroke-dasharray="3 4">${ruas.pe.map((d) => `<path d="${d}"/>`).join("")}</g>
<g stroke="#2a2116" stroke-width="2.6">${ruas.servico.map((d) => `<path d="${d}"/>`).join("")}</g>
<g stroke="#3d311f" stroke-width="5.5">${ruas.local.map((d) => `<path d="${d}"/>`).join("")}</g>
<g stroke="#5e4a26" stroke-width="8.5">${ruas.secundaria.map((d) => `<path d="${d}"/>`).join("")}</g>
<g stroke="#8a6d2c" stroke-width="11">${ruas.principal.map((d) => `<path d="${d}"/>`).join("")}</g>
${camadas.linha.map((l) => l.comboio
  ? `<path d="${l.d}" stroke="#4a3d28" stroke-width="3"/><path d="${l.d}" stroke="#0d0906" stroke-width="1.6" stroke-dasharray="8 8"/>`
  : `<path d="${l.d}" stroke="#16323b" stroke-width="3"/>`).join("")}
</g>
<g font-family="Helvetica Neue, Helvetica, Arial, sans-serif" fill="#cdb67f" stroke="#0d0906" stroke-width="4" paint-order="stroke" letter-spacing="0.4">
${rotulos.map((l) => `<text font-size="${TAMANHO[l.classe]}" dy="5"><textPath href="#${l.id}" startOffset="50%" text-anchor="middle">${esc(l.nome)}</textPath></text>`).join("\n")}
</g>
</svg>
`;

await mkdir("public/mapa", { recursive: true });
await writeFile(DESTINO, svg);
console.log(
  `${DESTINO}: ${(svg.length / 1024).toFixed(0)} KB · ` +
    `${camadas.predios.length} prédios · ${Object.values(ruas).flat().length} troços de rua · ` +
    `${rotulos.length} nomes (${rotulos.map((l) => l.nome).join(", ")})`,
);
