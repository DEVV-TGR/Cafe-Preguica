import "server-only";
import { cafe, moradaCompleta } from "@/data/cafe";

/*
  Quem envia, com morada — um email comercial tem de dizer de onde vem.

  Vem do `cafe.json` tal como estava no último build, que é o mesmo que o site
  mostra. Vive aqui, e não nas acções, porque a pré-visualização do painel tem de
  escrever exactamente o mesmo rodapé que o envio.
*/
export function rodapeDaCasa(): string {
  return [cafe.nome, moradaCompleta() ?? cafe.cidade].filter(Boolean).join(" · ");
}

/** Para onde vão as respostas a uma newsletter: o email da casa, se houver. */
export function responderPara(): string | null {
  return cafe.email;
}
