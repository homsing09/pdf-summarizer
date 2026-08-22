# PDF Summarizer

Next.js App Router application that extracts PDF text in the browser, falls back to Tesseract OCR in a Web Worker, summarizes locally by default, and uses server-only Groq → Gemini failover when Cloud AI is explicitly selected.

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

- PDF, DOCX, and image processing run in the browser. Files are limited to 25 MB and PDFs to a maximum of 50 selected pages per run.
- DOCX imports raw text with Mammoth. JPG, JPEG, PNG, WebP, BMP, and non-animated GIF use local Tesseract OCR. Legacy `.doc` is rejected with guidance to save as `.docx` because the available browser parsers are not mature enough for this security baseline.
- Cloud summarization accepts at most 120,000 characters. Text repair modes and their API route have been removed.
- API routes have sanitized errors, provider timeouts, request-size guards, and best-effort per-instance rate limits.
- Before production, configure Vercel Firewall rate limiting for `/api/summarize`; an in-memory limiter cannot enforce a global quota across serverless instances.
- Cloud features try Groq first and fail over to Gemini only for unavailable credentials, quota, timeout, capacity, or provider errors. Do not place either API key in source, chat, or any `NEXT_PUBLIC_` variable.
