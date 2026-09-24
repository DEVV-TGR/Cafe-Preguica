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
   o convite responde "não foi possível enviar agora".
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

- **O teste é obrigatório.** "Enviar a todos" só acende depois de um teste ter
  saído com este assunto e este texto. Mudar o texto apaga o teste.
- **Há uma confirmação** que diz para quantas pessoas vai.
- **A mesma newsletter não sai duas vezes em 15 minutos**, mesmo com dois
  separadores ou um toque duplo (trava no Upstash).
- **O formato é texto simples:** linha em branco = parágrafo, `**negrito**`, e
  endereços `https://` ficam clicáveis. O rodapé (morada da casa e link de
  cancelar) é posto sozinho.
- **O logótipo vai numa faixa escura no topo** (`public/marca/email.png`, por
  endereço absoluto do site em produção — um email não tem ficheiros relativos).
- **As enviadas abrem-se** em `/painel/newsletter/enviada/<id>`, tal como
  saíram, só para ler. O conteúdo é pedido ao Resend, não guardado por nós.
- **As respostas vão para o email da casa** (`email` do `cafe.json`), não para a
  caixa `novidades@`.
- **Só em português.** O convite e a confirmação seguem a língua do site; o
  convite em inglês avisa que a newsletter é escrita em português.

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
- **`/cookies`** explica as duas notas que o convite deixa no browser: `inscrito`
  no `localStorage` e `fechado` no `sessionStorage`. Não são cookies, não levam
  identificador e não saem do aparelho — o CI continua a verificar que nenhuma
  página devolve `Set-Cookie`.

⚠️ **A Resend é uma empresa dos EUA.** Antes de a newsletter ir para o público, a
política de privacidade tem de dizer em que base é feita a transferência (o
acordo de tratamento de dados da Resend, e se ela está no EU-US Data Privacy
Framework). A página continua marcada como rascunho por isto e pelo resto.

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
| O convite nunca aparece | Já se inscreveu neste browser (apagar `preguica:newsletter` do armazenamento), ou está na `/ementa` |
| O painel diz que não encontra a lista | `RESEND_NEWSLETTER_SEGMENTO` errado, ou o segmento foi apagado |
| O painel diz que o remetente foi recusado | O domínio de `RESEND_NEWSLETTER_REMETENTE` não está *Verified* nessa conta, à letra |
| Enviada, mas não aparece em "Enviadas" | O Resend ainda a está a processar; recarregar daqui a um minuto |

---

## A carta secreta

O isco da newsletter: uma secção no fim da `/ementa`, a seguir aos chás, que só
abre a quem está inscrito. Há três sinais que levam lá:
- um aviso no topo da ementa;
- um item "Carta secreta" no índice;
- a linha "Há mais cocktails na carta secreta" no fim do capítulo dos cocktails.

**Como abre:**

1. A pessoa escreve o email. `/api/carta-secreta` pergunta ao Resend se está no
   segmento e ativo (`estaInscrito`).
2. **Se está,** a rota devolve os artigos e uma **chave** (o email assinado, 180
   dias), que o telemóvel guarda no `localStorage`. Na visita seguinte a carta
   abre sozinha, e **o servidor volta a perguntar ao Resend de cada vez**: quem
   cancelar a newsletter perde a carta.
3. **Se não está,** o formulário da newsletter aparece ali mesmo. Ao confirmar
   no email, a página de confirmação guarda a chave e tem o botão "Abrir a carta
   secreta".

**Os artigos nunca estão no HTML** da `/ementa`, que é estática. Só saem da rota
depois do "sim" do Resend. O repositório é público, por isso o segredo é "de bar",
não de cofre.

**Limite:** 10 pedidos por hora por ligação. A resposta diz se um email está na
lista, e sem limite servia para testar listas de endereços.

**Em desenvolvimento**, sem chave do Resend, conta como inscrito quem confirmou
nesta sessão do `npm run dev` (o link de confirmação sai no terminal).

⚠️ **Provisório:** os artigos são exemplos, em `src/lib/carta-secreta/artigos.ts`.
O passo seguinte é um campo `secreto` em cada artigo do `ementa.json`, editável
no painel. Como qualquer campo novo, o painel tem de o saber escrever.
