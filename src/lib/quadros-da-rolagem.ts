const SUAVE = "cubic-bezier(0.333333,0,0.666667,1)";
const limitar = (valor: number) => Math.min(1, Math.max(0, valor));
const arredondar = (valor: number) => Number(valor.toFixed(12));
const suavizar = (valor: number) => valor * valor * (3 - 2 * valor);

type Trecho = { inicio: number; fim: number; de: number; para: number };

function lerDeixa(deixa: string) {
  const valores = deixa.trim().split(/\s+/).map(Number.parseFloat);
  const inicio = Number.isNaN(valores[0]) ? 0 : valores[0];
  const fim = valores.length > 1 && !Number.isNaN(valores[1]) ? valores[1] : null;
  const entrada = Number.isNaN(valores[2]) || valores[2] === undefined ? 0.3 : limitar(valores[2]);
  const saida = Number.isNaN(valores[3]) || valores[3] === undefined ? 0.3 : limitar(valores[3]);
  return { inicio, fim, entrada, saida };
}

/** Mantém as mesmas rampas do motor, mas deixa a timeline conduzi-las no compositor. */
export function quadrosDaDeixa(deixa: string, subida = 1): Keyframe[] {
  const { inicio, fim, entrada, saida } = lerDeixa(deixa);
  const trechos: Trecho[] = [{ inicio: -Infinity, fim: inicio, de: 0, para: 0 }];

  if (fim === null) {
    trechos.push(
      { inicio, fim: inicio + 0.18, de: 0, para: 1 },
      { inicio: inicio + 0.18, fim: Infinity, de: 1, para: 1 },
    );
  } else {
    const janela = Math.max(fim - inicio, 0.001);
    const fimDaEntrada = inicio + janela * entrada;
    const inicioDaSaida = fim - janela * saida;
    trechos.push(
      { inicio, fim: fimDaEntrada, de: 0, para: 1 },
      { inicio: fimDaEntrada, fim: inicioDaSaida, de: 1, para: 1 },
      { inicio: inicioDaSaida, fim, de: 1, para: 0 },
      { inicio: fim, fim: Infinity, de: 0, para: 0 },
    );
  }

  const quadros: Keyframe[] = [];
  function acrescentar(offset: number, opacity: number, easing = "linear") {
    offset = arredondar(offset);
    opacity = arredondar(opacity);
    const anterior = quadros.at(-1);
    if (anterior?.offset === offset && anterior.opacity === opacity) {
      anterior.easing = easing;
      return;
    }
    quadros.push({
      offset,
      opacity,
      transform: `translate3d(0,${arredondar((1 - opacity) * 2.4 * subida)}vh,0)`,
      easing,
    });
  }

  for (const trecho of trechos) {
    const de = Math.max(0, trecho.inicio);
    const ate = Math.min(1, trecho.fim);
    if (de > ate) continue;
    if (trecho.de === trecho.para || trecho.inicio === trecho.fim) {
      acrescentar(de, trecho.de);
      acrescentar(ate, trecho.para);
      continue;
    }

    const duracao = trecho.fim - trecho.inicio;
    const t0 = limitar((de - trecho.inicio) / duracao);
    const t1 = limitar((ate - trecho.inicio) / duracao);
    const v0 = suavizar(t0);
    const v1 = suavizar(t1);
    let easing = SUAVE;
    if ((t0 > 0 || t1 < 1) && v1 > v0) {
      /* Cortar uma rampa em 0 ou 1 não pode reiniciar a curva: as tangentes
         conservam o trecho do smoothstep que ainda cabe na rolagem. */
      const escala = (t1 - t0) / (v1 - v0);
      const y1 = arredondar(escala * 2 * t0 * (1 - t0));
      const y2 = arredondar(1 - escala * 2 * t1 * (1 - t1));
      easing = `cubic-bezier(0.333333,${y1},0.666667,${y2})`;
    }
    acrescentar(de, trecho.de + (trecho.para - trecho.de) * v0, easing);
    acrescentar(ate, trecho.de + (trecho.para - trecho.de) * v1);
  }

  /* Quadros coincidentes representam trocas instantâneas no interior. Nos
     extremos só conta o lado que existe: depois de 0 e antes de 1. */
  return quadros.filter((quadro, indice) =>
    quadro.offset === 0
      ? quadros[indice + 1]?.offset !== 0
      : quadro.offset !== 1 || quadros[indice - 1]?.offset !== 1,
  );
}

export function quadrosDaInteracao(deixa: string): Keyframe[] {
  const { inicio, fim, entrada, saida } = lerDeixa(deixa);
  const janela = fim === null ? 0.18 : Math.max(fim - inicio, 0.001);
  /* O smoothstep cruza 0.5 a meio da rampa. A interação segue esse limiar
     num efeito separado, para a posição e a opacidade continuarem no compositor. */
  const abertura = arredondar(inicio + janela * (fim === null ? 1 : entrada) / 2);
  const fecho = fim === null ? Infinity : arredondar(fim - janela * saida / 2);
  let pointerEvents = abertura <= 0 && fecho > 0 ? "auto" : "none";
  const quadros: Keyframe[] = [{ offset: 0, pointerEvents, easing: "linear" }];

  function trocar(offset: number, valor: string) {
    quadros[quadros.length - 1].easing = "steps(1,end)";
    pointerEvents = valor;
    quadros.push({ offset, pointerEvents, easing: "linear" });
  }

  if (abertura < fecho) {
    if (abertura > 0 && abertura < 1) trocar(abertura, "auto");
    if (fecho > 0 && (fecho < 1 || (fecho === 1 && saida > 0))) trocar(fecho, "none");
  }
  if (quadros.at(-1)?.offset !== 1) quadros.push({ offset: 1, pointerEvents, easing: "linear" });
  return quadros;
}
