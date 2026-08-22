import Link from "next/link";

export default function PrivacyPage() {
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-10 text-slate-700">
    <Link href="/" className="text-sm font-semibold text-fuchsia-700">← กลับไปหน้า PDF Summarizer</Link>
    <h1 className="mt-6 text-3xl font-bold text-slate-900">ข้อมูลความเป็นส่วนตัว</h1>
    <div className="paper-panel mt-6 space-y-5 rounded-2xl p-6 leading-7">
      <section><h2 className="font-bold text-slate-900">การทำงานภายในเครื่อง</h2><p>ไฟล์ PDF การอ่านข้อความ OCR การจัดเรียงมาตรฐาน และการสรุปประเด็นสำคัญเริ่มต้น ทำงานใน Browser ของผู้ใช้โดยไม่อัปโหลดไฟล์ PDF ไปยังเซิร์ฟเวอร์</p></section>
      <section><h2 className="font-bold text-slate-900">Cloud AI</h2><p>เมื่อผู้ใช้กด “สรุปย่อ”, “สิ่งที่ต้องทำ” หรือ “ซ่อมด้วย Cloud AI” ระบบจะส่งข้อความที่เกี่ยวข้องไปยัง Groq เพื่อประมวลผล โดยไม่ส่งไฟล์ PDF ต้นฉบับ ผู้ใช้ควรหลีกเลี่ยง Cloud AI สำหรับข้อมูลลับหรือข้อมูลส่วนบุคคลที่ไม่ควรส่งให้ผู้ให้บริการภายนอก</p></section>
      <section><h2 className="font-bold text-slate-900">การจัดเก็บ</h2><p>แอปไม่มีฐานข้อมูลสำหรับบันทึกเอกสารหรือผลสรุป การตั้งค่าธีมถูกเก็บเฉพาะใน Browser ของผู้ใช้ ทั้งนี้ผู้ให้บริการ Hosting และ AI อาจมีบันทึกทางเทคนิคตามนโยบายของผู้ให้บริการนั้น</p></section>
      <section><h2 className="font-bold text-slate-900">ข้อจำกัด</h2><p>ผล OCR การซ่อมข้อความ และผลสรุปอาจคลาดเคลื่อน ผู้ใช้ควรตรวจเทียบกับเอกสารต้นฉบับก่อนนำไปใช้งาน</p></section>
    </div>
  </main>;
}
