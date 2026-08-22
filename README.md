# PDF Summarizer

Next.js App Router application that extracts PDF text in the browser, falls back to Tesseract OCR in a Web Worker, and sends only extracted text to a server-only Groq integration.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set `GROQ_API_KEY` locally. Never commit or expose it with a `NEXT_PUBLIC_` prefix.
3. Run `pnpm dev`.

## Validation

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The summarize route explicitly uses the Node.js runtime. No database, cache, or container is required for this MVP.
