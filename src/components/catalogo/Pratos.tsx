import { artigos, exigirEmDestaque } from "@/data/ementa";
import { formatarPreco } from "@/lib/preco";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Ampliar, type GrupoDoVisor } from "@/components/Visor";
import { fotoDoVisor } from "@/lib/visor";

/**
 * # Para partilhar: um prato de cada vez
 *
 * O carril dos cocktails mostra três ou quatro cartões ao mesmo tempo, porque o
 * que ali interessa é a **variedade**: os cocktails todos, e a sensação de que
 * há muitos. Aqui interessa o contrário — o prato em grande, sozinho, com o
 * nome e o preço ao lado. Por isso os painéis têm a **largura do ecrã**: entra
 * um, sai um, entra o seguinte.
 *
 * É o mesmo dispositivo do motor (`pan`) e uma leitura completamente diferente,
 * e é a largura dos itens que faz toda a diferença.
 *
 * ## Anda ao contrário dos cocktails
 *
 * Lá o carril corre para a esquerda; aqui corre para a **direita**, com o
 * título a abrir do lado direito e os pratos a entrar pela esquerda. É o
 * contraste entre as duas secções, pedido pelo Tomás.
 *
 * ⚠️ O motor só sabe andar para a esquerda, e o motor não se toca. Por isso o
 * `.pg-pratos-espelho` vira o carril ao espelho e cada painel volta a virar-se
 * lá dentro (ver `catalogo.css`): o motor continua a empurrar para a esquerda
 * e o que se vê anda para a direita. O HTML fica na ordem de leitura.
 *
 * ## Os pratos
 *
 * As preguiçinhas, a tábua mista e as tostas — os três que o cliente escolheu
 * (2026-10-08). Acrescentar um prato é dar nome à fotografia no
 * `scripts/importar-fotos.mjs` (as da sessão do Rafael em `NOMES_SESSAO`) e
 * acrescentar uma linha a `PRATOS` aqui.
 *
 * Esta é a secção que mais ganha com uma ida lá com o telemóvel: uma tábua a
 * ocupar o ecrã inteiro vale mais do que qualquer coisa que se escreva à volta
 * dela.
 *
 * O preço e o nome vêm da carta, nunca escritos aqui à mão — senão passava a
 * haver dois preços para o mesmo prato, o do site e o do balcão. No painel das
 * tostas só o título é das mensagens; a lista e o "desde" são da carta.
 *
 * Um toque num prato abre-o inteiro no visor (`components/Visor.tsx`), com os
 * outros pratos ao lado para deslizar.
 */

/**
 * Os painéis, pela ordem em que passam. Um painel é de **um artigo** — nome,
 * descrição e preço da carta, pelo `id` em `chave` — ou de **uma lista**: um
 * título das mensagens (`textos[chave].nome`) com os nomes dos artigos por
 * baixo e o preço do mais barato.
 */
const PRATOS: readonly {
  /** O `id` do artigo, ou a chave do painel de lista em `textos`. */
  chave: string;
  /** Os artigos de um painel de lista, pela ordem em que aparecem. */
  lista?: readonly string[];
  foto: string;
  pequena: number;
  grande: number;
}[] = [
  /* As tostinhas quadradas à volta da taça de batata **são as preguiçinhas**
     (o cliente, 2026-10-08). Esteve aqui como bocadinhos de pão com chouriço,
     porque a descrição dos bocadinhos também fala da batata e do tabasco — mas
     os bocadinhos são pão enrolado, e têm as fotografias deles na ementa. */
  { chave: "preguicinhas-com-queijo", foto: "/casa/tabua-partilha", pequena: 640, grande: 1080 },
  /* No lugar da torrada com compota, a pedido do cliente. */
  { chave: "tabua-mista", foto: "/casa/tabua-mista", pequena: 640, grande: 1080 },
  /* A fotografia é de duas saloias, a mista e a de atum, mas o painel é das
     tostas todas: o cliente quis a lista, com o cachorro, e por esta ordem. */
  {
    chave: "tostas",
    lista: ["queijo-fiambre", "pasta-de-atum-e-queijo", "presunto-queijo", "cachorro-xl"],
    foto: "/casa/tostas-saloias",
    pequena: 640,
    grande: 1080,
  },
];

for (const { chave, lista } of PRATOS) {
  for (const id of lista ?? [chave]) exigirEmDestaque(id, "Pratos.tsx");
}

/** Um painel já resolvido contra a carta: o que a página escreve. */
type Painel = (typeof PRATOS)[number] & {
  titulo: string;
  /** A descrição da carta, nos painéis de um artigo. */
  descricao?: string;
  /** Os nomes da carta, nos painéis de lista. */
  nomes?: string[];
  preco: string | null;
  /** A linha de baixo no visor. */
  legenda: string;
};

export function Pratos({
  locale,
  nome,
  facto,
  dado,
  textos,
  desde,
  verMais,
  verMaisFacto,
  verMaisAcao,
  ampliar,
}: {
  locale: Locale;
  nome: string;
  facto: string;
  /** "Desde 1,85 €". Sem preço nenhum na carta, não há linha. */
  dado?: string;
  /** Por `chave`: o texto alternativo da fotografia e, nos painéis de lista, o título. */
  textos: Record<string, { alt: string; nome?: string }>;
  /** "Desde {preco}", com o `{preco}` por preencher — o preço dos painéis de lista. */
  desde: string;
  verMais: string;
  verMaisFacto: string;
  verMaisAcao: string;
  /** "Ampliar a fotografia" — o começo do nome do botão de cada prato. */
  ampliar: string;
}) {
  /* Um artigo escondido já não se serve: sai do painel, ou da lista. */
  const naCarta = (id: string) => artigos.find((a) => a.id === id && !a.escondido);

  /* Só os pratos que existem na carta: o grupo do visor e os painéis saem da
     mesma lista, para a posição de cada um no visor bater certo. */
  const presentes = PRATOS.flatMap((prato): Painel[] => {
    if (prato.lista) {
      const daLista = prato.lista.flatMap((id) => naCarta(id) ?? []);
      if (daLista.length === 0) return [];
      /* O mais barato conta com o pão de forma (`precoSecundario`): é o preço
         mais baixo por que se pede uma destas tostas. */
      const precos = daLista
        .flatMap((a) => [a.preco, a.precoSecundario])
        .filter((p): p is number => p !== null);
      const titulo = textos[prato.chave]?.nome ?? "";
      return [
        {
          ...prato,
          titulo,
          nomes: daLista.map((a) => a.nome[locale]),
          preco:
            precos.length > 0
              ? desde.replace("{preco}", formatarPreco(Math.min(...precos), locale))
              : null,
          legenda: titulo,
        },
      ];
    }

    const artigo = naCarta(prato.chave);
    if (!artigo) return [];
    const preco = artigo.preco === null ? null : formatarPreco(artigo.preco, locale);
    return [
      {
        ...prato,
        titulo: artigo.nome[locale],
        descricao: artigo.descricao?.[locale],
        preco,
        legenda: preco ? `${artigo.nome[locale]} · ${preco}` : artigo.nome[locale],
      },
    ];
  });

  const grupo: GrupoDoVisor = {
    nome,
    fotos: presentes.map(({ chave, foto, pequena, grande, legenda }) =>
      fotoDoVisor(foto, textos[chave]?.alt ?? "", [legenda], pequena, grande),
    ),
  };

  return (
    <section
      id="partilhar"
      data-sc-act="pan"
      data-sc-span="2.6"
      data-sc-drift="#140d08"
    >
      <div data-sc-stage>
        <div className="pg-pratos-espelho">
          <div className="pg-pratos" data-sc-pan="0.04">
            <div className="pg-pratos__abertura">
              <div className="pg-rotulo">
                <h2 className="pg-rotulo__nome">{nome}</h2>
                <p className="pg-rotulo__facto">{facto}</p>
                {dado && <p className="pg-rotulo__dado">{dado}</p>}
              </div>
            </div>

            {/* Um `id` que deixou de existir na carta aparece como um painel em
                falta, não rebenta a página — ficou de fora em `presentes`. */}
            {presentes.map(({ chave, foto, pequena, grande, titulo, descricao, nomes, preco }, i) => {
              return (
                <article key={chave} className="pg-prato">
                  <figure>
                    <Ampliar grupo={grupo} indice={i} rotulo={`${ampliar}: ${titulo}`}>
                      <img
                        src={`${foto}.webp`}
                        srcSet={`${foto}-${pequena}.webp ${pequena}w, ${foto}.webp ${grande}w`}
                        sizes="(min-width: 52rem) 45vw, 88vw"
                        width={1080}
                        height={1440}
                        alt={textos[chave]?.alt ?? ""}
                        loading="lazy"
                        decoding="async"
                      />
                    </Ampliar>
                  </figure>
                  <div className="pg-prato__texto">
                    <h3 className="pg-rotulo__nome">{titulo}</h3>
                    {nomes ? (
                      <ul className="pg-rotulo__facto">
                        {nomes.map((n) => (
                          <li key={n}>{n}</li>
                        ))}
                      </ul>
                    ) : (
                      descricao && <p className="pg-rotulo__facto">{descricao}</p>
                    )}
                    {preco && <p className="pg-prato__preco">{preco}</p>}
                  </div>
                </article>
              );
            })}

            {/* O fecho do carril: a continuação natural quando os pratos acabam. */}
            <div className="pg-pratos__fecho">
              <div className="pg-rotulo">
                <h3 className="pg-rotulo__nome">{verMais}</h3>
                <p className="pg-rotulo__facto">{verMaisFacto}</p>
              </div>
              <p className="mt-5">
                <Link href="/ementa" className="pg-botao">
                  {verMaisAcao}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
