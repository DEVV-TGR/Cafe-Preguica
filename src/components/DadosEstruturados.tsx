import { cafe, DIAS, type DiaDaSemana } from "@/data/cafe";
import { marca, redes } from "@/data/marca";
import { URL_SITE } from "@/lib/site";

/**
 * `schema.org/CafeOrCoffeeShop`.
 *
 * É o que faz o Google mostrar morada e horário no painel lateral em vez de os
 * adivinhar de agregadores desatualizados — e para um negócio pequeno, o painel
 * do Google é muitas vezes a primeira coisa que alguém vê, antes do site.
 *
 * ## Um objeto, não um array
 *
 * ⚠️ **Não transformar isto num array**, nem que um dia haja uma segunda casa.
 * Um array não tem `@context`, e quem lê dados estruturados costuma fazer
 * `JSON.parse(bloco)["@context"].toLowerCase()` para normalizar o valor; com um
 * array à frente, isso é `undefined.toLowerCase()` e rebenta no browser de
 * quem tiver a extensão errada instalada. Se houver segunda casa, são **dois
 * blocos `<script>` independentes**, cada um com o seu `@context`.
 *
 * ## Só entra o que está confirmado
 *
 * Um `openingHours` inventado não fica no site: propaga-se para fora e passa a
 * ser o horário que o Google mostra a toda a gente, incluindo a quem nunca
 * abriu esta página. A `null` no JSON, a propriedade nem chega a ser escrita.
 */

/** Os dias em inglês, como o schema.org os quer. A ordem segue a de `DIAS`. */
const DIA_SCHEMA: Record<DiaDaSemana, string> = {
  segunda: "Monday",
  terca: "Tuesday",
  quarta: "Wednesday",
  quinta: "Thursday",
  sexta: "Friday",
  sabado: "Saturday",
  domingo: "Sunday",
};

function horarioEstruturado() {
  if (!cafe.horarios) return {};

  const abertos = DIAS.flatMap((dia) => {
    const horario = cafe.horarios![dia];
    /* Um dia encerrado não gera entrada: o schema.org lê a ausência como
       fechado, e escrever uma entrada vazia seria dizer outra coisa. */
    if (!horario) return [];
    return [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${DIA_SCHEMA[dia]}`,
        opens: horario.abre,
        closes: horario.fecha,
      },
    ];
  });

  return abertos.length > 0 ? { openingHoursSpecification: abertos } : {};
}

export function DadosEstruturados({ descricao }: { descricao: string }) {
  const dados = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: marca.nome,
    description: descricao,
    url: URL_SITE,
    ...(cafe.morada
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: cafe.morada,
            addressCountry: "PT",
            ...(cafe.codigoPostal ? { postalCode: cafe.codigoPostal } : {}),
            ...(cafe.cidade ? { addressLocality: cafe.cidade } : {}),
          },
        }
      : {}),
    ...(cafe.telefone ? { telephone: cafe.telefone } : {}),
    ...(cafe.email ? { email: cafe.email } : {}),
    ...(redes.length > 0 ? { sameAs: redes } : {}),
    ...horarioEstruturado(),
    ...(cafe.aceitaAnimais !== null
      ? {
          amenityFeature: {
            "@type": "LocationFeatureSpecification",
            name: "Pets allowed",
            value: cafe.aceitaAnimais,
          },
        }
      : {}),
    hasMenu: `${URL_SITE}/ementa`,
  };

  return (
    <script
      type="application/ld+json"
      /* Alimentado por `cafe.json` e `marca.json`, os dois validados por `zod`
         e sem entrada de utilizador. É o único `dangerouslySetInnerHTML` do
         site — ver o comentário da CSP em `src/lib/cabecalhos.ts`. */
      dangerouslySetInnerHTML={{ __html: JSON.stringify(dados) }}
    />
  );
}
