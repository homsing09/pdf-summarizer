"use client";

import { useEffect, useMemo, useState } from "react";
import { exportAsDocx, exportAsTxt } from "@/lib/export/download";
import { localAiErrorMessage, repairTextLocally } from "@/lib/ai/local-cleaner";
import { extractPdfText, getPdfPageCount } from "@/lib/pdf/extract-text";
import { normalizeExtractedText } from "@/lib/pdf/normalize-text";
import { runOcrFallback } from "@/lib/pdf/ocr-fallback";
import { createPageRange } from "@/lib/pdf/page-selection";
import type { SummaryMode } from "@/lib/validation/summarize.schema";
import { PdfViewer } from "./PdfViewer";
import { UploadZone } from "./UploadZone";

const modes: Array<[SummaryMode, string]> = [["key_points", "ประเด็นสำคัญ"], ["short_summary", "สรุปย่อ"], ["action_items", "สิ่งที่ต้องทำ"]];
type TextView = "cleaned" | "raw" | "summary";

export function Workspace() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [selection, setSelection] = useState<"all" | "range">("all");
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);
  const [rawText, setRawText] = useState("");
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [view, setView] = useState<TextView>("cleaned");
  const [mode, setMode] = useState<SummaryMode>("key_points");
  const [cleanerMode, setCleanerMode] = useState<"standard" | "auto" | "all">("standard");
  const [status, setStatus] = useState("พร้อมเริ่มงาน");
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const visibleText = useMemo(() => view === "summary" ? summary : view === "raw" ? rawText : text, [view, summary, rawText, text]);

  async function load(nextFile: File) {
    if (url) URL.revokeObjectURL(url);
    setFile(nextFile); setUrl(URL.createObjectURL(nextFile)); setBusy(true); setStatus("กำลังตรวจจำนวนหน้า…");
    setRawText(""); setText(""); setSummary(""); setView("cleaned");
    try {
      const pages = await getPdfPageCount(nextFile);
      setTotalPages(pages); setFromPage(1); setToPage(pages); setSelection("all");
      setStatus(`พบเอกสาร ${pages} หน้า — เลือกหน้าที่ต้องการอ่าน`);
    } catch { setStatus("เปิด PDF ไม่สำเร็จ กรุณาลองไฟล์อื่น"); }
    finally { setBusy(false); }
  }

  async function readSelectedPages() {
    if (!file || !totalPages) return;
    setBusy(true); setStatus("กำลังอ่านและจัดเรียงข้อความ…");
    try {
      const pages = selection === "all" ? createPageRange(1, totalPages, totalPages) : createPageRange(fromPage, toPage, totalPages);
      let extracted = await extractPdfText(file, pages);
      if (extracted.cleanedText.length < 50) {
        setStatus(`ไม่พบ text layer ใน ${pages.length} หน้า — กำลัง OCR ใน browser…`);
        const ocrText = await runOcrFallback(file, pages);
        extracted = { rawText: ocrText, cleanedText: normalizeExtractedText(ocrText) };
      }
      setRawText(extracted.rawText); setText(extracted.cleanedText); setSummary(""); setView("cleaned");
      setStatus(extracted.cleanedText.length >= 50 ? `อ่านสำเร็จ ${pages.length} จาก ${totalPages} หน้า` : "ไม่พบข้อความที่เพียงพอในหน้าที่เลือก");
    } catch (error) { setStatus(error instanceof Error ? error.message : "อ่าน PDF ไม่สำเร็จ กรุณาลองใหม่"); }
    finally { setBusy(false); }
  }

  async function summarize() {
    setBusy(true); setStatus("กำลังสรุป…"); setSummary("");
    try {
      const response = await fetch("/api/summarize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, mode }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Request failed");
      setSummary(data.summary); setView("summary"); setStatus("สรุปเรียบร้อย");
    } catch (error) { setStatus(error instanceof Error ? error.message : "สรุปไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function runLocalRepair() {
    if (!text) return;
    const localMode = cleanerMode === "all" ? "all" : "auto";
    setBusy(true);
    try {
      const repaired = await repairTextLocally(text, localMode, setStatus);
      setText(repaired); setView("cleaned"); setSummary("");
      setStatus("Local AI แก้ข้อความแล้ว — กรุณาตรวจเทียบกับต้นฉบับ");
    } catch (error) {
      setStatus(localAiErrorMessage(error));
    } finally { setBusy(false); }
  }

  function reset() {
    if (url) URL.revokeObjectURL(url);
    setFile(null); setUrl(null); setTotalPages(0); setRawText(""); setText(""); setSummary(""); setView("cleaned"); setStatus("พร้อมเริ่มงาน");
  }

  return <main className="mx-auto flex min-h-screen max-w-[1680px] flex-col px-4 py-5 md:px-7">
    <header className="document-header mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4">
      <div className="flex items-center gap-3"><div className="brand-mark">D</div><div><p className="text-[11px] font-bold tracking-[0.22em] text-fuchsia-700">DIGITAL DOCUMENT WORKSPACE</p><h1 className="text-2xl font-bold tracking-tight text-slate-900">PDF Summarizer</h1></div></div>
      <div className="text-right"><p className="text-sm font-medium text-slate-700">{status}</p><p className="mt-1 text-xs text-slate-500">ประมวลผล PDF และ OCR ภายใน browser</p></div>
    </header>
    {!url && <section className="paper-panel mb-5 p-5 md:p-8"><UploadZone onFile={load} /></section>}
    <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(430px,.95fr)]">
      <PdfViewer url={url} />
      <section className="paper-panel flex min-h-[610px] flex-col p-4 md:p-5">
        {file && <div className="mb-4 rounded-2xl border border-fuchsia-100 bg-fuchsia-50/60 p-4">
          <div className="mb-3 flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">เลือกหน้าที่ต้องการอ่าน</p><p className="text-sm text-slate-600">{file.name} · ทั้งหมด {totalPages || "…"} หน้า</p></div><span className="page-badge">{totalPages} หน้า</span></div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="choice-pill"><input type="radio" checked={selection === "all"} onChange={() => setSelection("all")} /> ทุกหน้า</label>
            <label className="choice-pill"><input type="radio" checked={selection === "range"} onChange={() => setSelection("range")} /> เลือกช่วงหน้า</label>
            {selection === "range" && <div className="flex items-center gap-2"><span>จาก</span><input aria-label="หน้าจาก" type="number" min={1} max={totalPages} value={fromPage} onChange={(event) => setFromPage(Number(event.target.value))} className="page-input"/><span>ถึง</span><input aria-label="หน้าถึง" type="number" min={fromPage} max={totalPages} value={toPage} onChange={(event) => setToPage(Number(event.target.value))} className="page-input"/></div>}
            <button disabled={busy || !totalPages} onClick={readSelectedPages} className="primary-button ml-auto">{busy ? "กำลังทำงาน…" : "อ่านหน้าที่เลือก"}</button>
          </div>
        </div>}
        {text && <div className="mb-4 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
          <div className="mb-3"><p className="font-semibold text-slate-900">การจัดเรียงข้อความ</p><p className="text-xs text-slate-600">Local AI ทำงานใน Browser ไม่ใช้ Groq token · ครั้งแรกต้องดาวน์โหลดโมเดลประมาณ 1 GB</p></div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button onClick={() => setCleanerMode("standard")} className={`mode-button ${cleanerMode === "standard" ? "mode-button-active" : ""}`}>มาตรฐาน</button>
            <button onClick={() => setCleanerMode("auto")} className={`mode-button ${cleanerMode === "auto" ? "mode-button-active" : ""}`}>Auto Local AI</button>
            <button onClick={() => setCleanerMode("all")} className={`mode-button ${cleanerMode === "all" ? "mode-button-active" : ""}`}>Local AI ทั้งหมด</button>
            {cleanerMode !== "standard" && <button disabled={busy} onClick={runLocalRepair} className="primary-button ml-auto">แก้ข้อความด้วย Local AI</button>}
          </div>
          <p className="mt-2 text-xs text-amber-700">AI อาจคาดเดาผิดได้ ระบบจึงเก็บ “ข้อความต้นฉบับ” ไว้ให้ตรวจเทียบเสมอ</p>
        </div>}
        <div className="mb-3 flex flex-wrap gap-2">{modes.map(([value, label]) => <button key={value} onClick={() => setMode(value)} className={`mode-button ${mode === value ? "mode-button-active" : ""}`}>{label}</button>)}</div>
        {rawText && <div className="mb-3 flex w-fit gap-1 rounded-xl bg-slate-100 p-1 text-xs"><button onClick={() => setView("cleaned")} className={`tab-button ${view === "cleaned" ? "tab-button-active" : ""}`}>ข้อความจัดเรียงแล้ว</button><button onClick={() => setView("raw")} className={`tab-button ${view === "raw" ? "tab-button-active" : ""}`}>ข้อความต้นฉบับ</button>{summary && <button onClick={() => setView("summary")} className={`tab-button ${view === "summary" ? "tab-button-active" : ""}`}>ผลสรุป</button>}</div>}
        <textarea aria-label="Extracted PDF text" readOnly={view === "raw"} className="document-editor min-h-56 flex-1 resize-none rounded-2xl p-4 text-sm leading-7 outline-none" value={visibleText} onChange={(event) => view === "summary" ? setSummary(event.target.value) : setText(event.target.value)} placeholder="เลือกหน้าที่ต้องการอ่าน แล้วข้อความจาก PDF จะแสดงที่นี่" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={busy || text.length < 50} onClick={summarize} className="dark-button">สรุปเอกสาร</button>
          <button disabled={!visibleText} onClick={() => navigator.clipboard.writeText(visibleText)} className="secondary-button">คัดลอก</button>
          <button disabled={!visibleText || !file} onClick={() => file && exportAsTxt(visibleText, file.name)} className="secondary-button">Export .txt</button>
          <button disabled={!visibleText || !file} onClick={() => file && exportAsDocx(visibleText, file.name)} className="secondary-button">Export .docx</button>
          {url && <button onClick={reset} className="secondary-button ml-auto">เปลี่ยนไฟล์</button>}
        </div>
      </section>
    </div>
    <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-fuchsia-100 px-2 pt-4 text-xs text-slate-500"><span>เอกสารของคุณไม่ถูกอัปโหลดระหว่างการอ่านข้อความ</span><span>Built with Codex · Created by <strong className="font-semibold text-fuchsia-700">homsing09</strong></span></footer>
  </main>;
}
