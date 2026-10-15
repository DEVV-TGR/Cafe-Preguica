/*
  Onde a chave da carta secreta fica no browser — e quando sai de lá.

  Revisão legal de 2026-10-15 (ver `lib/carta-secreta/chave.ts` e a página de
  cookies). Guardar alguma coisa no aparelho de quem visita pede consentimento,
  a não ser que seja estritamente necessário para o serviço que a pessoa pediu
  (Lei 41/2004, art. 5.º). Daí as duas casas:

  - **`sessionStorage`, por defeito.** A pessoa pediu para abrir a carta;
    lembrá-la enquanto o separador estiver aberto é o necessário para isso, e o
    browser apaga-a ao fechar o separador.
  - **`localStorage`, só com "lembrar neste aparelho"**, que diz o que guarda e
    por quanto tempo. É a escolha da pessoa que justifica ficar depois de
    fechar o separador.

  O `localStorage` não tem prazo próprio: uma chave caducada ficava lá até
  alguém a apagar. Por isso, cada leitura confere a validade que vem dentro da
  chave e apaga a que já passou. Lê-se sem verificar a assinatura — quem decide
  se a chave abre é o servidor; aqui só se decide se vale a pena guardá-la.

  Tudo dentro de `try`: numa janela privada, ou com o armazenamento bloqueado,
  o acesso atira, e a carta abre na mesma — só não se lembra.
*/

export const CHAVE_DA_CARTA = "preguica:carta-secreta";

type Guardada = { valor: string; lembrada: boolean };

/** O que vem dentro da chave, sem verificar nada; `null` se não se ler. */
function corpoDe(valor: string): { exp?: unknown; r?: unknown } | null {
  try {
    const corpo = valor.split(".")[1] ?? "";
    const base64 = corpo.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as { exp?: unknown; r?: unknown };
  } catch {
    return null;
  }
}

function ler(armazem: () => Storage): string | null {
  try {
    return armazem().getItem(CHAVE_DA_CARTA);
  } catch {
    return null;
  }
}

function tirar(armazem: () => Storage): void {
  try {
    armazem().removeItem(CHAVE_DA_CARTA);
  } catch {}
}

/** A chave guardada, se houver e ainda estiver no prazo. A caducada sai. */
export function lerChaveGuardada(): Guardada | null {
  for (const [armazem, lembrada] of [
    [() => sessionStorage, false],
    [() => localStorage, true],
  ] as const) {
    const valor = ler(armazem);
    if (!valor) continue;
    const corpo = corpoDe(valor);
    if (!corpo || typeof corpo.exp !== "number" || corpo.exp < Date.now()) {
      tirar(armazem);
      continue;
    }
    return { valor, lembrada };
  }
  return null;
}

/** Guarda onde a chave diz (`r`), e tira-a do outro sítio. */
export function guardarChave(valor: string): void {
  const lembrada = corpoDe(valor)?.r === true;
  try {
    (lembrada ? localStorage : sessionStorage).setItem(CHAVE_DA_CARTA, valor);
  } catch {}
  tirar(lembrada ? () => sessionStorage : () => localStorage);
}

/** Esquece a carta neste browser, nos dois sítios. */
export function esquecerChave(): void {
  tirar(() => sessionStorage);
  tirar(() => localStorage);
}
