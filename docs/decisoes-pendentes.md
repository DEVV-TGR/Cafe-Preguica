# Decisões pendentes

O que ainda não está decidido, com o custo de cada lado escrito. Uma decisão que
se toma aqui evita a conversa de a desfazer daí a dois meses.

---

## 1. Formulário de contacto — **em aberto**

Hoje não há. Os contactos são links diretos (telefone, email, direções) e o site
é 100% estático: não recebe dados de ninguém.

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
- Envio por [Resend](https://resend.com) ou equivalente. **Passa a haver um
  segredo** (`RESEND_API_KEY`) no painel da Vercel e no `.env.example`.
- **A CSP já está pronta**: `form-action 'self'` e `connect-src 'self'` já lá
  estão e cobrem um POST para o próprio domínio. Não é preciso mexer-lhe.

E há duas coisas que **têm** de ser feitas ao mesmo tempo, não depois:

- ⚠️ **Rever `/privacidade`.** A página diz hoje que o site não recolhe dados
  nenhuns. Com formulário passa a haver nome, email e mensagem, e é preciso
  declarar a finalidade, o fundamento e quanto tempo se guarda.
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

## 3. Mapa na página de contactos — **não há, e é uma escolha**

O botão de direções é um link normal para o Google Maps.

Um `<iframe>` do Maps seria mais bonito e custa caro: exige abrir `frame-src` e
`img-src` a domínios da Google na CSP, e passa a haver um terceiro a ver **quem
visita o site**, mesmo quem nunca carregou no mapa. Isso arrasta consentimento
de cookies atrás, e faz a página `/cookies` passar a mentir.

⚠️ Se o cliente insistir, a decisão é dele — mas tem de vir com o banner de
consentimento e a revisão das duas páginas legais. Não é um `<iframe>` colado e
mais nada.

---

## 4. Visibilidade do repositório — **público**

O `DEVV-TGR/Cafe-Preguica` está público, como os outros da org.

Enquanto for um template para mostrar ao cliente, vale a pena pesar: moradas e
horários são informação pública de qualquer forma, mas um repositório privado
evita que a demonstração seja indexada e que se veja o rascunho antes de haver
acordo. Mudar é `gh repo edit --visibility private` e não toca no código.

---

## 5. Domínio — **existe, e está partido**

⚠️ **`cafepreguica.pt` já é do cliente.** Está registado na Amen e está impresso
no rodapé do menu que a casa entrega às mesas. Mas hoje:

- **Não tem site.** Responde com a página de cortesia da Amen. Quem lê o menu e
  escreve o endereço não encontra nada.
- **O HTTPS está partido.** O certificado servido não corresponde ao domínio, e
  o browser recusa a ligação com um aviso de segurança.

É o candidato natural a `NEXT_PUBLIC_SITE_URL` e resolve-se apontando o DNS para
a Vercel — mas é conversa a ter com quem tem a conta na Amen, e convém saber se
o cliente sabe que o endereço impresso não leva a lado nenhum.

Enquanto não estiver resolvido, o `NEXT_PUBLIC_SITE_URL` não está definido e o
site assume `https://cafe-preguica.vercel.app`. É o que sai hoje no
`sitemap.xml`, no `robots.txt` e nas imagens de partilha.

⚠️ Enquanto isto não estiver resolvido, **cuidado com a indexação**: o
`robots.txt` deixa indexar tudo, e é a demonstração que o Google apanha. Tirar
de lá depois demora. Ver a lista *Antes de publicar* no README.


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
