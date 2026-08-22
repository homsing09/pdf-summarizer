export function PdfViewer({ url }: { url: string | null }) {
  return url ? <iframe className="h-full min-h-[420px] w-full rounded-2xl border bg-white md:min-h-[560px]" src={url} title="PDF preview" /> : <div className="grid min-h-[300px] place-items-center rounded-2xl border bg-slate-100 text-slate-400 md:min-h-[560px]">PDF preview</div>;
}
