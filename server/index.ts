// STUB — the server agent replaces this.
const port = Number(process.env.PORT ?? 8787)
Bun.serve({
  port,
  fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === '/api/status') return Response.json({ ok: true })
    return new Response('not found', { status: 404 })
  },
})
console.log(`api on :${port}`)
