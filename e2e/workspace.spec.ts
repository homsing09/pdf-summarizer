import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

async function fixturePdf(): Promise<Buffer> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (const pageNumber of [1, 2]) {
    const page = document.addPage([595, 842]);
    page.drawText(`Page ${pageNumber}: Monthly operations report with enough readable document content for summary testing.`, { x: 48, y: 780, size: 14, font });
  }
  return Buffer.from(await document.save());
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/summarize", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ summary: "- Main operational result\n- Follow up next month" }) }));
});

test("uploads, selects pages, summarizes, changes theme and exports", async ({ page }) => {
  await page.goto("/");
  const themeButton = page.getByRole("button", { name: /เปลี่ยนเป็นโหมด/ });
  await themeButton.click();
  await expect(themeButton).toHaveAttribute("aria-pressed", /true|false/);
  await page.locator('input[type="file"]').setInputFiles({ name: "fixture.pdf", mimeType: "application/pdf", buffer: await fixturePdf() });
  await expect(page.getByText(/ทั้งหมด 2 หน้า/)).toBeVisible();
  await page.getByRole("button", { name: "อ่านหน้าที่เลือก" }).click();
  await expect(page.getByRole("button", { name: "สรุปประเด็นสำคัญแล้ว" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("Extracted PDF text")).toContainText("Monthly operations report");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export .txt" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.txt$/);
});

test("rejects files over the browser safety limit", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Avoid transferring a 25 MB synthetic buffer through mobile WebKit IPC");
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({ name: "large.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(25 * 1024 * 1024 + 1) });
  await expect(page.getByText(/ไฟล์ใหญ่เกิน 25 MB/)).toBeVisible();
});
