import { z } from "zod";
import { erroDeFicheiro } from "./erros";
import dados from "./marca.json";

/**
 * Factos sobre a casa — e **só factos**.
 *
 * O texto que descreve o café (a frase do herói, a história, o que se diz sobre
 * o espaço) vive em `messages/pt.json` e `messages/en.json`, porque muda com o
 * idioma. Aqui fica o que é igual nas duas línguas: o nome, o ano, os endereços
 * das redes.
 *
 * Misturar as duas coisas é o erro que se paga meses depois, quando alguém
 * traduz o site e descobre metade do texto num ficheiro que não tem idioma.
 */
/**
 * O endereço de uma rede tem de ser **dessa rede**: `https:` e o domínio certo.
 *
 * Existe por causa do painel, onde qualquer um destes links se muda com dois
 * toques. Um link colado à pressa — ou trocado por quem não devia — mandava os
 * clientes para outro sítio com o ícone do Instagram por cima. Assim só passa o
 * que é mesmo do Instagram, do Facebook, do TikTok ou do Spotify.
 */
function linkDe(...dominios: string[]) {
  return z
    .url()
    .refine((valor) => {
      const url = new URL(valor);
      return (
        url.protocol === "https:" &&
        dominios.some((d) => url.hostname === d || url.hostname.endsWith(`.${d}`))
      );
    }, `tem de ser um endereço https de ${dominios.join(" ou ")}`)
    .nullable();
}

/** Exportado para o painel validar com as mesmas regras do `build`. */
export const EsquemaMarca = z.object({
  nome: z.string().min(1),
  /** Ano de fundação. `null` enquanto não se confirmar com o cliente. */
  fundacao: z.number().int().min(1800).max(new Date().getFullYear()).nullable(),
  /* Os perfis a `null` não aparecem no rodapé. Um link de rede social
     adivinhado leva o visitante à conta de outra pessoa. */
  instagram: linkDe("instagram.com"),
  /* O link de partilha que está no Linktree da casa (`/share/…`) redireciona
     para este. Fica o de destino, que não depende do serviço de partilha. */
  facebook: linkDe("facebook.com"),
  tiktok: linkDe("tiktok.com"),
  /**
   * O perfil da casa no Spotify, com as playlists que tocam no bar e que os
   * clientes pedem. É **só um link**, e não o leitor embebido do Spotify: esse é
   * um `<iframe>` de terceiros com cookies, e obrigava a abrir a CSP e a rever
   * `/cookies` e `/privacidade`. Guardado sem o `?si=` da partilha, que só
   * serve para o Spotify saber quem partilhou.
   */
  spotify: linkDe("open.spotify.com"),
});

export type Marca = z.infer<typeof EsquemaMarca>;

const validado = EsquemaMarca.safeParse(dados);
if (!validado.success) {
  throw erroDeFicheiro("marca.json", validado.error, dados);
}

export const marca: Marca = validado.data;

export type Rede = "instagram" | "facebook" | "tiktok" | "spotify";

/**
 * Os perfis que existem mesmo, **por esta ordem**: é a ordem dos ícones na
 * página. O Instagram vem primeiro porque é onde a casa publica e onde tem mais
 * gente a segui-la.
 */
export const perfis: { rede: Rede; url: string }[] = (
  ["instagram", "facebook", "tiktok", "spotify"] as const
).flatMap((rede) => (marca[rede] ? [{ rede, url: marca[rede] }] : []));

/**
 * O nome de utilizador que se lê no próprio link: `@cafepreguica` no Instagram
 * e no TikTok, `cafepreguica` no Spotify. Tirado do link para não haver dois
 * sítios a dizer a mesma coisa.
 *
 * O Facebook dá `null`: o perfil da casa é um `profile.php?id=…`, sem nome de
 * utilizador, e quem o mostra decide o que pôr em vez dele.
 */
export function utilizador(rede: Rede, url: string): string | null {
  const caminho = new URL(url).pathname.split("/").filter(Boolean);
  if (rede === "spotify") return caminho[1] ?? null;
  if (rede === "facebook") return null;
  const nome = caminho[0]?.replace(/^@/, "");
  return nome ? `@${nome}` : null;
}

/** Os mesmos endereços, soltos, para o `sameAs` dos dados estruturados. */
export const redes: string[] = perfis.map((p) => p.url);
