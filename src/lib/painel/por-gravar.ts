/*
  Se há alterações por gravar no ecrã que está aberto.

  Os editores (carta e casa) já avisavam com o `beforeunload` ao fechar o
  separador do browser. Mudar de secção pelos separadores do topo não fecha
  nada — é navegação do lado do cliente — e por isso passava sem aviso, e o
  trabalho perdia-se. Os editores ligam isto; os separadores perguntam antes de
  sair.

  Um objeto de módulo, e não estado do React: quem escreve e quem lê estão em
  árvores diferentes (o editor na página, os separadores no layout), e nenhum
  deles precisa de se desenhar outra vez quando isto muda.
*/
export const porGravar = { ativo: false };

export const PERGUNTA = "Tens alterações por gravar. Sair desta secção e perdê-las?";
