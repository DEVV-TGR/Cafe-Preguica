import Link from "next/link";
import { routing } from "@/i18n/routing";
import "./globals.css";

/**
 * O 404 dos pedidos que nem chegam a ter idioma — um caminho que o `proxy.ts`
 * não reconheceu de todo.
 *
 * Traz o seu próprio `<html>` porque **não há layout de raiz**: os layouts vivem
 * todos dentro de `[locale]`, e aqui ainda não se sabe qual é. Pela mesma razão
 * o texto está escrito à mão em vez de vir das mensagens — pedir traduções
 * exigia um idioma que este pedido não tem.
 */
export default function NaoEncontradaGlobal() {
  return (
    <html lang={routing.defaultLocale}>
      <body className="mx-auto max-w-3xl px-4 py-24">
        <h1 className="font-display text-4xl font-semibold">
          Página não encontrada
        </h1>
        <p className="mt-4">
          A página que procura não existe ou mudou de sítio.
        </p>
        <Link href="/" className="mt-8 inline-block underline">
          Voltar ao início
        </Link>
      </body>
    </html>
  );
}
