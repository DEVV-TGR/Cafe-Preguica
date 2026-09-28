import "server-only";
import { hkdfSync, randomBytes } from "node:crypto";
import { ler, guardarSeNovo } from "./redis";

/*
  Uma chave por uso, derivadas de um segredo que nasce sozinho.

  | uso | o quê | como |
  |---|---|---|
  | `sessao` | assinar o cookie de quem já entrou | HMAC-SHA256 |
  | `desafio` | assinar o cookie que aponta ao código pendente | HMAC-SHA256 |
  | `aparelho` | assinar o "este aparelho já passou pelo email" | HMAC-SHA256 |
  | `newsletter` | assinar o link de confirmação da inscrição | HMAC-SHA256 |
  | `carta` | assinar a chave da carta secreta guardada no telemóvel | HMAC-SHA256 |

  **Não podem ser a mesma chave.** Sem separação, um selo de sessão podia
  ser apresentado como selo de aparelho, e uma fraqueza num dos usos passava aos
  outros. O `hkdf` é a ferramenta desenhada exactamente para isto — esticar um
  segredo em várias chaves independentes, com um rótulo por uso — e é síncrono.

  ## De onde vem o segredo, agora que não há password

  Antes saía das credenciais: a password era a matéria-prima, e mudá-la revogava
  tudo. Sem password, isso deixou de existir.

  A saída óbvia era mais uma variável de ambiente gerada com `openssl rand`. Mas
  era exactamente a cerimónia que se tirou do caminho por ser cerimónia, e uma
  variável que ninguém sabe explicar acaba por ser copiada entre ambientes.

  Em vez disso, **o segredo nasce à primeira utilização e fica no Redis**. 32
  bytes de `randomBytes` — muito melhor do que qualquer coisa que uma pessoa
  escrevesse — guardados com `SET NX`, que é atómico: se duas instâncias
  arrancarem ao mesmo tempo, a primeira ganha e a segunda lê o que ela pôs, em
  vez de ficarem duas metades do sistema a assinar com chaves diferentes.

  **Apagar a chave `painel:segredo` expulsa toda a gente.** É o botão de
  emergência, e é um só — cai a sessão, caem os desafios a meio, caem os
  aparelhos lembrados.
*/

const CHAVE_DO_SEGREDO = "painel:segredo";

/*
  Memoizado por instância.

  Sem isto, cada pedido ao painel ia ao Redis buscar o mesmo valor que nunca
  muda. O custo de memoizar é o dia em que o segredo for apagado: as instâncias
  já em pé continuam a assinar com o antigo até serem recicladas. Para um botão
  de emergência que se carrega uma vez na vida, e num sítio onde as instâncias
  duram minutos, é troca boa.
*/
let emCache: string | null = null;

async function segredo(): Promise<string> {
  if (emCache) return emCache;

  const existente = await ler(CHAVE_DO_SEGREDO);
  if (existente) {
    emCache = existente;
    return existente;
  }

  const novo = randomBytes(32).toString("base64");
  const foiEle = await guardarSeNovo(CHAVE_DO_SEGREDO, novo);

  /* Perdeu a corrida — vale o que a outra instância pôs, não o dele. */
  emCache = foiEle ? novo : ((await ler(CHAVE_DO_SEGREDO)) ?? novo);
  return emCache;
}

export type Uso = "sessao" | "desafio" | "aparelho" | "newsletter" | "carta";

/*
  Sem sal: a separação que interessa é entre os usos, e essa é feita pelo
  rótulo, que é o parâmetro `info` e é para isso que ele existe. Um sal fixo
  escrito no código não acrescentava nada, e um variável obrigava a guardá-lo em
  algum lado.
*/
export async function chave(uso: Uso, bytes = 32): Promise<Buffer> {
  return Buffer.from(
    hkdfSync("sha256", await segredo(), "", `preguica:${uso}:v1`, bytes),
  );
}

/** Só para os testes: esquece o segredo memoizado desta instância. */
export function esquecerSegredo(): void {
  emCache = null;
}
