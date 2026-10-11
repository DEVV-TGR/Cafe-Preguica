import "server-only";
import { empurrarNaLista, lerHash, lerLista, somarNoHash } from "@/lib/painel/redis";
import {
  CHAVE_DAS_HORAS,
  CHAVE_DAS_LEITURAS,
  CHAVE_DAS_ULTIMAS,
  ULTIMAS,
  campoDaHora,
  campoDaLeitura,
  horaEmLisboa,
  lerCampos,
  lerHoras,
  noiteDeServico,
  resumir,
  type Leitura,
  type LeituraComHora,
  type Resumo,
  type UltimaLeitura,
} from "./contas";

/* Ver `contas.ts` para o que se guarda e porquê. */

/* A lista das últimas leituras vive um ano sem leituras novas antes de se
   apagar sozinha — numa casa aberta, nunca chega lá. */
const PRAZO_DAS_ULTIMAS_S = 365 * 24 * 60 * 60;

export async function contarLeitura(mesa: number): Promise<void> {
  const agora = new Date();
  const noite = noiteDeServico(agora);
  await Promise.all([
    somarNoHash(CHAVE_DAS_LEITURAS, campoDaLeitura(noite, mesa)),
    somarNoHash(CHAVE_DAS_HORAS, campoDaHora(noite, mesa, horaEmLisboa(agora))),
    empurrarNaLista(
      CHAVE_DAS_ULTIMAS,
      JSON.stringify({ quando: agora.getTime(), mesa } satisfies UltimaLeitura),
      ULTIMAS,
      PRAZO_DAS_ULTIMAS_S,
    ),
  ]);
}

export async function resumoDasLeituras(): Promise<Resumo> {
  return resumir(await lerHash(CHAVE_DAS_LEITURAS), noiteDeServico(new Date()));
}

/** Tudo o que a página das Mesas precisa, lido de uma vez. O filtro corre no browser. */
export async function dadosDasMesas(): Promise<{
  resumo: Resumo;
  leituras: Leitura[];
  horas: LeituraComHora[];
  ultimas: UltimaLeitura[];
  hoje: string;
}> {
  const hoje = noiteDeServico(new Date());
  const [hash, horas, ultimas] = await Promise.all([
    lerHash(CHAVE_DAS_LEITURAS),
    lerHash(CHAVE_DAS_HORAS),
    lerLista(CHAVE_DAS_ULTIMAS, ULTIMAS),
  ]);
  return {
    resumo: resumir(hash, hoje),
    leituras: lerCampos(hash),
    horas: lerHoras(horas),
    /* Já vêm da mais recente para trás (`LPUSH`), mas duas leituras quase ao
       mesmo tempo podem chegar trocadas — ordena-se pela hora na mesma. */
    ultimas: ultimas
      .flatMap((linha) => {
        try {
          const lida = JSON.parse(linha) as UltimaLeitura;
          return typeof lida.quando === "number" && typeof lida.mesa === "number" ? [lida] : [];
        } catch {
          return [];
        }
      })
      .sort((a, b) => b.quando - a.quando),
    hoje,
  };
}
