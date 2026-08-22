function safeBaseName(fileName: string): string {
  const baseName = fileName.replace(/\.pdf$/i, "").replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "");
  return baseName || "document";
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function exportAsTxt(content: string, sourceFileName: string) {
  downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), `${safeBaseName(sourceFileName)}.txt`);
}

export async function exportAsDocx(content: string, sourceFileName: string) {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");
  const paragraphs = content.split(/\n/).map((line) => new Paragraph({
    children: [new TextRun({ text: line || " ", font: "TH Sarabun New", size: 32 })],
    spacing: { after: 100 },
  }));
  const document = new Document({ sections: [{ children: paragraphs }] });
  downloadBlob(await Packer.toBlob(document), `${safeBaseName(sourceFileName)}.docx`);
}
