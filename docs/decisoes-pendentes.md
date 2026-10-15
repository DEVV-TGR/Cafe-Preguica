# Decisões pendentes

O que ainda não está decidido, com o custo de cada lado escrito. Uma decisão que
se toma aqui evita a conversa de a desfazer daí a dois meses.

---

## 0. Revisão legal de 2026-10-15 — o que falta para fechar as páginas legais

A revisão corrigiu o que dependia só do código (prazos que não se cumpriam,
prova do consentimento, a carta secreta que se perdia ao cancelar, o que fica no
browser) e reescreveu `/privacidade`, `/cookies` e `/informacao-legal` em PT e
EN. **Não é um parecer jurídico e não declara conformidade.** O que está abaixo
falta, e as páginas dizem-no onde o leitor o vê. O build lista os campos em
falta (`pendenciasLegais()` em `src/data/cafe.ts`).

### A. Dados que só a casa (ou o contabilista) pode dar — bloqueiam a versão pública

Não se preenchem por pesquisa: nem Google, nem agregadores, nem Portal da
Justiça (regra do `AGENTS.md`).

1. **Quem explora a casa** (`cafe.operador`): nome completo ou firma, forma
   jurídica, NIF/NIPC, sede ou domicílio profissional. Se for sociedade, também
   a conservatória e a matrícula e o capital social (CSC, art. 171.º) — a um
   empresário em nome individual não se pedem. Hoje a página diz "por publicar".
2. **O email para pedidos sobre dados pessoais** (`operador.emailPrivacidade`).
   Até lá, a política usa o email geral da casa (`cafepreguica@sapo.pt`), que
   está confirmado como contacto, mas não como o escolhido para isto.
3. **Encarregado de proteção de dados**: a política não fala de nenhum. Em regra
   um café não é obrigado a designar; se a casa tiver designado, entra o contacto.
4. **Resolução de litígios**: confirmar que o CICAP é a entidade a indicar para
   esta operação (competente para Valongo; tem limites de valor e de matéria) e
   se a casa aderiu a algum centro (`litigios.adesao`, hoje `null`: a página não
   fala de adesão). Pedir prova se houver adesão.
5. **Livro de Reclamações Eletrónico**: confirmar que a casa está registada na
   plataforma e se encontra pelo nome ou pelo NIF. O link do site é o geral da
   plataforma, e isso não é defeito — mas não prova o registo. O livro em papel
   e quem responde às reclamações (15 dias úteis) são da operação da casa.
6. **Serviços à distância**: há encomendas, reservas com pagamento, *takeaway*
   contratado por telefone ou email? Mudam a análise de contratação à distância.

### B. Decisões do responsável — o código tem uma proposta, a casa confirma

| o quê | o que está implementado | porquê esta proposta |
|---|---|---|
| Prova do consentimento depois de cancelar | 3 anos (`PRAZO_DA_PROVA_S`), apagada pelo Redis | tempo para responder a uma reclamação ou à CNPD sobre envios feitos enquanto a inscrição existia; **não é um prazo legal** |
| Contactos cancelados no Resend | ficam marcados "cancelado" até a pessoa pedir o apagamento ("Apagar de vez") | a marca é o que impede um reenvio; **alternativa a considerar**: apagar o contacto logo no cancelamento e ficar só a prova, porque ninguém volta à lista sem um link novo |
| Carta secreta | **decidido pelo Tomás (2026-10-15)**: continua a ser o extra de quem recebe as novidades; quem cancela não a perde no browser onde a abriu; a chave não leva o email; a secção diz "peça a carta secreta ao balcão" | **risco assumido**: a CNPD critica condicionar conteúdos ao consentimento para marketing (Diretriz 1/2022, § 70); o EDPB admite incentivos se a escolha for livre (Diretrizes 05/2020) — a alternativa do balcão é o que sustenta essa escolha. Convém validar com jurista. **Confirmar com a casa que o balcão mostra a carta a quem a pedir**, senão a frase promete o que não acontece. As alternativas mais seguras (carta sem email, ou novidades numa caixa à parte) ficam no histórico do commit `2e3b1cd` |
| "Lembrar a carta neste aparelho" | 90 dias, sem renovar | uma estação de visitas; era 180 dias, renovados e sem escolha |
| "Não mostrar mais" o convite | 6 meses | pedido explícito; antes "inscrito" ficava para sempre, mesmo sem confirmar |
| Contagens das mesas | sem prazo (só números); últimas 300 leituras com hora exacta, apagadas após um ano sem leituras | não há dado de pessoa nas estruturas; **considerar** guardar só a hora (sem minutos) nas últimas leituras, ou dar-lhes prazo |
| Email nas mensagens dos commits do painel | mascarado (`d••••••m@gmail.com`), num repositório público | identifica um pouco a pessoa da equipa; **considerar** tirar o email da mensagem e deixar só "pelo painel" |

### C. Contas e contratos dos prestadores — configuração de produção, fora do código

1. **Contas definitivas** de Vercel, Resend (painel e newsletter), Upstash e
   GitHub: quem é o titular (a casa ou a DevPlus) e quem tem acesso.
2. **Acordos de tratamento de dados** (RGPD, art. 28.º) aceites em cada conta,
   com as cláusulas contratuais-tipo; ver se o prestador continua certificado
   no Data Privacy Framework quando a política o invoca. Um DPA publicado no site
   do prestador não prova que esteja aceite na conta.
3. **Acordo entre a casa e a DevPlus** como subcontratante, se é a DevPlus que
   gere as contas.
4. **Regiões e prazos**: região do Upstash e réplicas; prazo dos registos da
   Vercel (depende do plano e de produtos como Observability ou Drains); prazo
   dos registos de envio na Resend; cópias de segurança do Upstash. A política
   remete para "o prazo do plano" em vez de inventar números — quando se
   souberem, entram na página.
5. **Resend**: confirmar que o *tracking* de aberturas e cliques está desligado
   (o código não o pede, mas a conta pode tê-lo ligado — se estiver ligado, a
   política tem de o dizer); **configurar o webhook** `contact.updated`
   (`docs/NEWSLETTER.md`) — sem ele, quem cancela pelo link do email não fica
   com a retirada na prova; migrar a lista de testes para a conta definitiva sem
   perder as provas (a chave da prova é o resumo do email, não depende da conta).

### D. O que esta revisão mudou para quem já usava o site

- Os subscritores de antes de 2026-10-15 **não têm prova registada** — o painel
  mostra-os como "sem confirmação registada". Se a casa quiser a prova deles,
  o caminho é pedir-lhes uma reconfirmação.
- Os links de confirmação `n1` em trânsito deixaram de abrir (não traziam o
  texto do consentimento); a página manda pedir outro.
- Quem tinha a nota "inscrito" no `localStorage` volta a ver o convite, uma vez
  por visita, até se inscrever ou carregar em "não mostrar mais".
- As chaves antigas da carta (com email) trocam-se sozinhas na primeira visita.
- Os aparelhos do painel deixam de ficar lembrados por defeito: quem entrar com
  código e quiser o atalho marca a caixa.

### E. Ao lado, por ver

- O telefone no rodapé e nos contactos não diz o preço da chamada. O DL 59/2021
  pede essa indicação junto dos números divulgados para contacto do consumidor
  (ver a FAQ da ASAE); confirmar com a casa se é rede fixa.

---

## 1. Formulário de contacto — **em aberto**

Hoje não há. Os contactos são links diretos (telefone, email, direções).

O site já recebe **um** dado de visitantes: o email de quem se inscreve na
newsletter (ver `docs/NEWSLETTER.md`). Metade do que está escrito em baixo já
existe por causa dela — a rota em `/api`, o `zod` à entrada, o isco, os limites
no Upstash e o Resend — e as páginas de privacidade e cookies já foram revistas
uma vez. Um formulário de contacto seria mais uma rota ao lado dessa.

### Se ficar assim

Nada a fazer. É a posição mais defensável numa auditoria e a mais barata de
manter: sem segredos, sem superfície de abuso, sem obrigações de RGPD, sem
serviço de email para pagar e manter.

Para um café, o telefone costuma ganhar ao formulário — quem quer reservar uma
mesa ou perguntar se há sopa liga, não escreve.

### Se entrar

É trabalho real, e faz-se assim:

- `src/app/api/contacto/route.ts`, um *route handler* POST.
- Validação com `zod` à entrada — o mesmo padrão de `src/data/`, mas aqui sobre
  input de fora, que é o caso em que a validação é obrigatória e não higiene.
- *Honeypot*: um campo escondido que só um robô preenche. Custa nada e apanha a
  maioria do spam automático.
- *Rate limiting* por IP. Sem isto, o formulário é uma forma de alguém mandar
  mil emails à casa numa tarde, ou de gastar a quota do serviço de envio.
- Envio pelo [Resend](https://resend.com), que o painel e a newsletter já usam
  (`RESEND_API_KEY` e `RESEND_NEWSLETTER_*`, no `.env.example`).
- **A CSP já está pronta**: `form-action 'self'` e `connect-src 'self'` já lá
  estão e cobrem um POST para o próprio domínio. Não é preciso mexer-lhe.

E há duas coisas que **têm** de ser feitas ao mesmo tempo, não depois:

- ⚠️ **Rever `/privacidade`.** Hoje a página declara um só dado de visitantes,
  o email da newsletter. Com formulário passa a haver nome, email e mensagem, e
  é preciso declarar a finalidade, o fundamento e quanto tempo se guarda.
- ⚠️ **Rever `/cookies`** se o serviço escolhido puser algum. Se puser, deixa de
  se poder dizer que não há cookies, e entra banner de consentimento.

### O que falta para decidir

Perguntar ao cliente se quer receber mensagens escritas ou se o telefone chega.

---

## 2. Estatísticas de visitas — **não há, e é uma escolha**

Não há nenhuma ferramenta de análise. Ninguém sabe quantas pessoas visitam o
site.

O Vercel Analytics seria o candidato natural: serve o script do próprio domínio
(`/_vercel/insights/`), não usa cookies e não passaria a CSP a exigir mudanças.
Ficou de fora para já porque acrescenta uma dependência e uma linha na página de
privacidade a troco de um número que, num site de montra de um café, ninguém vai
olhar duas vezes.

⚠️ Se entrar, é preciso rever `/privacidade` e o passo do CI que verifica que o
HTML não carrega recursos de terceiros — o script é servido do próprio domínio,
por isso deve passar, mas convém confirmar em vez de assumir.

---

## 3. Mapa — **há, e é nosso**

A página inicial tem um mapa na secção "Onde estamos", escuro e dourado, e
**não é o Google Maps**: é um SVG desenhado a partir do OpenStreetMap por
`npm run mapa` (`scripts/desenhar-mapa.mjs`) e servido do próprio domínio.
Quem visita não faz nenhum pedido a terceiros, por isso a CSP, `/cookies` e
`/privacidade` ficam como estavam.

O que se perde: o mapa não se arrasta nem faz zoom. Para isso há o botão
"Abrir no Google Maps", que é um link normal.

⚠️ **O crédito "© contribuidores do OpenStreetMap" tem de ficar visível** junto
ao mapa — é condição da licença ODbL.

Um `<iframe>` do Google Maps continua a ser a opção cara: exige abrir
`frame-src` e `img-src` a domínios da Google na CSP, põe um terceiro a ver
**quem visita o site**, e arrasta o banner de consentimento e a revisão das
duas páginas legais. E nem sequer deixa mudar as cores.

---

## 4. Visibilidade do repositório — **público**

O `DEVV-TGR/Cafe-Preguica` está público, como os outros da org.

Enquanto for um template para mostrar ao cliente, vale a pena pesar: moradas e
horários são informação pública de qualquer forma, mas um repositório privado
evita que a demonstração seja indexada e que se veja o rascunho antes de haver
acordo. Mudar é `gh repo edit --visibility private` e não toca no código.

---

## 5. Domínio — **resolvido**

`cafepreguica.pt` é do cliente (registado na Amen, impresso no rodapé do menu)
e já aponta para a Vercel: `cafepreguica.pt` redireciona (308) para
`https://www.cafepreguica.pt`, com HTTPS válido.

O `src/lib/site.ts` assume `https://www.cafepreguica.pt` quando o
`NEXT_PUBLIC_SITE_URL` não está definido. Antes assumia
`https://cafe-preguica.vercel.app`, e como a variável nunca foi definida na
Vercel, o site publicado mandava para a demonstração o link de confirmação da
newsletter, o `sitemap.xml`, o `robots.txt`, o canonical e as imagens de
partilha.

Falta, na Search Console, adicionar `www.cafepreguica.pt` e submeter o sitemap.

---

## 6. Vídeo — **não há, e faz falta**

A página inicial não tem um único acto de rolagem sobre vídeo, e a razão é
simples: **não existe um clipe da casa**. Tudo o que há são 19 fotografias.

Um bar faz-se de movimento — o gelo a cair, a lima a ser espremida, o copo a
encher. Dez segundos de telemóvel, filmados ao balcão numa noite qualquer, dariam
para o acto mais forte que a página pode ter: a imagem a avançar debaixo da roda
do rato, ao ritmo de quem rola.

Custa uma ida lá com o telemóvel. É provavelmente o melhor retorno por hora de
trabalho que este site ainda tem por gastar.

---

## 7. Fotografias — **derivadas do Instagram**

As imagens em `public/casa/` foram descarregadas do perfil público da casa, a
1080 px de largura. São fotografias do próprio negócio e é o próprio negócio que
as vai publicar, por isso não há problema de origem — mas há de qualidade: 1080 px
é o tecto do que o Instagram serve, e o Instagram já as comprimiu uma vez.

Com os ficheiros originais, a página pode ter fotografias maiores e um primeiro
acto com imagem em vez de só tipografia.
