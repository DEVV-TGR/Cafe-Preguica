/* Os cabeçalhos de um pedido qualquer, para o `origem()` e o `rede()` terem de
   onde ler. */
export async function headers() {
  return new Headers({ "x-forwarded-for": "203.0.113.9" });
}
