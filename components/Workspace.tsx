"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { exportAsDocx, exportAsTxt } from "@/lib/export/download";
import { localAiErrorMessage } from "@/lib/ai/local-ai-error";
import { repairTextInCloud } from "@/lib/ai/cloud-cleaner";
import { extractPdfText, getPdfPageCount, hasUsableText } from "@/lib/pdf/extract-text";
import { normalizeExtractedText } from "@/lib/pdf/normalize-text";
import { runOcrFallbackPages } from "@/lib/pdf/ocr-fallback";
import { createPageRange } from "@/lib/pdf/page-selection";
import type { SummaryMode } from "@/lib/validation/summarize.schema";
import { PdfViewer } from "./PdfViewer";
import { UploadZone } from "./UploadZone";

const modes: Array<[SummaryMode, string]> = [["short_summary", "สรุปย่อ"], ["action_items", "สิ่งที่ต้องทำ"]];
type TextView = "cleaned" | "raw" | "summary";
type Theme = "light" | "dark";

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
  const [summaryMode, setSummaryMode] = useState<SummaryMode>("key_points");
  const isMobile = useSyncExternalStore(
    () => () => undefined,
    () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
  const [status, setStatus] = useState("พร้อมเริ่มงาน");
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light"));
    return () => cancelAnimationFrame(frame);
  }, []);
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
      const extracted = await extractPdfText(file, pages);
      const rawPages = [...extracted.rawPages];
      const cleanedPages = [...extracted.cleanedPages];
      const weakIndexes = cleanedPages.flatMap((pageText, index) => hasUsableText(pageText) ? [] : [index]);
      let note = "";
      if (weakIndexes.length) {
        setStatus(`พบ ${weakIndexes.length} หน้าที่ไม่มี text layer — กำลัง OCR ใน browser…`);
        try {
          const ocrTexts = await runOcrFallbackPages(file, weakIndexes.map((index) => pages[index]));
          weakIndexes.forEach((pageIndex, resultIndex) => {
            const ocrText = ocrTexts[resultIndex]?.trim() ?? "";
            if (ocrText) { rawPages[pageIndex] = ocrText; cleanedPages[pageIndex] = normalizeExtractedText(ocrText); }
          });
        } catch { note = " · OCR บางหน้าไม่สำเร็จ"; }
      }
      const rawResult = rawPages.join("\n\n").trim();
      const cleanedResult = cleanedPages.join("\n\n").trim();
      setRawText(rawResult); setText(cleanedResult); setSummary(""); setView("cleaned");
      if (!hasUsableText(cleanedResult)) {
        setStatus(`ไม่พบข้อความที่เพียงพอในหน้าที่เลือก${note}`);
        return;
      }
      setStatus("อ่านข้อความแล้ว — กำลังสรุปประเด็นสำคัญ…");
      try {
        const keyPoints = await requestSummary(cleanedResult, "key_points");
        setSummary(keyPoints); setSummaryMode("key_points"); setView("summary");
        setStatus(`อ่านและสรุปสำเร็จ ${pages.length} จาก ${totalPages} หน้า${note}`);
      } catch (error) {
        setStatus(`${error instanceof Error ? error.message : "สรุปประเด็นสำคัญไม่สำเร็จ"} · ข้อความจัดเรียงแล้วยังใช้งานได้${note}`);
      }
    } catch (error) { setStatus(error instanceof Error ? error.message : "อ่าน PDF ไม่สำเร็จ กรุณาลองใหม่"); }
    finally { setBusy(false); }
  }

  async function requestSummary(sourceText: string, requestedMode: SummaryMode): Promise<string> {
    const response = await fetch("/api/summarize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: sourceText, mode: requestedMode }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Request failed");
    return data.summary;
  }

  async function summarize(requestedMode: SummaryMode) {
    setBusy(true); setStatus("กำลังสรุป…"); setSummary("");
    try {
      setSummary(await requestSummary(text, requestedMode)); setSummaryMode(requestedMode); setView("summary"); setStatus("สรุปเรียบร้อย");
    } catch (error) { setStatus(error instanceof Error ? error.message : "สรุปไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function runAiRepair(provider: "local" | "cloud") {
    if (!text) return;
    setBusy(true);
    try {
      const repaired = provider === "cloud"
        ? await repairTextInCloud(text, "auto")
        : await (await import("@/lib/ai/local-cleaner")).repairTextLocally(text, "auto", setStatus);
      setText(repaired); setView("cleaned"); setSummary("");
      setStatus(`${provider === "cloud" ? "Cloud AI" : "Local AI"} แก้ข้อความแล้ว — กรุณาตรวจเทียบกับต้นฉบับ`);
    } catch (error) {
      setStatus(provider === "cloud" ? (error instanceof Error ? error.message : "Cloud AI ทำงานไม่สำเร็จ") : localAiErrorMessage(error));
    } finally { setBusy(false); }
  }

  function reset() {
    if (url) URL.revokeObjectURL(url);
    setFile(null); setUrl(null); setTotalPages(0); setRawText(""); setText(""); setSummary(""); setView("cleaned"); setStatus("พร้อมเริ่มงาน");
  }

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem("pdf-summarizer-theme", nextTheme);
    setTheme(nextTheme);
  }

  return <main className="mx-auto flex min-h-screen max-w-[1680px] flex-col px-4 py-5 md:px-7">
    <header className="document-header mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4">
      <div className="flex items-center gap-3"><div className="brand-mark">D</div><div><p className="text-[11px] font-bold tracking-[0.22em] text-fuchsia-700">DIGITAL DOCUMENT WORKSPACE</p><h1 className="text-2xl font-bold tracking-tight text-slate-900">PDF Summarizer</h1></div></div>
      <div className="flex items-center gap-3"><div className="text-right"><p className="text-sm font-medium text-slate-700">{status}</p><p className="mt-1 text-xs text-slate-500">ประมวลผล PDF และ OCR ภายใน browser</p></div><button type="button" onClick={toggleTheme} className="theme-toggle" aria-label={theme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"} aria-pressed={theme === "dark"}><span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span><span>{theme === "dark" ? "โหมดสว่าง" : "โหมดมืด"}</span></button></div>
    </header>
    {!url && <section className="paper-panel mb-5 p-5 md:p-8"><UploadZone onFile={load} /></section>}
    {url && <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(430px,.95fr)]">
      <div className="order-2 lg:order-1"><PdfViewer url={url} /></div>
      <section className="paper-panel order-1 flex min-h-[610px] flex-col p-4 md:p-5 lg:order-2">
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
          <div className="mb-3"><p className="font-semibold text-slate-900">ปรับความสมบูรณ์ของข้อความ (เลือกใช้เมื่อจำเป็น)</p><p className="text-xs text-slate-600">ระบบจัดเรียงมาตรฐานทำงานให้แล้วอัตโนมัติ โดยไม่ใช้ AI และไม่ส่งข้อมูลออกจากเครื่อง</p></div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-violet-100 bg-white p-3"><p className="text-sm font-semibold">Local AI · แนะนำสำหรับ PC</p><p className="mt-1 text-xs text-slate-600">ข้อดี: เป็นส่วนตัว ไม่ใช้ API quota · ข้อเสีย: ดาวน์โหลดประมาณ 1 GB ใช้ RAM/GPU สูง และไม่เหมาะกับมือถือ</p><button disabled={busy || isMobile} onClick={() => runAiRepair("local")} className="primary-button mt-3 w-full">{isMobile ? "ใช้ไม่ได้บนอุปกรณ์นี้" : "ซ่อมด้วย Local AI"}</button></div>
            <div className="rounded-xl border border-violet-100 bg-white p-3"><p className="text-sm font-semibold">Cloud AI · PC / iOS / Android</p><p className="mt-1 text-xs text-slate-600">ข้อดี: ไม่ดาวน์โหลดโมเดลและทำงานบนมือถือ · ข้อเสีย: ส่งเฉพาะบรรทัดผิดปกติออกไปและใช้ Groq quota</p><button disabled={busy} onClick={() => runAiRepair("cloud")} className="secondary-button mt-3 w-full">ซ่อมด้วย Cloud AI</button></div>
          </div>
          <p className="mt-2 text-xs text-amber-700">ทั้งสองโหมดทำงานเมื่อผู้ใช้กดปุ่มเท่านั้น และอาจคาดเดาผิด กรุณาตรวจเทียบกับข้อความต้นฉบับ</p>
        </div>}
        <div className="mb-3 flex flex-wrap gap-2">{modes.map(([value, label]) => <button key={value} disabled={busy || text.length < 50} onClick={() => summarize(value)} className="mode-button">{label}</button>)}</div>
        {rawText && <div className="mb-3 flex w-fit max-w-full flex-wrap gap-1 rounded-xl bg-slate-100 p-1 text-xs">{summary && <button onClick={() => setView("summary")} className={`tab-button ${view === "summary" ? "tab-button-active" : ""}`}>{summaryMode === "key_points" ? "สรุปประเด็นสำคัญแล้ว" : summaryMode === "short_summary" ? "ผลสรุปย่อ" : "สิ่งที่ต้องทำ"}</button>}<button onClick={() => setView("cleaned")} className={`tab-button ${view === "cleaned" ? "tab-button-active" : ""}`}>ข้อความจัดเรียงแล้ว</button><button onClick={() => setView("raw")} className={`tab-button ${view === "raw" ? "tab-button-active" : ""}`}>ข้อความต้นฉบับ</button></div>}
        <textarea aria-label="Extracted PDF text" readOnly={view === "raw"} className="document-editor min-h-56 flex-1 resize-none rounded-2xl p-4 text-sm leading-7 outline-none" value={visibleText} onChange={(event) => view === "summary" ? setSummary(event.target.value) : setText(event.target.value)} placeholder="เลือกหน้าที่ต้องการอ่าน แล้วข้อความจาก PDF จะแสดงที่นี่" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={!visibleText} onClick={() => navigator.clipboard.writeText(visibleText)} className="secondary-button">คัดลอก</button>
          <button disabled={!visibleText || !file} onClick={() => file && exportAsTxt(visibleText, file.name)} className="secondary-button">Export .txt</button>
          <button disabled={!visibleText || !file} onClick={() => file && exportAsDocx(visibleText, file.name)} className="secondary-button">Export .docx</button>
          {url && <button onClick={reset} className="secondary-button ml-auto">เปลี่ยนไฟล์</button>}
        </div>
      </section>
    </div>}
    <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-fuchsia-100 px-2 pt-4 text-xs text-slate-500"><span>Text extraction/OCR ทำในเครื่อง · Cloud repair ทำงานเมื่อผู้ใช้เลือกเท่านั้น</span><span>Built with Codex · Created by <strong className="font-semibold text-fuchsia-700">homsing09</strong></span></footer>
  </main>;
}
