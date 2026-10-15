# A newsletter

Quem visita o site pode inscrever-se; quem está no painel escreve e envia.

- **No site:** um convite aparece 8 segundos depois de se entrar, no canto de
  baixo. Nunca na `/ementa` (é para onde os QR das mesas levam).
- **No email:** chega um link de confirmação. A pessoa só fica inscrita depois de
  carregar no botão da página a que esse link leva.
- **No painel:** `/painel/newsletter` — escrever, ver como fica, enviar um teste,
  enviar a todos, ver quem está inscrito e o que já saiu.

---

## Como funciona, em três linhas

Os contactos vivem **no Resend**, num segmento, e não em base de dados nossa nem
no repositório (que é público). O painel pede-lhe a lista quando abre, e envia
por ele. O link para cancelar a inscrição é o do próprio Resend, e funciona sem
fazermos nada.

```
convite no site ── POST /api/newsletter ──▶ email "confirme" (link assinado, 48 h)
                                                     │
página /newsletter/confirmar ── botão ── POST /api/newsletter/confirmar
                                                     │
                                          contacto criado no segmento do Resend
                                                     │
/painel/newsletter ── lista, teste, broadcast para o segmento
```

### Porque é que o email só fica guardado depois da confirmação

O email vai **dentro** do link de confirmação, assinado com a chave `newsletter`
de `lib/painel/chaves.ts`. Até alguém carregar no botão, o endereço não está em
lado nenhum. Quem escrever o email de outra pessoa no convite não a inscreve — e
o duplo passo é a prova de consentimento que a lei pede.

O link abre uma página com um botão, em vez de inscrever ao abrir, porque os
filtros de email das empresas e alguns antivírus seguem todos os links de uma
mensagem. Ver `src/app/api/newsletter/confirmar/route.ts`.

### O email de confirmação tem a cara da newsletter

A mesma moldura (`emailEmHtml`, em `lib/newsletter/corpo.ts`): a faixa do
logótipo, a morada e a assinatura da DevPlus, com um botão "Confirmar
inscrição" e a versão só de texto ao lado. **Sem a linha "Cancelar a
inscrição"**, porque quem o recebe ainda não está inscrito (`cancelar: null`).
Os textos estão em `messages/*.json`, em `newsletter.email`, e seguem a língua
em que a pessoa se inscreveu — a assinatura incluída.

---

## Montar

### Enquanto está em testes (conta da agência)

1. Resend → **Audience → Segments → Create segment**, com o nome
   `Newsletter Preguiça`. Copiar o id.
2. Resend → **API Keys → Create API key**, nome `Newsletter Preguiça`,
   permissão **Full access**. Não reutilizar a `RESEND_API_KEY` do painel: essa
   é normalmente *Sending access*, e com ela a lista de contactos e os envios a
   todos são recusados com 401.
3. Na Vercel, em **Production e Preview** (para se poder testar no PR):

   ```
   RESEND_NEWSLETTER_API_KEY     = a chave do passo 2
   RESEND_NEWSLETTER_REMETENTE   = Café Preguiça <novidades@send.devplus.pt>
   RESEND_NEWSLETTER_SEGMENTO    = o id do passo 1
   ```

   O Upstash e o `PAINEL_EMAILS` também têm de existir em Preview — sem Upstash
   o convite responde "não foi possível enviar agora". Em Preview o painel
   envia o teste mas **não** envia a todos: os inscritos são os de verdade.
4. Redeploy.

> Enquanto a conta for a mesma, os envios da newsletter e os códigos do painel
> partilham os 100 emails por dia do plano gratuito. É por isso que as
> confirmações têm um teto de 30 por dia (`lib/newsletter/limites.ts`) e os
> códigos um de 40: nunca chegam aos 100 juntos. **Não mandar uma newsletter a
> sério a partir desta conta.**

### Quando passar para a conta do Rafael

1. O Rafael cria a conta no Resend com o email dele e convida-nos como membro.
2. Verificar o domínio da casa (Resend → Domains). São uns registos DNS no
   domínio — precisa de quem tiver acesso ao DNS.
3. Criar o segmento, como acima.
4. **Levar os contactos:** no painel, "Descarregar a lista (CSV)", e importá-lo
   no segmento novo (Resend → Audience → Import). Os contactos não passam
   sozinhos de uma conta para a outra.
5. Trocar as três variáveis na Vercel — chave, remetente no domínio da casa,
   segmento novo — e fazer redeploy. O código não muda.
6. Subir o teto diário em `lib/newsletter/limites.ts`, que só existia por causa
   da quota partilhada.

O plano gratuito do Resend deixa ter até 1000 contactos.

---

## O que o painel faz, e o que obriga

- **O teste é obrigatório, e o servidor confere.** "Enviar a todos" só acende
  depois de um teste ter saído com este assunto e este texto, e a acção recusa
  o envio se não encontrar esse teste no Upstash (vale 24 horas e gasta-se com
  o envio). Mudar o texto apaga o teste. Já foi só o ecrã a obrigar: um pedido
  feito à mão enviava a todos um texto nunca testado.
- **Só o site oficial envia a todos.** Numa pré-visualização de um PR as
  variáveis e o segmento são os mesmos, e o envio chegava aos inscritos de
  verdade. Lá, só sai o teste (ver `docs/PAINEL.md`, "Site oficial e versões de
  ensaio").
- **Há uma confirmação** que diz para quantas pessoas vai.
- **A mesma newsletter não sai duas vezes em 15 minutos**, mesmo com dois
  separadores ou um toque duplo (trava no Upstash). Se o envio falhar, a trava
  sai: a tentativa seguinte, depois de o serviço voltar, não diz "já foi
  enviada" sem ter sido.
- **O formato é texto simples:** linha em branco = parágrafo, `**negrito**`, e
  endereços `https://` ficam clicáveis. O rodapé (morada da casa e link de
  cancelar) é posto sozinho.
- **O logótipo vai numa faixa escura no topo**, e a faixa inteira é uma imagem
  (`public/marca/email-cabecalho.png`, feita por
  `scripts/desenhar-cabecalho-email.mjs`): como célula com fundo escuro, o Gmail
  do telemóvel em modo escuro invertia o fundo para branco. Vai por endereço
  absoluto do site em produção — um email não tem ficheiros relativos —, e por
  isso a faixa nova só aparece nos emails depois de o site com ela estar no ar.
- **Assina a DevPlus no fim**, com o ícone (`public/marca/devplus.png`) e um
  trocadilho: "Site feito sem preguiça nenhuma pela DevPlus".
- **As enviadas abrem-se** em `/painel/newsletter/enviada/<id>`, tal como
  saíram, só para ler. O conteúdo é pedido ao Resend, não guardado por nós.
- **As respostas vão para o email da casa** (`email` do `cafe.json`), não para a
  caixa `novidades@`.
- **Só em português.** O convite e a confirmação seguem a língua do site; o
  convite em inglês avisa que a newsletter é escrita em português.
- **Cada contacto tem "Cancelar"** na lista do painel. Cancela no Resend (a
  mesma marca `unsubscribed` do link de cada envio, e não apagar: a lista
  continua a dizer "cancelou"), regista a retirada na prova do consentimento e
  manda à pessoa um email a dizê-lo.
- **E "Apagar de vez"**, para um pedido de apagamento (RGPD, art. 17.º): tira o
  contacto do Resend, a prova do consentimento e a marca do aviso, e não manda
  email nenhum. Não é o mesmo que cancelar.
- **A data de cada contacto é a da última confirmação**, tirada da prova do
  consentimento — não o `created_at` do Resend, que é quando o contacto nasceu e
  não muda com uma reinscrição. O CSV leva as duas, com nomes que dizem o que
  são (`contacto_criado_em`, `ultima_confirmacao`). Quem se inscreveu antes de a
  prova existir (2026-10-15) aparece "sem confirmação registada".

### A prova do consentimento

Revisão legal de 2026-10-15 (`src/lib/newsletter/consentimento.ts`, testes em
`testes/consentimento.test.mjs`). Quem envia marketing tem de conseguir
demonstrar o consentimento — o momento, o contexto e a informação dada (CNPD,
Diretriz 1/2022, §§ 79–81). Por cada pessoa, no Upstash
(`newsletter:consentimento:<sha256 do email>`), uma lista de acontecimentos:

- **consentimento**: quando pediu e quando confirmou, onde (convite ou carta
  secreta), a língua, **a frase exacta que estava ao lado do botão** e a versão
  dela (`VERSAO_DO_TEXTO` em `src/lib/newsletter/convite.ts` — muda-se sempre
  que mudar a frase), e como confirmou (botão depois do email);
- **retirada**: quando, e por onde (painel ou link do email, este pelo webhook).

Sem IP e sem aparelho. A frase viaja assinada dentro do link de confirmação,
para ser a que a pessoa viu e não a que estiver no site 48 horas depois.

Sem prazo enquanto a pessoa está inscrita; **três anos depois da retirada** (uma
proposta, não um prazo legal — ver `docs/decisoes-pendentes.md`); apagada com
"Apagar de vez". **Sem o webhook configurado, a retirada pelo link do email não
chega à prova**, e a prova dessa pessoa fica sem prazo até alguém a cancelar ou
apagar no painel.

### O email de cancelamento

Sempre que alguém deixa de estar inscrito — pelo botão do painel, ou pela
própria pessoa no link de cancelar de um envio —, recebe um email com a cara da
newsletter a dizer que foi cancelado, que a carta secreta continua a abrir, que
se pode voltar a inscrever no site e como pedir o apagamento
(`src/lib/newsletter/cancelamento.ts`).

Sai **uma vez por cancelamento**: o painel avisa, e o Resend, ao ver o
contacto mudar, chama o webhook a seguir — a marca no Upstash
(`newsletter:cancelamento-avisado:<hash>`) faz o segundo não mandar nada.
Quem se volta a inscrever apaga a marca. A marca dura **7 dias** (já durou para
sempre): chega para as repetições do webhook, e depois disso quem trava um
segundo aviso é a retirada registada na prova (`jaRetirou`).

O cancelar pela própria pessoa acontece numa página do Resend, e só se sabe dele
pelo **webhook** (`/api/newsletter/webhook`). Para o montar:

1. Resend (a conta da newsletter) → **Webhooks** → **Add endpoint**:
   `https://www.cafepreguica.pt/api/newsletter/webhook`, evento
   **`contact.updated`**.
2. Copiar o *signing secret* (`whsec_…`) para a Vercel, como
   `RESEND_NEWSLETTER_WEBHOOK_SECRET`, e fazer redeploy.

Sem isto, o cancelar pelo painel avisa na mesma; só quem cancela pelo link
fica sem o email. A assinatura do webhook é verificada à mão
(`src/lib/newsletter/webhook.ts`, com testes em `testes/cancelamento.test.mjs`)
e um pedido sem ela é recusado com 401.

---

## Porque é que não há caixa de "aceito a política"

O consentimento vem do próprio acto de se inscrever, com a informação à vista
antes do botão: o convite diz o que se vai receber, que se pode cancelar, e tem
o link da privacidade. Uma caixa de "li e aceito a política de privacidade"
confunde duas coisas — a política é informação, não um contrato — e não
acrescenta prova nenhuma. A prova é a confirmação por email.

## Os limites do convite

| Regra | Limite | Janela |
|---|---|---|
| Pedidos por email | 2 | 24 h |
| Pedidos por IP | 5 | 1 h |
| Confirmações enviadas ao todo | 30 | 24 h |
| Validade do link de confirmação | — | 48 h |

**Quem já está inscrito não recebe outro email.** Antes de enviar a
confirmação, o servidor pergunta ao Resend se o email já está no segmento e
ativo; se estiver, não envia nada e o convite diz "já está inscrito". Quem
cancelou, ou ainda não confirmou, pode pedir outra vez.

Mais um isco para robôs: um campo escondido que só um robô preenche.

---

## Privacidade e cookies

As duas páginas foram revistas quando isto entrou:

- **`/privacidade`** tem uma secção sobre a newsletter (o que se guarda, para
  quê, a base legal, até quando, como cancelar e como pedir para apagar), e a
  Resend aparece nos serviços de terceiros.
- **`/cookies`** lista tudo o que o site escreve no browser, com prazo e
  porquê: as notas do convite (`inscrito`/`fechado` no `sessionStorage`; "não
  mostrar mais" no `localStorage`, 6 meses, só a pedido) e a chave da carta
  (sessão, ou 90 dias com "lembrar neste aparelho"). O CI continua a verificar
  que nenhuma página devolve `Set-Cookie`.

⚠️ **A Resend guarda os dados nos EUA** (resend.com/security/gdpr, consultado a
2026-10-15: a região de envio europeia não muda o local de armazenamento). A
política diz em que se apoia a transferência (cláusulas contratuais-tipo do DPA
e, havendo certificação, o Data Privacy Framework). **Falta confirmar que o DPA
está aceite na conta definitiva** — ver `docs/decisoes-pendentes.md`.

---

## Em desenvolvimento

- Sem `RESEND_NEWSLETTER_API_KEY`, o link de confirmação **sai no terminal** do
  `npm run dev`, e a confirmação também: o caminho todo experimenta-se sem conta
  de email, mas nenhum contacto é criado.
- O painel abre, deixa escrever e pré-visualizar, e diz que o envio não está
  ligado.
- Sem Upstash, a chave que assina os links vive na memória do processo:
  reiniciar o `npm run dev` invalida os links já enviados.

## Quando alguma coisa corre mal

| O que se vê | O que é |
|---|---|
| O convite diz "não foi possível enviar agora" | Registo da Vercel, `[newsletter]`: Resend recusou, ou faltam variáveis |
| O convite nunca aparece | Já se inscreveu ou fechou nesta visita (`preguica:newsletter` no `sessionStorage`), carregou em "não mostrar mais" (`preguica:newsletter:nao-mostrar` no `localStorage`), ou está na `/ementa` |
| O painel diz que não encontra a lista | `RESEND_NEWSLETTER_SEGMENTO` errado, ou o segmento foi apagado |
| O painel diz que o remetente foi recusado | O domínio de `RESEND_NEWSLETTER_REMETENTE` não está *Verified* nessa conta, à letra |
| Enviada, mas não aparece em "Enviadas" | O Resend ainda a está a processar; recarregar daqui a um minuto |

---

## A carta secreta

Uma secção no fim da `/ementa`, a seguir aos chás, que se abre a quem confirmar
um email — **com ou sem as novidades da casa**. Há três sinais que levam lá:
- um aviso no topo da ementa;
- um item "Carta secreta" no índice;
- a linha "Há mais cocktails na carta secreta" no fim do capítulo dos cocktails.

### Já foi o isco da newsletter, e deixou de ser

Até à revisão legal de 2026-10-15, a carta só abria a quem estivesse inscrito, e
quem cancelava perdia-a. Isso fazia do acesso o preço do consentimento para
marketing, que a CNPD critica (Diretriz 1/2022, § 70: condicionar conteúdos ao
consentimento para marketing não é de admitir); o EDPB admite incentivos em
abstrato, mas exige que retirar o consentimento não traga prejuízo — e perder a
carta era um. A alteração:

| antes | agora |
|---|---|
| escrever um email inscrito abria a carta | escrever um email manda um **link**; a carta abre depois de o confirmar |
| só abria a inscritos | abre a quem confirmar, queira ou não as novidades |
| as novidades vinham com a carta | caixa à parte, **desmarcada** — "Quero também receber as novidades (opcional)" |
| cancelar a newsletter fechava a carta | cancelar não mexe na carta |
| a chave levava o email (base64url, legível) e durava 180 dias, renovados | a chave **não leva nada pessoal**: 24 h no `sessionStorage`, ou 90 dias no `localStorage` com "lembrar neste aparelho", sem renovar |
| a rota dizia se um email estava na lista | a rota só aceita uma chave; não revela quem está inscrito |

**Fica uma decisão da casa**: se a carta deve continuar atrás de um email (é o
que lhe dá o ar de "secreta"), ou abrir sem email nenhum. As duas são
compatíveis com a escolha livre sobre o marketing. Está em
`docs/decisoes-pendentes.md`.

**Como abre:**

1. A pessoa escreve o email, marca ou não as novidades, e carrega em "Enviar o
   link". `/api/newsletter` (com `origem: "carta"`) manda um de três emails —
   ver o cabeçalho da rota.
2. A página de confirmação mostra o botão certo ("Abrir a carta secreta" ou
   "Confirmar e abrir a carta") e a caixa "Lembrar neste aparelho", desmarcada.
3. `/api/newsletter/confirmar` inscreve (se pediu as novidades, com prova) e
   devolve a chave. A `/ementa` abre a carta sozinha com ela.
4. Na carta aberta, "Lembrar neste aparelho durante 90 dias" e "Fechar a carta
   neste aparelho".

As chaves antigas (`c1`, com email) ainda se aceitam uma vez e são trocadas por
uma de sessão; o browser apaga a antiga.

**Os artigos nunca estão no HTML** da `/ementa`, que é estática. Só saem da rota
com uma chave válida. O repositório é público, por isso o segredo é "de bar",
não de cofre.

**Limite:** 30 pedidos por hora por ligação à rota da carta; os pedidos de link
contam nos limites da newsletter (`src/lib/newsletter/limites.ts`).

**Em desenvolvimento**, sem chave do Resend, o link sai no terminal, como o da
newsletter.
