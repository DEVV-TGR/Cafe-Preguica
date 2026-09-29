import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RAIZ = new URL("../../", import.meta.url);

const SUBSTITUTOS = {
  "server-only": new URL("./server-only.mjs", import.meta.url).href,
  "next/headers": new URL("./next-headers.mjs", import.meta.url).href,
};

function ficheiro(url) {
  const caminho = fileURLToPath(url);
  return existsSync(caminho) && statSync(caminho).isFile();
}

export async function resolve(especificador, contexto, seguinte) {
  if (SUBSTITUTOS[especificador]) {
    return { url: SUBSTITUTOS[especificador], shortCircuit: true };
  }

  let alvo = null;
  if (especificador.startsWith("@/")) {
    alvo = new URL(`src/${especificador.slice(2)}`, RAIZ);
  } else if (/^\.\.?\//.test(especificador) && contexto.parentURL?.endsWith(".ts")) {
    alvo = new URL(especificador, contexto.parentURL);
  }

  if (alvo) {
    for (const extensao of ["", ".ts", ".tsx"]) {
      const candidato = new URL(alvo.href + extensao);
      if (ficheiro(candidato)) return { url: candidato.href, shortCircuit: true };
    }
  }

  return seguinte(especificador, contexto);
}
