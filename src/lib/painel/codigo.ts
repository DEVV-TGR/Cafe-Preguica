import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { chave } from "./chaves";
import { ler, guardar, apagar, somar } from "./redis";

/*
  O código de seis algarismos.

  ## O que mudou, e porquê

  O código já viveu dentro de um cookie cifrado, porque não havia onde o guardar
  do lado do servidor. Funcionava, e tinha uma falha que estava documentada mas
  não resolvida: **o contador de tentativas ia no mesmo cookie**, e quem atacasse
  guardava uma cópia e reenviava-a para o pôr a zero. Não há como contar num
  papel que se entrega a quem está a contar.

  Agora há Redis. O código guarda-se lá, o cookie leva só o `id` do desafio, e as
  tentativas contam-se com `INCR` — atómico, do lado de cá, e sem volta a dar.

  ## Hash, e não o código

  `SHA-256`, nunca o código em texto. Se o armazenamento for lido por quem não
  devia, os códigos activos não servem para entrar.

  E aqui o hash chega, ao contrário do que acontecia no cookie: um hash de seis
  algarismos quebra-se num instante *se quem o tem puder experimentar à vontade*
  — e no cookie podia, porque o cookie estava na mão dele. No Redis, para chegar
  ao hash é preciso já ter as chaves do Redis, e nessa altura o código de entrada
  é o menor dos problemas. `bcrypt` seria lentidão sem ganho: isto expira em dez
  minutos e tem cinco tentativas.

  ## Uso único

  Ao ser aceite, a chave é apagada. Um código que já entrou não volta a entrar,
  mesmo dentro dos dez minutos — o que interessa se o email for lido mais tarde
  por outra pessoa.
*/

export const NOME_DO_DESAFIO = "preguica_desafio";

export const VALIDADE_MS = 10 * 60 * 1000;
const VALIDADE_S = VALIDADE_MS / 1000;

const TENTATIVAS = 5;

type Guardado = { email: string; hash: string };

/*
  `randomInt` e não `Math.random()`: o segundo é previsível a partir de umas
  quantas saídas, e um código de entrada previsível não é um código. Zeros à
  esquerda para o "000042" ser tão provável como o "384921".
*/
export function gerarCodigo(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** `"384921"` → `"384 921"`, para se ler de uma vez no assunto do email. */
export function comEspaco(codigo: string): string {
  return `${codigo.slice(0, 3)} ${codigo.slice(3)}`;
}

function hashDoCodigo(codigo: string): string {
  return createHash("sha256").update(codigo).digest("hex");
}

/*
  O cookie leva o `id` e uma assinatura, e mais nada — o código não vai lá dentro
  porque já não precisa de ir. Assinado para que o `id` não possa ser inventado:
  sem isso, alguém pedia um código para o seu próprio endereço e depois trocava o
  `id` pelo de outra pessoa.
*/
async function selar(id: string): Promise<string> {
  const selo = createHmac("sha256", await chave("desafio"))
    .update(`d1.${id}`)
    .digest("base64url");
  return `d1.${id}.${selo}`;
}

async function abrir(cookie: string | undefined): Promise<string | null> {
  if (!cookie) return null;

  const partes = cookie.split(".");
  if (partes.length !== 3 || partes[0] !== "d1") return null;
  const [, id, selo] = partes;

  const esperado = Buffer.from((await selar(id)).split(".")[2]);
  const recebido = Buffer.from(selo);
  if (esperado.length !== recebido.length) return null;
  if (!timingSafeEqual(esperado, recebido)) return null;

  return id;
}

/** Guarda um código novo e devolve o cookie que aponta para ele. */
export async function criarDesafio(email: string, codigo: string): Promise<string> {
  const id = randomBytes(16).toString("base64url");

  await guardar(
    `otp:${id}`,
    JSON.stringify({ email, hash: hashDoCodigo(codigo) } satisfies Guardado),
    VALIDADE_S,
  );

  return selar(id);
}

export type Veredicto =
  | { estado: "certo"; email: string }
  | { estado: "errado"; restam: number }
  | { estado: "expirado" }
  | { estado: "sem-desafio" };

export async function conferirCodigo(
  cookie: string | undefined,
  escrito: string,
): Promise<Veredicto> {
  const id = await abrir(cookie);
  if (!id) return { estado: "sem-desafio" };

  const bruto = await ler(`otp:${id}`);
  /* Expirou sozinho no Redis, ou foi usado, ou foi queimado por tentativas. */
  if (!bruto) return { estado: "expirado" };

  const guardado = JSON.parse(bruto) as Guardado;

  /*
    Conta **antes** de comparar, e não depois.

    Contar depois deixava passar uma tentativa a mais em cada corrida: dois
    pedidos ao mesmo tempo comparavam os dois antes de qualquer um somar. Somar
    primeiro é o que faz a quinta ser mesmo a quinta.
  */
  const tentativa = await somar(`otp-tentativas:${id}`, VALIDADE_S);
  if (tentativa > TENTATIVAS) {
    await apagar(`otp:${id}`);
    return { estado: "expirado" };
  }

  const esperado = Buffer.from(guardado.hash);
  const obtido = Buffer.from(hashDoCodigo(escrito.replace(/\D/g, "")));
  const bate = esperado.length === obtido.length && timingSafeEqual(esperado, obtido);

  if (!bate) {
    const restam = TENTATIVAS - tentativa;
    if (restam <= 0) await apagar(`otp:${id}`);
    return { estado: "errado", restam: Math.max(0, restam) };
  }

  /* Uso único: entrou, acabou. */
  await Promise.all([apagar(`otp:${id}`), apagar(`otp-tentativas:${id}`)]);
  return { estado: "certo", email: guardado.email };
}

/** Para quem é o código que está a meio, para o segundo ecrã saber a quem falar. */
export async function emailDoDesafio(cookie: string | undefined): Promise<string | null> {
  const id = await abrir(cookie);
  if (!id) return null;

  const bruto = await ler(`otp:${id}`);
  return bruto ? (JSON.parse(bruto) as Guardado).email : null;
}

/** Deita fora o desafio a meio — usa-se ao pedir outro código. */
export async function apagarDesafio(cookie: string | undefined): Promise<void> {
  const id = await abrir(cookie);
  if (!id) return;
  await Promise.all([apagar(`otp:${id}`), apagar(`otp-tentativas:${id}`)]);
}
