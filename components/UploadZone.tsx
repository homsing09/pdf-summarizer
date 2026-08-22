"use client";
import { useRef } from "react";
export function UploadZone({ onFile }: { onFile: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const accept = (file?: File) => file && onFile(file);
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); accept(e.dataTransfer.files[0]); }}>
    <p className="font-medium text-slate-800">วาง PDF, Word หรือรูปภาพที่นี่</p><p className="mt-1 text-sm text-slate-500">รองรับ PDF, DOCX, JPG, PNG, WebP, BMP และ GIF</p>
    <button className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => input.current?.click()}>เลือกไฟล์</button>
    <input ref={input} hidden type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.bmp,.gif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*" onChange={(e) => accept(e.target.files?.[0])} />
  </div>;
}
