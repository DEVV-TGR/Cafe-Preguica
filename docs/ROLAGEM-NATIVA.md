# Correção dos carris e animações de rolagem

Documento de passagem de contexto para o Claude e para quem continuar o projeto.

- Data: 11 de outubro de 2026.
- Branch: `codex/carris-rolagem-fluida`, criada no checkout principal, sem worktree.
- Commit da implementação: `fdb03d2` — «Liga carris e deixas à rolagem nativa do browser».
- Estado: implementação e testes locais concluídos; experiência num iPhone físico e publicação ainda por validar.

## O problema e a decisão

Nos vídeos fornecidos pelo Tomás, os cocktails e os pratos deslocam-se de forma irregular quando se rola a página. Os Reels e as avaliações também apresentam mudanças pouco fluidas.

Esses «carrosséis» são carris horizontais conduzidos pela rolagem vertical (`data-sc-pan`). Não são o componente `Carrossel.tsx`, que passa as fotografias de «A casa» e das aberturas da ementa. Esse componente não foi alterado nesta correção.

O motor antigo calcula os destinos em JavaScript, a partir dos eventos `scroll`. Se o browser já avançou a rolagem mas ainda não entregou um evento à página, o carril fica no destino anterior. Uma transição de 140 ms pode suavizar a chegada ao próximo destino, mas continua dependente da próxima atualização do JavaScript.

A decisão foi ligar os carris e as deixas dos actos presos a uma `ViewTimeline` nativa. A animação passa a seguir a posição de rolagem conhecida pelo browser. O JavaScript monta as animações e mede os tamanhos; deixa de precisar de fornecer a posição visual a cada evento para estes efeitos.

## O que foi observado e o que foi demonstrado

Foram analisadas as três gravações:

- `ScreenRecording_10-11-2026 12-10-38_1.MP4`;
- `ScreenRecording_10-11-2026 13-31-53_1.MP4`;
- `ScreenRecording_10-11-2026 15-41-36_1.MP4`.

As gravações têm aproximadamente 60 quadros por segundo. Isso é a cadência da gravação, não uma medição dos FPS do Safari. Há movimento irregular dos carris e momentos em que partes do conteúdo permanecem iguais enquanto a barra nativa de rolagem continua a deslocar-se. Algumas partes fixas podem ser fases intencionais do `sticky`; o vídeo, sozinho, não prova um bloqueio geral da página nem identifica o custo de CPU ou GPU.

A evidência mais útil veio do código e de uma reprodução controlada:

1. Em `public/scrollcraft/scrollcraft.js`, o ouvinte de `scroll` agenda `read()` com `requestAnimationFrame`.
2. `read()` calcula o progresso e escreve o `transform` dos carris e o `transform`/`opacity` das deixas.
3. Num teste local, colocou-se o carril em 25% do percurso. Depois bloqueou-se a entrega dos eventos `scroll` ao motor, mantendo a rolagem da página, e avançou-se para 50%.
4. O carril antigo ficou cerca de **398 px atrás** da posição esperada, mesmo com a transição de 140 ms.
5. Um protótipo com `ViewTimeline` acompanhou a mesma mudança com erro inferior a **1 px**, tanto em Chromium como em WebKit.

Este teste demonstra a dependência dos eventos e a independência da solução nativa. Não reproduz toda a física de um gesto num iPhone e não substitui a validação nesse dispositivo. Não se confirmou o modelo do iPhone nem a versão do iOS dos vídeos.

## Porque as tentativas anteriores não resolveram tudo

As alterações já existentes foram respeitadas e analisadas:

| Tentativa | O que resolve | Limite que permanece |
| --- | --- | --- |
| Transições lineares de 140 ms (`502813c`) | Preenchem parte do intervalo entre destinos escritos pelo motor. | Acabam antes da próxima atualização se o intervalo for maior; também atrasam a resposta ao parar ou inverter a rolagem. |
| Alteração do comprimento da secção «Para partilhar» (`bbd2ada`) | Ajusta a distância horizontal percorrida por píxel de rolagem ao formato do ecrã. | Não muda a entrega dos eventos nem quem conduz a animação. |
| Maior especificidade nos cues (`fd8e697`) | Faz a transição ganhar ao `transition: none` do CSS do motor na build de produção. | A transição passa a aplicar-se, mas continua a receber os destinos pelo mesmo caminho em JavaScript. |

Essas alterações têm efeitos reais. O ponto em falta era mudar a origem do progresso visual, em vez de continuar a afinar a interpolação entre atualizações do motor.

Não assumir que «o Safari só atualiza dez vezes por segundo» é uma regra universal. O comentário antigo apresentava essa explicação como definitiva; foi substituído por uma descrição da alternativa e da sua limitação.

## Como ficou implementado

### Montagem das animações

[`src/lib/rolagem-nativa.ts`](../src/lib/rolagem-nativa.ts) exporta `montarRolagemNativa()`.

A função verifica a presença de `ViewTimeline` e o suporte dos limites de animação. Nos actos `pan` e `pin`, cria uma timeline com o próprio acto como `subject` e o eixo `block`.

Os limites são `contain 0%` e `contain 100%`. Para uma secção mais alta que o ecrã, esse intervalo corresponde ao percurso durante o qual o ecrã fica dentro da secção: do início ao fim do trecho preso. Usa-se `fill: "both"` para conservar os estados das pontas.

O deslocamento final de cada carril mantém a conta do motor:

```text
excesso = máximo(0, scrollWidth do carril − innerWidth)
deslocamento final = −excesso × (1 + data-sc-pan)
```

Esse valor é guardado em `--pg-carril-fim`. Um `ResizeObserver` e o evento `resize` atualizam a medida quando os tamanhos mudam. Não há um novo ciclo JavaScript a empurrar o carril quadro a quadro.

O espelho CSS dos pratos mantém o sentido contrário ao dos cocktails. O desenho, as fotografias, os textos e os percursos escolhidos anteriormente foram preservados.

### As deixas dos Reels e das avaliações

[`src/lib/quadros-da-rolagem.ts`](../src/lib/quadros-da-rolagem.ts) converte os valores de `data-sc-cue` em quadros de animação.

`quadrosDaDeixa()` conserva a semântica usada na página:

- Um número: entrada nesse progresso, rampa de 0,18 e permanência até ao fim.
- Vários números: início, fim e rampas proporcionais à janela; as rampas omitidas usam 0,3.
- `0 1 0 0`: visível durante todo o percurso.
- Deslocamento vertical de acordo com `data-sc-rise`.
- Curva `smoothstep`, expressa por `cubic-bezier(0.333333,0,0.666667,1)`; rampas cortadas pelos extremos mantêm a parte correspondente da curva.

Deixas com `data-sc-kinetic` ficam entregues ao motor. Não há dessas nas secções que motivaram a correção.

### Um detalhe que a revisão apanhou: os links

Animar só a posição e a opacidade não chegava. O motor também escreve `pointer-events`: podia revelar-se um Reel pela timeline nativa e o link continuar desativado pelo estado antigo do motor.

`quadrosDaInteracao()` resolve isso com uma segunda animação, apenas de `pointerEvents`, ligada à mesma timeline. Mantém o limiar do motor: interação quando a visibilidade supera **0,5**. O efeito é separado para não misturar esta propriedade discreta com as animações de opacidade e transformação.

O teste de browser reproduziu primeiro a falha de interação e passou depois da correção. Também verifica que o ponto de toque encontra a cela visível.

### Integração, CSS e limpeza

[`src/components/catalogo/Motor.tsx`](../src/components/catalogo/Motor.tsx) monta as animações nativas depois de montar o motor. Ao desmontar a página, chama a função de limpeza: cancela as animações, desliga os observadores e ouvintes e remove as classes e variáveis temporárias.

[`src/app/catalogo.css`](../src/app/catalogo.css) retira a transição dos elementos com a classe `pg-rolagem-nativa`. Uma transição sobre os destinos inline do motor competiria com a animação nativa e voltaria a introduzir atraso. O seletor tem especificidade suficiente para ganhar ao CSS do motor.

O ficheiro de terceiros `public/scrollcraft/scrollcraft.js` não foi editado. O motor continua montado, incluindo os seus ouvintes e as suas escritas; não foi substituído por completo. As animações nativas conduzem as propriedades dos elementos abrangidos, e o motor continua a servir os outros efeitos e a navegação por foco.

## Compatibilidade e limites

- Sem a API nativa, mantém-se o funcionamento anterior com as transições de 140 ms. Essa alternativa foi testada, mas continua a ter a limitação de depender dos eventos de rolagem.
- Com «reduzir movimento», não se montam estas animações. A mudança da preferência com a página aberta também cancela ou volta a montar os efeitos.
- O parallax do herói, os recortes e a preguiça pendurada não foram migrados nesta alteração.
- Não foram alterados os dados do café, a carta, os preços, os alergénios, as traduções, os cookies ou a CSP. Não foram acrescentados serviços externos nem dependências de produção.
- A implementação não garante, por si só, uma cadência fixa de FPS em todos os aparelhos.

O WebKit documenta suporte de animações ligadas à rolagem no Safari 26 e execução destas animações no compositor no Safari 26.4. A deteção no código é por capacidade, não pelo nome ou pela versão do browser. Referências: [guia de animações ligadas à rolagem](https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/) e [novidades do Safari 26.4](https://webkit.org/blog/17862/webkit-features-for-safari-26-4/#threaded-scroll-driven-animations).

## Testes realizados e como repetir

Os quatro comandos exigidos pelo projeto passaram:

```bash
npm run lint
npm run tipos
npm run mensagens
npm run build
```

Também passou `npm run testes`: **46 testes**, dos quais **15 novos** verificam a conversão das deixas e os limites de interação. Estão em [`testes/quadros-da-rolagem.test.mjs`](../testes/quadros-da-rolagem.test.mjs). Foram escritos primeiro e observados a falhar antes da implementação correspondente.

[`testes/browser/rolagem-nativa.mjs`](../testes/browser/rolagem-nativa.mjs) foi executado contra a build de produção em Chromium e WebKit, nos formatos 390 × 844 e 1440 × 900. Verifica:

- Carris em vários pontos do percurso, incluindo voltar para trás, com eventos `scroll` bloqueados.
- Opacidade das deixas dos Reels e das avaliações.
- Ativação dos links e área de toque dos Reels.
- Foco por teclado visível nos extremos dos dois carris.
- Redimensionamento.
- Redução de movimento à partida e alteração dessa preferência com a página aberta.
- Alternativa quando `ViewTimeline` não existe.

Para repetir, iniciar a build de produção num terminal:

```bash
npm run build
npm run start -- --port 3000
```

Noutro terminal, com Playwright disponível no ambiente:

```bash
node testes/browser/rolagem-nativa.mjs http://localhost:3000
```

Se a biblioteca estiver fora das dependências do projeto, indicar o módulo:

```bash
PLAYWRIGHT_MODULO=/caminho/para/playwright/index.mjs node testes/browser/rolagem-nativa.mjs http://localhost:3000
```

O Playwright usado nesta sessão veio do ambiente de trabalho; não foi instalado no projeto. O teste visita `/en`. Em respostas de `localhost` ou `127.0.0.1`, retira a CSP apenas no contexto de teste, para que o WebKit não force os recursos HTTP para HTTPS. A CSP de produção permanece intacta. O teste espera pela saída da transição inicial da página antes de medir o toque.

## O que falta confirmar no iPhone

A validação automática em WebKit não equivale a executar no Safari do iPhone dos vídeos. Antes de publicar, validar nessa máquina: rolar devagar, fazer um gesto rápido, parar e inverter o sentido nos cocktails e pratos; atravessar as trocas de avaliações; tocar nos Reels; repetir com a barra de endereços expandida e recolhida.

Se continuar irregular, recolher o modelo, a versão do iOS, os passos e uma gravação da versão corrigida. Confirmar primeiro que `.pg-rolagem-nativa` existe nos carris e nas deixas. Se não existir, está a correr a alternativa antiga; aumentar novamente os 140 ms não ativa o mecanismo novo.

Se a classe existir, separar duas questões: a animação continua dependente da entrega de eventos, ou o aparelho está a perder quadros na composição/pintura? O teste com eventos bloqueados cobre a primeira. Para a segunda, é necessário medir o dispositivo. Não considerar a validação física concluída com base apenas nos testes locais.
