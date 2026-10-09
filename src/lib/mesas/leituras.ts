import "server-only";
import { lerHash, somarNoHash } from "@/lib/painel/redis";
import {
  CHAVE_DAS_LEITURAS,
  campoDaLeitura,
  noiteDeServico,
  resumir,
  type Origem,
  type Resumo,
} from "./contas";

/* Ver `contas.ts` para o que se guarda e porquê. */

export async function contarLeitura(mesa: number, origem: Origem): Promise<void> {
  await somarNoHash(CHAVE_DAS_LEITURAS, campoDaLeitura(noiteDeServico(new Date()), origem, mesa));
}

export async function resumoDasLeituras(): Promise<Resumo> {
  return resumir(await lerHash(CHAVE_DAS_LEITURAS), noiteDeServico(new Date()));
}
