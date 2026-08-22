"use client";
import { useRef } from "react";
export function UploadZone({ onFile }: { onFile: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const accept = (file?: File) => file?.type === "application/pdf" && onFile(file);
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); accept(e.dataTransfer.files[0]); }}>
    <p className="font-medium text-slate-800">วางไฟล์ PDF ที่นี่</p><p className="mt-1 text-sm text-slate-500">หรือเลือกไฟล์จากเครื่อง</p>
    <button className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => input.current?.click()}>เลือก PDF</button>
    <input ref={input} hidden type="file" accept="application/pdf" onChange={(e) => accept(e.target.files?.[0])} />
  </div>;
}
