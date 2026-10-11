/* A gravação no iPhone mostrou rolagem nativa a continuar entre atualizações
   do motor. Este teste corta a entrega dos eventos ao JS, mantendo a rolagem,
   para provar que os carris e as deixas já não dependem desses eventos.

   Executar contra `npm run start`, com Playwright disponível:
   PLAYWRIGHT_MODULO=/caminho/playwright/index.mjs node testes/browser/rolagem-nativa.mjs http://localhost:3000
   A biblioteca pode vir do ambiente; não é uma dependência do site. */
import assert from "node:assert/strict";

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULO || "playwright");
const endereco = process.argv[2] || "http://localhost:3000";
const motores = process.argv[3] ? [process.argv[3]] : ["chromium", "webkit"];

for (const nome of motores) {
  const navegador = await ({ chromium, webkit }[nome]).launch();
  try {
    for (const dimensoes of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      const contexto = await navegador.newContext({ viewport: dimensoes });
      const pagina = await contexto.newPage();
      const erros = [];
      pagina.on("pageerror", (erro) => erros.push(erro.message));
      /* O servidor de teste usa HTTP. Remover a CSP só das respostas locais
         evita que o WebKit troque os recursos para HTTPS durante este teste. */
      if (["localhost", "127.0.0.1"].includes(new URL(endereco).hostname)) {
        await pagina.route("**/*", async (rota) => {
          const resposta = await rota.fetch();
          const cabecalhos = { ...resposta.headers() };
          delete cabecalhos["content-security-policy"];
          await rota.fulfill({ response: resposta, headers: cabecalhos });
        });
      }
      await pagina.goto(new URL("/en", endereco).href, { waitUntil: "networkidle" });
      await pagina.waitForFunction(() => document.documentElement.classList.contains("sc-ready"));
      await pagina.waitForFunction(() => {
        const transicao = document.querySelector(".tr");
        return !transicao || getComputedStyle(transicao).display === "none" || getComputedStyle(transicao).visibility === "hidden";
      });
      const resultados = await pagina.evaluate(async () => {
        const esperar = () => new Promise((resolver) =>
          requestAnimationFrame(() => requestAnimationFrame(resolver)));
        const bloquear = (evento) => evento.stopImmediatePropagation();
        const dados = [];
        window.addEventListener("scroll", bloquear, { capture: true });
        try {
          for (const id of ["carril", "partilhar"]) {
            const acto = document.getElementById(id);
            const carril = acto.querySelector("[data-sc-pan]");
            const topo = acto.getBoundingClientRect().top + scrollY;
            const percurso = acto.offsetHeight - document.documentElement.clientHeight;
            const distancia = (carril.scrollWidth - innerWidth) * (1 + Number(carril.dataset.scPan));
            for (const progresso of [0, 0.25, 0.5, 0.75, 1, 0.5, 0.25]) {
              scrollTo({ top: topo + percurso * progresso, behavior: "instant" });
              await esperar();
              const deslocamento = new DOMMatrixReadOnly(getComputedStyle(carril).transform).m41;
              dados.push({ id, progresso, erro: Math.abs(deslocamento + distancia * progresso) });
            }
          }
          const acto = document.getElementById("reels");
          const deixa = acto.querySelector(".pg-reels__grelha [data-sc-cue]");
          const topo = acto.getBoundingClientRect().top + scrollY;
          const percurso = acto.offsetHeight - document.documentElement.clientHeight;
          /* A primeira cela entra entre .04 e .22: o meio da rampa é .13. */
          for (const [progresso, esperado] of [[0, 0], [0.13, 0.5], [0.3, 1], [0.13, 0.5]]) {
            scrollTo({ top: topo + percurso * progresso, behavior: "instant" });
            await esperar();
            dados.push({ id: "reels", progresso, erro: Math.abs(Number(getComputedStyle(deixa).opacity) - esperado) });
            if (progresso === 0 || progresso === 0.3) {
              dados.push({ id: "interacao", progresso, erro: getComputedStyle(deixa).pointerEvents === (progresso === 0 ? "none" : "auto") ? 0 : 1 });
            }
            if (progresso === 0.3) {
              const caixa = deixa.getBoundingClientRect();
              const tocado = document.elementFromPoint(caixa.left + caixa.width / 2, caixa.top + caixa.height / 2);
              dados.push({ id: "toque", progresso, erro: deixa.contains(tocado) ? 0 : 1 });
            }
          }
          const avaliacoes = document.getElementById("preguicosos");
          const primeira = avaliacoes.querySelector(
            innerWidth < 1024 ? ".pg-preguicosos__lugares--estreito [data-sc-cue]" : ".pg-preguicosos__lugares--largo [data-sc-cue]",
          );
          const inicio = avaliacoes.getBoundingClientRect().top + scrollY;
          const viagem = avaliacoes.offsetHeight - document.documentElement.clientHeight;
          for (const [progresso, esperado] of [[0, 1], [0.95, 0], [0, 1]]) {
            scrollTo({ top: inicio + viagem * progresso, behavior: "instant" });
            await esperar();
            dados.push({ id: "avaliacoes", progresso, erro: Math.abs(Number(getComputedStyle(primeira).opacity) - esperado) });
          }
        } finally {
          window.removeEventListener("scroll", bloquear, { capture: true });
        }
        return dados;
      });
      for (const resultado of resultados) {
        assert.ok(resultado.erro < (["carril", "partilhar"].includes(resultado.id) ? 3 : 0.03), JSON.stringify(resultado));
      }
      const focos = await pagina.evaluate(async () => {
        const resultados = [];
        for (const id of ["carril", "partilhar"]) {
          const ligacoes = document.getElementById(id).querySelectorAll("[data-sc-pan] button, [data-sc-pan] a");
          for (const elemento of [ligacoes[0], ligacoes[ligacoes.length - 1]]) {
            elemento.focus({ preventScroll: true });
            await new Promise((resolver) => requestAnimationFrame(() => requestAnimationFrame(resolver)));
            const caixa = elemento.getBoundingClientRect();
            resultados.push(caixa.left >= -1 && caixa.right <= innerWidth + 1 && caixa.bottom > 0 && caixa.top < innerHeight);
          }
        }
        return resultados;
      });
      assert.ok(focos.every(Boolean), "As ligações focadas têm de ficar visíveis nos dois carris");
      await pagina.emulateMedia({ reducedMotion: "reduce" });
      await pagina.waitForFunction(() => !document.querySelector(".pg-rolagem-nativa"));
      assert.equal(await pagina.locator(".pg-rolagem-nativa").count(), 0);
      await pagina.emulateMedia({ reducedMotion: "no-preference" });
      await pagina.waitForFunction(() => document.querySelector(".pg-rolagem-nativa"));
      await pagina.setViewportSize({ width: dimensoes.width + 60, height: dimensoes.height - 100 });
      const erroDepoisDeRedimensionar = await pagina.evaluate(async () => {
        const acto = document.getElementById("carril");
        const carril = acto.querySelector("[data-sc-pan]");
        const topo = acto.getBoundingClientRect().top + scrollY;
        const percurso = acto.offsetHeight - document.documentElement.clientHeight;
        scrollTo({ top: topo + percurso / 2, behavior: "instant" });
        await new Promise((resolver) => requestAnimationFrame(() => requestAnimationFrame(resolver)));
        const distancia = (carril.scrollWidth - innerWidth) * (1 + Number(carril.dataset.scPan));
        return Math.abs(new DOMMatrixReadOnly(getComputedStyle(carril).transform).m41 + distancia / 2);
      });
      assert.ok(erroDepoisDeRedimensionar < 3, `Redimensionamento: ${erroDepoisDeRedimensionar}px`);
      assert.deepEqual(erros, []);
      console.log(`${nome} ${dimensoes.width}×${dimensoes.height}: carris, deixas, toque, teclado, inversão, movimento reduzido e redimensionamento verificados`);
      await contexto.close();
    }
    for (const modo of ["sem-api", "reduzido"]) {
      const contexto = await navegador.newContext({
        viewport: { width: 390, height: 844 },
        reducedMotion: modo === "reduzido" ? "reduce" : "no-preference",
      });
      const pagina = await contexto.newPage();
      if (modo === "sem-api") await pagina.addInitScript(() => { delete window.ViewTimeline; });
      if (["localhost", "127.0.0.1"].includes(new URL(endereco).hostname)) {
        await pagina.route("**/*", async (rota) => {
          const resposta = await rota.fetch();
          const cabecalhos = { ...resposta.headers() };
          delete cabecalhos["content-security-policy"];
          await rota.fulfill({ response: resposta, headers: cabecalhos });
        });
      }
      await pagina.goto(new URL("/en", endereco).href, { waitUntil: "networkidle" });
      await pagina.waitForFunction(() => document.documentElement.classList.contains("sc-ready"));
      await pagina.waitForFunction(() => {
        const transicao = document.querySelector(".tr");
        return !transicao || getComputedStyle(transicao).display === "none" || getComputedStyle(transicao).visibility === "hidden";
      });
      assert.equal(await pagina.locator(".pg-rolagem-nativa").count(), 0);
      if (modo === "sem-api") {
        const erro = await pagina.evaluate(async () => {
          const acto = document.getElementById("carril");
          const carril = acto.querySelector("[data-sc-pan]");
          scrollTo({ top: acto.getBoundingClientRect().top + scrollY + (acto.offsetHeight - innerHeight) / 2, behavior: "instant" });
          await new Promise((resolver) => setTimeout(resolver, 350));
          const distancia = (carril.scrollWidth - innerWidth) * (1 + Number(carril.dataset.scPan));
          return Math.abs(new DOMMatrixReadOnly(getComputedStyle(carril).transform).m41 + distancia / 2);
        });
        assert.ok(erro < 3, `Alternativa sem API: ${erro}px`);
      } else {
        assert.equal(await pagina.locator("#carril [data-sc-stage]").evaluate((elemento) => getComputedStyle(elemento).position), "static");
      }
      console.log(`${nome}: ${modo} verificado`);
      await contexto.close();
    }
  } finally {
    await navegador.close();
  }
}
