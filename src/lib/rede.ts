/*
  A "ligação" de onde veio um pedido, para os limites por IP.

  ## IPv6 conta-se por /64

  Um IPv4 é, na prática, uma casa ou um telemóvel. Um IPv6 não: cada ligação
  doméstica ou de operador móvel recebe um bloco /64 inteiro — 2⁶⁴ endereços — e
  quem está do outro lado pode mudar de endereço a cada pedido sem sair do
  sofá. Contar por endereço completo era dar um limite novo a cada pedido.
  Contar pelos primeiros 64 bits é contar por ligação, que é o que um limite
  "por IP" quer dizer.

  ## Só passa o que parece um endereço

  O valor vem de um cabeçalho. Na Vercel é a plataforma que o escreve, mas fora
  dela é do cliente, e acaba numa chave do Redis e numa linha do registo. O que
  não for só algarismos, pontos e dois-pontos vira `desconhecida` — nem chaves
  gigantes, nem texto inventado no registo.

  Sem `server-only` e sem imports: é uma função pura, e é assim que os testes
  em `testes/` a conseguem carregar com o `node --test`.
*/

const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export function redeDe(ip: string): string {
  const limpo = ip.trim().toLowerCase();

  if (IPV4.test(limpo)) return limpo;

  /* `::ffff:1.2.3.4` é um IPv4 escrito à maneira do IPv6. Conta como IPv4. */
  const mapeado = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(limpo);
  if (mapeado) return mapeado[1];

  if (limpo.length > 39 || !limpo.includes(":") || !/^[0-9a-f:]+$/.test(limpo)) {
    return "desconhecida";
  }

  const metades = limpo.split("::");
  if (metades.length > 2) return "desconhecida";

  const grupos = (texto: string) => (texto ? texto.split(":") : []);
  const antes = grupos(metades[0]);
  const depois = metades.length === 2 ? grupos(metades[1]) : [];
  const zeros = metades.length === 2 ? 8 - antes.length - depois.length : 0;
  if (zeros < 0) return "desconhecida";

  const todos = [...antes, ...Array<string>(zeros).fill("0"), ...depois];
  if (todos.length !== 8 || todos.some((g) => g.length === 0 || g.length > 4)) {
    return "desconhecida";
  }

  return `${todos
    .slice(0, 4)
    .map((g) => parseInt(g, 16).toString(16))
    .join(":")}::/64`;
}
