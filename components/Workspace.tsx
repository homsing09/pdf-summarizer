"use client";
/* eslint-disable @next/next/no-img-element -- Blob URLs are local previews and cannot use the Next image optimizer. */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { exportAsDocx, exportAsTxt } from "@/lib/export/download";
import { localAiErrorMessage } from "@/lib/ai/local-ai-error";
import { summarizeKeyPointsLocally } from "@/lib/ai/local-summary";
import { extractDocxText } from "@/lib/documents/extract-docx";
import { extractPdfText, getPdfPageCount, hasUsableText } from "@/lib/pdf/extract-text";
import { normalizeExtractedText } from "@/lib/pdf/normalize-text";
import { runOcrFallbackPages, runOcrImage } from "@/lib/pdf/ocr-fallback";
import { createPageRange } from "@/lib/pdf/page-selection";
import type { SummaryMode } from "@/lib/validation/summarize.schema";
import { PdfViewer } from "./PdfViewer";
import { UploadZone } from "./UploadZone";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_PAGES_PER_RUN = 50;
type TextView = "cleaned" | "raw" | "summary";
type Theme = "light" | "dark";
type FileKind = "pdf" | "docx" | "image";

export function Workspace() {
  const [file, setFile] = useState<File | null>(null);
  const [fileKind, setFileKind] = useState<FileKind>("pdf");
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
  const [summarySource, setSummarySource] = useState("Local Smart");
  const [summaryTitle, setSummaryTitle] = useState("สรุปประเด็นสำคัญแล้ว");
  const isMobile = useSyncExternalStore(
    () => () => undefined,
    () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
  const [status, setStatus] = useState("พร้อมเริ่มงาน");
  const [busy, setBusy] = useState(false);
  const [canCancel, setCanCancel] = useState(false);
  const [progress, setProgress] = useState(0);
  const activeController = useRef<AbortController | null>(null);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light"));
    return () => cancelAnimationFrame(frame);
  }, []);
  const visibleText = useMemo(() => view === "summary" ? summary : view === "raw" ? rawText : text, [view, summary, rawText, text]);

  async function load(nextFile: File) {
    if (nextFile.size > MAX_FILE_BYTES) { setStatus("ไฟล์ใหญ่เกิน 25 MB กรุณาลดขนาดหรือแบ่งไฟล์"); return; }
    const extension = nextFile.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
    if (extension === ".doc") { setStatus("ไฟล์ .doc รุ่นเก่ายังไม่รองรับอย่างปลอดภัย กรุณาเปิดและบันทึกเป็น .docx ก่อน"); return; }
    const kind: FileKind | null = extension === ".pdf" ? "pdf" : extension === ".docx" ? "docx" : [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"].includes(extension) ? "image" : null;
    if (!kind) { setStatus("ชนิดไฟล์นี้ไม่รองรับ กรุณาใช้ PDF, DOCX, JPG, PNG, WebP, BMP หรือ GIF"); return; }
    if (url) URL.revokeObjectURL(url);
    setFile(nextFile); setFileKind(kind); setUrl(kind === "docx" ? null : URL.createObjectURL(nextFile)); setBusy(true); setStatus(kind === "pdf" ? "กำลังตรวจจำนวนหน้า…" : "กำลังเตรียมไฟล์…");
    setRawText(""); setText(""); setSummary(""); setView("cleaned");
    try {
      const pages = kind === "pdf" ? await getPdfPageCount(nextFile) : 1;
      setTotalPages(pages); setFromPage(1); setToPage(pages); setSelection("all");
      setStatus(kind === "pdf" ? `พบเอกสาร ${pages} หน้า — เลือกหน้าที่ต้องการอ่าน` : `พร้อมอ่านข้อความจาก ${kind === "docx" ? "Word" : "รูปภาพ"}`);
    } catch { setStatus("เปิดไฟล์ไม่สำเร็จ กรุณาลองไฟล์อื่น"); }
    finally { setBusy(false); }
  }

  async function readSelectedPages() {
    if (!file || !totalPages) return;
    const controller = new AbortController(); activeController.current = controller; setCanCancel(true);
    setBusy(true); setProgress(2); setStatus("กำลังอ่านและจัดเรียงข้อความ…");
    try {
      const pages = fileKind === "pdf" ? (selection === "all" ? createPageRange(1, totalPages, totalPages) : createPageRange(fromPage, toPage, totalPages)) : [1];
      if (pages.length > MAX_PAGES_PER_RUN) throw new Error(`อ่านได้สูงสุดครั้งละ ${MAX_PAGES_PER_RUN} หน้า กรุณาเลือกช่วงหน้า`);
      let rawPages: string[];
      let cleanedPages: string[];
      if (fileKind === "docx") {
        const docxText = await extractDocxText(file); rawPages = [docxText]; cleanedPages = [normalizeExtractedText(docxText)]; setProgress(70);
      } else if (fileKind === "image") {
        setStatus("กำลัง OCR รูปภาพภายใน browser…");
        const imageText = await runOcrImage(file, { signal: controller.signal, onProgress: (done, total) => setProgress(Math.round((done / total) * 75)) }); rawPages = [imageText]; cleanedPages = [normalizeExtractedText(imageText)];
      } else {
        const extracted = await extractPdfText(file, pages, { signal: controller.signal, onProgress: (done, total) => setProgress(Math.round((done / total) * 45)) });
        rawPages = [...extracted.rawPages]; cleanedPages = [...extracted.cleanedPages];
      }
      const weakIndexes = fileKind === "pdf" ? cleanedPages.flatMap((pageText, index) => hasUsableText(pageText) ? [] : [index]) : [];
      let note = "";
      if (weakIndexes.length) {
        setStatus(`พบ ${weakIndexes.length} หน้าที่ไม่มี text layer — กำลัง OCR ใน browser…`);
        try {
          const ocrTexts = await runOcrFallbackPages(file, weakIndexes.map((index) => pages[index]), { signal: controller.signal, onProgress: (done, total) => setProgress(45 + Math.round((done / total) * 35)) });
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
      setStatus("อ่านข้อความแล้ว — กำลังสรุปประเด็นสำคัญภายในเครื่อง…");
      setProgress(85);
      try {
        const keyPoints = summarizeKeyPointsLocally(cleanedResult);
        setSummary(keyPoints); setSummaryMode("key_points"); setSummarySource("Local Smart"); setSummaryTitle("สรุปประเด็นสำคัญแล้ว"); setView("summary");
        setProgress(100); setStatus(`อ่านและสรุปภายในเครื่องสำเร็จ ${pages.length} จาก ${totalPages} หน้า${note}`);
      } catch (error) {
        setStatus(`${error instanceof Error ? error.message : "สรุปประเด็นสำคัญไม่สำเร็จ"} · ข้อความจัดเรียงแล้วยังใช้งานได้${note}`);
      }
    } catch (error) { setStatus(error instanceof DOMException && error.name === "AbortError" ? "ยกเลิกการทำงานแล้ว" : error instanceof Error ? error.message : "อ่านไฟล์ไม่สำเร็จ กรุณาลองใหม่"); }
    finally { if (activeController.current === controller) activeController.current = null; setCanCancel(false); setBusy(false); }
  }

  async function requestSummary(sourceText: string, requestedMode: SummaryMode, signal?: AbortSignal): Promise<{ summary: string; provider: string }> {
    const response = await fetch("/api/summarize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: sourceText, mode: requestedMode }), signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Request failed");
    return { summary: data.summary, provider: data.provider ?? "Cloud AI" };
  }

  async function summarize(requestedMode: SummaryMode) {
    const controller = new AbortController(); activeController.current = controller; setCanCancel(true);
    setBusy(true); setProgress(15); setStatus("กำลังสรุป…"); setSummary("");
    try {
      const result = await requestSummary(text, requestedMode, controller.signal); setSummary(result.summary); setSummarySource(result.provider); setSummaryMode(requestedMode); setSummaryTitle("สรุปประเด็นสำคัญแล้ว"); setView("summary"); setProgress(100); setStatus(`สรุปเรียบร้อยด้วย ${result.provider}`);
    } catch (error) { setStatus(error instanceof DOMException && error.name === "AbortError" ? "ยกเลิกการสรุปแล้ว" : error instanceof Error ? error.message : "สรุปไม่สำเร็จ"); }
    finally { if (activeController.current === controller) activeController.current = null; setCanCancel(false); setBusy(false); }
  }

  async function summarizeWithAdvancedLocalAi(mode: "key_points" | "analysis" = "key_points") {
    if (!text) return;
    const controller = new AbortController(); activeController.current = controller; setCanCancel(true);
    setBusy(true); setProgress(10);
    try {
      const result = await (await import("@/lib/ai/local-llm-summary")).summarizeWithLocalAi(text, setStatus, mode);
      if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
      setSummary(result); setSummaryMode("key_points"); setSummarySource("Local AI ขั้นสูง"); setSummaryTitle(mode === "analysis" ? "สรุปวิเคราะห์แล้ว" : "สรุปประเด็นสำคัญแล้ว"); setView("summary"); setProgress(100);
      setStatus("Local AI ขั้นสูงสรุปเรียบร้อย — กรุณาตรวจเทียบกับต้นฉบับ");
    } catch (error) {
      setStatus(localAiErrorMessage(error));
    } finally { if (activeController.current === controller) activeController.current = null; setCanCancel(false); setBusy(false); }
  }

  function cancelWork() { activeController.current?.abort(); setStatus("กำลังยกเลิก…"); }

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
      <div className="flex items-center gap-3"><div className="text-right"><p className="text-sm font-medium text-slate-700" aria-live="polite">{status}</p><p className="mt-1 text-xs text-slate-500">ประมวลผล PDF และ OCR ภายใน browser</p></div>{busy && canCancel && <button type="button" onClick={cancelWork} className="secondary-button">ยกเลิก</button>}<button type="button" onClick={toggleTheme} className="theme-toggle" aria-label={theme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"} aria-pressed={theme === "dark"}><span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span><span>{theme === "dark" ? "โหมดสว่าง" : "โหมดมืด"}</span></button></div>
    </header>
    {busy && <div className="mb-4" role="progressbar" aria-label="ความคืบหน้าการประมวลผล" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-fuchsia-600 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div></div>}
    {!file && <section className="paper-panel mb-5 p-5 md:p-8"><UploadZone onFile={load} /></section>}
    {file && <div className={`grid flex-1 gap-5 ${fileKind === "docx" ? "" : "lg:grid-cols-[minmax(0,1.05fr)_minmax(430px,.95fr)]"}`}>
      {url && <div className="order-2 lg:order-1">{fileKind === "pdf" ? <PdfViewer url={url} /> : <div className="paper-panel flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl p-4"><img src={url} alt={`ตัวอย่าง ${file.name}`} className="max-h-[75vh] h-auto max-w-full object-contain" /></div>}</div>}
      <section className="paper-panel order-1 flex min-h-[610px] flex-col p-4 md:p-5 lg:order-2">
        {file && <div className="mb-4 rounded-2xl border border-fuchsia-100 bg-fuchsia-50/60 p-4">
          <div className="mb-3 flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{fileKind === "pdf" ? "เลือกหน้าที่ต้องการอ่าน" : "ไฟล์ที่ต้องการอ่านข้อความ"}</p><p className="text-sm text-slate-600">{file.name}{fileKind === "pdf" ? ` · ทั้งหมด ${totalPages || "…"} หน้า` : ""}</p></div>{fileKind === "pdf" && <span className="page-badge">{totalPages} หน้า</span>}</div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {fileKind === "pdf" && <><label className="choice-pill"><input type="radio" checked={selection === "all"} onChange={() => setSelection("all")} /> ทุกหน้า</label><label className="choice-pill"><input type="radio" checked={selection === "range"} onChange={() => setSelection("range")} /> เลือกช่วงหน้า</label>{selection === "range" && <div className="flex items-center gap-2"><span>จาก</span><input aria-label="หน้าจาก" type="number" min={1} max={totalPages} value={fromPage} onChange={(event) => setFromPage(Number(event.target.value))} className="page-input"/><span>ถึง</span><input aria-label="หน้าถึง" type="number" min={fromPage} max={totalPages} value={toPage} onChange={(event) => setToPage(Number(event.target.value))} className="page-input"/></div>}</>}
            <button disabled={busy || !totalPages} onClick={readSelectedPages} className="primary-button ml-auto">{busy ? "กำลังทำงาน…" : fileKind === "pdf" ? "อ่านหน้าที่เลือก" : "อ่านข้อความจากไฟล์"}</button>
          </div>
        </div>}
        {text && <div className="mb-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4"><p className="font-semibold text-slate-900">เลือกวิธีอ่านด้วย AI เมื่อผล Local Smart ยังไม่เพียงพอ</p><p className="mt-1 text-xs text-slate-600">Local AI ขั้นสูงเหมาะกับ PC ที่รองรับ WebGPU ส่วน Cloud AI ส่งข้อความไปยัง Groq หรือ Gemini</p><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy || isMobile} onClick={() => summarizeWithAdvancedLocalAi("key_points")} className="primary-button">{isMobile ? "Local AI ขั้นสูงใช้ไม่ได้บนอุปกรณ์นี้" : "อ่านด้วย Local AI ขั้นสูง"}</button><button disabled={busy || text.length < 50} onClick={() => summarize("key_points")} className="mode-button">อ่านด้วย Cloud AI</button></div><div className="mt-4 border-t border-violet-100 pt-3"><p className="mb-2 text-xs font-semibold text-slate-700">รูปแบบผลลัพธ์</p><div className="flex flex-wrap gap-2"><button disabled={busy || text.length < 50} onClick={() => summarize("short_summary")} className="mode-button">สรุปย่อ</button><button disabled={busy || text.length < 50} onClick={() => summarize("action_items")} className="mode-button">สิ่งที่ต้องทำ</button><button disabled={busy || isMobile} onClick={() => summarizeWithAdvancedLocalAi("analysis")} className="mode-button">สรุปวิเคราะห์ · Local AI</button></div></div></div>}
        {rawText && <p className="mb-2 text-xs font-semibold text-fuchsia-700">ผลจาก {summarySource}</p>}
        {rawText && <div className="mb-3 flex w-fit max-w-full flex-wrap gap-1 rounded-xl bg-slate-100 p-1 text-xs">{summary && <button onClick={() => setView("summary")} className={`tab-button ${view === "summary" ? "tab-button-active" : ""}`}>{summaryMode === "key_points" ? summaryTitle : summaryMode === "short_summary" ? "ผลสรุปย่อ" : "สิ่งที่ต้องทำ"}</button>}<button onClick={() => setView("cleaned")} className={`tab-button ${view === "cleaned" ? "tab-button-active" : ""}`}>ข้อความจัดเรียงแล้ว</button><button onClick={() => setView("raw")} className={`tab-button ${view === "raw" ? "tab-button-active" : ""}`}>ข้อความต้นฉบับ</button></div>}
        <textarea aria-label="Extracted document text" readOnly={view === "raw"} className="document-editor min-h-56 flex-1 resize-none rounded-2xl p-4 text-sm leading-7 outline-none" value={visibleText} onChange={(event) => view === "summary" ? setSummary(event.target.value) : setText(event.target.value)} placeholder="อ่านข้อความจากไฟล์ แล้วเนื้อหาจะแสดงที่นี่" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={!visibleText} onClick={() => navigator.clipboard.writeText(visibleText)} className="secondary-button">คัดลอก</button>
          <button disabled={!visibleText || !file} onClick={() => file && exportAsTxt(visibleText, file.name)} className="secondary-button">Export .txt</button>
          <button disabled={!visibleText || !file} onClick={() => file && exportAsDocx(visibleText, file.name)} className="secondary-button">Export .docx</button>
          {file && <button onClick={reset} className="secondary-button ml-auto">เปลี่ยนไฟล์</button>}
        </div>
      </section>
    </div>}
    <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-fuchsia-100 px-2 pt-4 text-xs text-slate-500"><span>Text extraction/OCR ทำในเครื่อง · Cloud ทำงานเมื่อผู้ใช้เลือก · <a href="/privacy" className="underline underline-offset-2">ข้อมูลความเป็นส่วนตัว</a></span><span className="flex items-center gap-2">Built with Codex · Created by <strong className="font-semibold text-fuchsia-700">homsing09</strong><a href="https://www.facebook.com/homsing" target="_blank" rel="noopener noreferrer" aria-label="Facebook ของ homsing09" title="Facebook ของ homsing09" className="facebook-link"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.414c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.974h-1.513c-1.49 0-1.956.93-1.956 1.887v2.259h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" /></svg></a></span></footer>
  </main>;
}
