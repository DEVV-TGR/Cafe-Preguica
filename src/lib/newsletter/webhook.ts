import { createHmac, timingSafeEqual } from "node:crypto";

/*
  A assinatura dos webhooks do Resend, verificada à mão.

  O Resend assina com o Svix, e a regra é curta: HMAC-SHA256 de
  `<svix-id>.<svix-timestamp>.<corpo cru>`, com o segredo `whsec_…` (base64
  depois do prefixo), e o resultado em base64 num cabeçalho `svix-signature` que
  pode levar várias, separadas por espaço, cada uma como `v1,<assinatura>`.
  Uma biblioteca para isto eram mais dependências para dez linhas.

  O instante tem de estar a menos de cinco minutos do relógio de cá — sem isso,
  um pedido apanhado podia ser repetido mais tarde à vontade.

  Sem `server-only` e sem imports do projeto, para os testes de `testes/` o
  poderem carregar.
*/

const TOLERANCIA_S = 5 * 60;

export function assinaturaValida({
  segredo,
  id,
  instante,
  assinaturas,
  corpo,
  agora = Date.now(),
}: {
  segredo: string;
  id: string | null;
  instante: string | null;
  assinaturas: string | null;
  corpo: string;
  agora?: number;
}): boolean {
  if (!id || !instante || !assinaturas) return false;

  const segundos = Number(instante);
  if (!Number.isFinite(segundos) || Math.abs(agora / 1000 - segundos) > TOLERANCIA_S) return false;

  const chave = Buffer.from(segredo.replace(/^whsec_/, ""), "base64");
  const esperada = Buffer.from(
    createHmac("sha256", chave).update(`${id}.${instante}.${corpo}`).digest("base64"),
  );

  return assinaturas.split(" ").some((parte) => {
    const [versao, assinatura] = parte.split(",");
    if (versao !== "v1" || !assinatura) return false;
    const recebida = Buffer.from(assinatura);
    return recebida.length === esperada.length && timingSafeEqual(recebida, esperada);
  });
}
