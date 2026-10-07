import { z } from "zod";

/*
  O que conta como um endereço de email, para tudo o que vem de fora: o convite
  da newsletter, a carta secreta e a entrada do painel.

  Num sítio só porque já foram regras diferentes: as rotas públicas usavam o
  `z.email()` com teto de 254 caracteres (o máximo que um endereço pode ter), e
  a entrada do painel aceitava qualquer coisa com um `@` — de qualquer tamanho,
  e com quebras de linha lá dentro. Esse texto ia para uma chave do Redis e para
  o registo da Vercel, onde uma quebra de linha escreve linhas que parecem do
  próprio registo.

  Minúsculas e sem espaços à volta antes de validar: é assim que os endereços
  são comparados em todo o lado (ver `lib/painel/utilizadores.ts`).
*/
export const EsquemaEmail = z.string().trim().toLowerCase().max(254).pipe(z.email());
