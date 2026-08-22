import Link from "next/link";

export default function PrivacyPage() {
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-10 text-slate-700">
    <Link href="/" className="text-sm font-semibold text-fuchsia-700">← กลับไปหน้า PDF Summarizer</Link>
    <h1 className="mt-6 text-3xl font-bold text-slate-900">ข้อมูลความเป็นส่วนตัว</h1>
    <div className="paper-panel mt-6 space-y-5 rounded-2xl p-6 leading-7">
      <section><h2 className="font-bold text-slate-900">การทำงานภายในเครื่อง</h2><p>ไฟล์ PDF, DOCX และรูปภาพ รวมถึงการอ่านข้อความ OCR และการจัดเรียงมาตรฐาน ทำงานใน Browser ของผู้ใช้โดยไม่อัปโหลดไฟล์ต้นฉบับไปยังเซิร์ฟเวอร์ การสรุปจะเริ่มเมื่อผู้ใช้เลือก Local AI หรือ Cloud AI และกดรูปแบบผลลัพธ์เท่านั้น</p></section>
      <section><h2 className="font-bold text-slate-900">Cloud AI</h2><p>เมื่อเลือก Cloud AI และกดรูปแบบผลลัพธ์ ระบบจะแสดงคำเตือนและขอคำยืนยันสำหรับคำขอนั้นก่อนเสมอ หลังยืนยัน ระบบจะส่งเฉพาะข้อความที่จัดเรียงแล้วไปยัง Groq และอาจส่งไปยัง Gemini เมื่อ Groq ไม่พร้อมใช้งาน โดยไม่ส่งไฟล์ต้นฉบับ ผู้ใช้ควรหลีกเลี่ยง Cloud AI สำหรับข้อมูลลับ ข้อมูลส่วนบุคคล หรือข้อมูลภายในองค์กรที่ไม่ได้รับอนุญาต</p></section>
      <section><h2 className="font-bold text-slate-900">การจัดเก็บ</h2><p>แอปไม่มีฐานข้อมูลสำหรับบันทึกเอกสารหรือผลสรุป การตั้งค่าธีมถูกเก็บเฉพาะใน Browser ของผู้ใช้ ทั้งนี้ผู้ให้บริการ Hosting และ AI อาจมีบันทึกทางเทคนิคตามนโยบายของผู้ให้บริการนั้น</p></section>
      <section><h2 className="font-bold text-slate-900">ข้อจำกัด</h2><p>ผล OCR และผลสรุปอาจคลาดเคลื่อน ผู้ใช้ควรตรวจเทียบกับเอกสารต้นฉบับก่อนนำไปใช้งาน</p></section>
    </div>
  </main>;
}
