/*
  Este código está a correr no site oficial, ou numa versão de ensaio?

  ## Porque é que o `NODE_ENV` não responde a isto

  O `NODE_ENV` diz como o código foi **compilado**, não **onde** está. É
  `production` no site oficial, mas também em cada pré-visualização que a Vercel
  cria para um PR, e no `npm start` na nossa máquina. Foi por isso que o painel
  de uma pré-visualização chegou a gravar no `main` — que é o site verdadeiro —
  e que o "Enviar a todos" de uma pré-visualização mandava a newsletter aos
  inscritos de verdade.

  O `VERCEL_ENV` é posto pela própria plataforma: `production` só no deploy de
  produção, `preview` nas pré-visualizações, e não existe fora da Vercel.

  ⚠️ **Falha fechado.** Se um dia o `VERCEL_ENV` não chegar ao código (a opção
  "Automatically expose System Environment Variables" da Vercel desligada), o
  site oficial passa a portar-se como uma versão de ensaio: o painel recusa
  gravar e a newsletter só envia testes. Incómodo, e dito no ecrã — nunca o
  contrário, que era uma versão de ensaio a mexer no site verdadeiro.

  Sem imports, para os testes em `testes/` a carregarem com o `node --test`.
*/
export function noSiteOficial(): boolean {
  return process.env.VERCEL_ENV === "production";
}
