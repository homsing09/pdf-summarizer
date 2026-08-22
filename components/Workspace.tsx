"use client";
import { useEffect, useState } from "react";
import { extractPdfText } from "@/lib/pdf/extract-text";
import { runOcrFallback } from "@/lib/pdf/ocr-fallback";
import type { SummaryMode } from "@/lib/validation/summarize.schema";
import { PdfViewer } from "./PdfViewer";
import { UploadZone } from "./UploadZone";
const modes: Array<[SummaryMode, string]> = [["key_points", "ประเด็นสำคัญ"], ["short_summary", "สรุปย่อ"], ["action_items", "สิ่งที่ต้องทำ"]];
export function Workspace() {
  const [url, setUrl] = useState<string | null>(null), [text, setText] = useState(""), [summary, setSummary] = useState("");
  const [mode, setMode] = useState<SummaryMode>("key_points"), [status, setStatus] = useState("พร้อมเริ่มงาน");
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  async function load(file: File) {
    if (url) URL.revokeObjectURL(url);
    setUrl(URL.createObjectURL(file)); setStatus("กำลังอ่านข้อความ…");
    try {
      let extracted = await extractPdfText(file);
      if (extracted.length < 50) {
        setStatus("ไม่พบ text layer — กำลัง OCR ใน browser…");
        extracted = await runOcrFallback(file);
      }
      setText(extracted);
      setStatus(extracted.length >= 50 ? "อ่านเอกสารแล้ว" : "ไม่พบข้อความที่เพียงพอใน PDF");
    }
    catch { setStatus("อ่าน PDF ไม่สำเร็จ กรุณาลองไฟล์อื่น"); }
  }
  async function summarize() {
    setStatus("กำลังสรุป…"); setSummary("");
    try {
      const response = await fetch("/api/summarize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, mode }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Request failed");
      setSummary(data.summary); setStatus("สรุปเรียบร้อย");
    } catch (error) { setStatus(error instanceof Error ? error.message : "สรุปไม่สำเร็จ"); }
  }
  return <main className="mx-auto min-h-screen max-w-[1600px] p-4 md:p-6">
    <header className="mb-5 flex items-end justify-between"><div><p className="text-sm font-semibold text-cyan-700">PRIVATE BY DESIGN</p><h1 className="text-2xl font-semibold">PDF Summarizer</h1></div><span className="text-sm text-slate-500">{status}</span></header>
    {!url && <div className="mb-5"><UploadZone onFile={load} /></div>}
    <div className="grid gap-5 lg:grid-cols-2"><PdfViewer url={url} /><section className="flex min-h-[560px] flex-col rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap gap-2">{modes.map(([value, label]) => <button key={value} onClick={() => setMode(value)} className={`rounded-full px-3 py-1.5 text-sm ${mode === value ? "bg-cyan-700 text-white" : "bg-slate-100 text-slate-700"}`}>{label}</button>)}</div>
      <textarea aria-label="Extracted PDF text" className="min-h-52 flex-1 resize-none rounded-xl border p-3 text-sm outline-none focus:border-cyan-600" value={summary || text} onChange={(e) => summary ? setSummary(e.target.value) : setText(e.target.value)} placeholder="ข้อความจาก PDF และผลสรุปจะแสดงที่นี่" />
      <div className="mt-3 flex gap-2"><button disabled={text.length < 50} onClick={summarize} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-40">สรุปเอกสาร</button><button onClick={() => navigator.clipboard.writeText(summary || text)} className="rounded-xl border px-4 py-2 text-sm">คัดลอก</button>{url && <button onClick={() => { setUrl(null); setText(""); setSummary(""); }} className="ml-auto rounded-xl border px-4 py-2 text-sm">เปลี่ยนไฟล์</button>}</div>
    </section></div>
  </main>;
}
