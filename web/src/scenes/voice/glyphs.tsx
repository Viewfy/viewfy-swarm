// Small brand glyphs (drawn inline so no extra assets are needed).

export function GmailGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 24 18">
      <path d="M1.6 18h3.8V8.8L0 4.7v11.7C0 17.3.7 18 1.6 18z" fill="#4285f4" />
      <path d="M18.6 18h3.8c.9 0 1.6-.7 1.6-1.6V4.7l-5.4 4.1z" fill="#34a853" />
      <path d="M18.6 1.7v7.1L24 4.7V2.5c0-2-2.3-3.2-3.9-2z" fill="#fbbc04" />
      <path d="M5.4 8.8V1.7L12 6.6l6.6-4.9v7.1L12 13.7z" fill="#ea4335" />
      <path d="M0 2.5v2.2l5.4 4.1V1.7L3.9.5C2.3-.7 0 .5 0 2.5z" fill="#c5221f" />
    </svg>
  )
}
