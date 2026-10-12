// Runs synchronously while the HTML is parsed (before first paint), e.g. to apply
// the saved theme without a flash. See Next.js guide "Preventing flash before hydration".
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
