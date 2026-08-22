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
pnpm test:e2e
pnpm build
```

The summarize route explicitly uses the Node.js runtime. No database, cache, or container is required for this MVP.

## Safety and operating limits

- PDF processing and OCR run in the browser. Files are limited to 25 MB and a maximum of 50 selected pages per run.
- Cloud summarization accepts at most 120,000 characters. Cloud text repair accepts 20 bounded chunks per request.
- API routes have sanitized errors, provider timeouts, request-size guards, and best-effort per-instance rate limits.
- Before production, configure Vercel Firewall rate limiting for `/api/summarize` and `/api/repair-text`; an in-memory limiter cannot enforce a global quota across serverless instances.
- Cloud features send extracted text to Groq only when invoked. Do not place `GROQ_API_KEY` in source, chat, or any `NEXT_PUBLIC_` variable.
