export function PdfViewer({ url }: { url: string | null }) {
  return url ? <iframe className="h-full min-h-[560px] w-full rounded-2xl border bg-white" src={url} title="PDF preview" /> : <div className="grid min-h-[560px] place-items-center rounded-2xl border bg-slate-100 text-slate-400">PDF preview</div>;
}
