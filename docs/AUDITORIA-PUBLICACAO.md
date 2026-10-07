# Auditoria de publicação — 2026-10-07

Branch `auditoria-publicacao` (a partir de `main` e0c9250). Sem deploy, merge nem push.

## Estado: **bloqueado por decisões do cliente**, e validação incompleta em três pontos

O código não tem nenhum erro conhecido por corrigir. A publicação está bloqueada pelo que só o
cliente pode decidir (ver "Bloqueios"). A validação ficou incompleta em três pontos (ver
"Verificações não realizadas").

## Achados corrigidos (todos reproduzidos antes e verificados depois)

| Gravidade | Achado | Correção |
|---|---|---|
| Alta | O painel de uma Preview da Vercel, ou do `npm start`, gravava no `main` (`NODE_ENV=production`) | `src/lib/ambiente.ts`: só `VERCEL_ENV=production` grava no `main`; fora disso, `PAINEL_GITHUB_RAMO` ou recusa |
| Alta | O `next@16.3.7` está abaixo da versão de segurança de 2026-09-30 (CVE-2026-94484, aplicável ao catch-all); o `npm audit` não o assinalava | `next` e `eslint-config-next` passam a 16.3.8 |
| Alta | Uma newsletter com parágrafos nunca podia ser enviada (o `\r\n` do textarea contra o `\n` do browser) | Normalizado em `lerMensagem` |
| Média | "Enviar a todos" sem teste: uma chamada direta à action enviava; também a partir de uma Preview | O teste fica registado no Redis e é exigido; o envio a todos só sai do site oficial |
| Média | Uma falha no envio deixava a trava posta e respondia "já foi enviada" | A trava é libertada quando o envio falha |
| Média | `allowScripts` ignorado pelo npm 10 (Node 22, no CI) | `.npmrc` com `ignore-scripts=true`, verificado no CI |
| Média | Sem motor ou sem JavaScript, 26 elementos da inicial ficavam invisíveis | `.sc-sem-motor` e `@media (scripting: none)` |
| Média | Com "reduzir movimento", a página chegava aos 4531 px de largura | Os pratos passam a empilhar-se |
| Média | O Tab caía em cartões fora do ecrã e em elementos com opacidade 0 | O foco num acto preso rola até o mostrar |
| Média | O motor acumulava instâncias (4 ao fim de três voltas) | A instância antiga é esvaziada à saída |
| Média | Preços errados nos textos da inicial | Passam a ser calculados a partir da carta (`menorPreco`) |
| Média | Cookies e privacidade contradiziam o código (língua, 3 cookies, Upstash, cancelamento, registos) | Textos PT/EN corrigidos; acrescentada a reclamação à CNPD |
| Média | `verificar-segredos` dava um falso positivo ("Virgin Hurricane") com o `main` atual | Procura por palavra inteira |
| Baixa | Esc fechava o visor e o convite ao mesmo tempo; o visor encolhia para a miniatura errada; `pushState` depois de desmontar; as setas perdiam o foco | `Visor.tsx`, `Convite.tsx` |
| Baixa | O email apagava-se nos formulários com erro (React 19); a carta secreta ficava presa e aceitava respostas fora de ordem | Campos controlados, guarda por pedido, foco no resultado |
| Baixa | Sem `<main>` nem alvo do link de salto na inicial; preços cortados a 320 px; carrossel com hover e foco no mesmo estado; rolagem suave sem `data-scroll-behavior`; bfcache; âncora perdida ao mudar de idioma | Corrigidos |
| Baixa | Email da entrada do painel sem validação; `/painel/x.y` sem CSP; `decodeURIComponent` a rebentar | `src/lib/email.ts`, matcher do proxy, `try` |
| Baixa | SEO: sem `x-default`, sem `og:image`, telefone sem +351, `/sobre` com nota interna | Corrigidos; `/sobre` removida, com 308 para `/#casa` |

Removido, com a prova do grep: `Marca.tsx`, `esquecerSegredo`, o CSS morto `.pg-objeto`, `.pg-placa`,
`.pg-sabor-escolhido` e `[id=porta]`, e as chaves `comum.porConfirmar` e `contactos.ligar`.

## Comandos (build final, commit c7ecb1b)

- `lint` 0, `tipos` 0, `mensagens` ✓ (332 chaves), `build` 0 (com as sentinelas do CI).
- `segredos` 0; testado também que falha com uma fuga plantada.
- `testes` 25/25.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- `npm audit`: 5 altas, a cadeia `braces` via `eslint-config-next`. Só desenvolvimento, sem
  correção que não seja a degradação forçada.
- Passos de servidor do CI corridos localmente: todos verdes.

## Browser (local, build de produção, serviços simulados)

Chromium 151 e WebKit 26.5 (Playwright; o WebKit por HTTPS local). O GitHub, o Resend e o Upstash
foram simulados por interceção do `fetch`, com recusa de qualquer outro destino.

- Interação: as 14 verificações de interação, o foco e a navegação passam nos dois browsers.
- Painel: entrada, códigos, conflito, falha parcial, adulteração, sair e esquecer o aparelho.
- Newsletter: confirmação válida, adulterada, expirada e malformada; limites; carta secreta com o
  Hurricane.
- CLS 0 em todas as páginas medidas; peso local entre 0,6 e 3,6 MB.
- 208 imagens publicadas sem metadados.

## Verificações não realizadas

- Firefox: não instalado. Dispositivos reais: não testados (só simulação).
- A ronda de browser de interação correu antes do commit c2ca466, que só mexe nas ações da
  newsletter; o fluxo da newsletter foi testado depois dele.
- Produção real, a Vercel, HTTPS, DNS e serviços reais: sem acesso, e fora do âmbito.

## Riscos residuais

- Pré-carregamentos de segmento RSC dão 404 no WebKit (interação Next 16 + `next-intl`). A
  navegação funciona, mas fica ruído na consola.
- `somar` faz `INCR` e `EXPIRE` em dois passos.
- O ano do rodapé fica fixo no build.
- O `leitura.css` é carregado na inicial.
- A enumeração de inscritos está limitada a 10 por hora por ligação.
- O motor fica com um ciclo vazio por visita.

## Bloqueios e decisões do cliente

1. **Privacidade:** responsável pelo tratamento e NIF, data da versão (hoje diz "rascunho"), base
   das transferências para os EUA (Resend, Upstash, Vercel).
2. **Domínio:** `cafepreguica.pt` com o HTTPS partido; definir `NEXT_PUBLIC_SITE_URL`; rever a
   indexação da demonstração.
3. **Informação legal:** confirmar o CICAP; identificação do prestador.
4. **Alergénios:** por preencher, com quem está na cozinha.
5. **Wi-Fi:** a palavra-passe está legível em versões antigas de `casa-candeeiro.webp` no
   histórico público do git (commits 197fae6 e 4514cee). Recomenda-se mudá-la.
6. **Branch desatualizada:** o `main` tem fa1c558 (o painel pôs o Hurricane na carta secreta).
   Atualizar a branch antes do merge; não há conflitos com estes ficheiros.
