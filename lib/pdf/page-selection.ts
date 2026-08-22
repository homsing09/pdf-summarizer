export function createPageRange(fromPage: number, toPage: number, totalPages: number): number[] {
  if (!Number.isInteger(totalPages) || totalPages < 1) throw new Error("PDF must contain at least one page");
  if (!Number.isInteger(fromPage) || !Number.isInteger(toPage)) throw new Error("Page numbers must be integers");
  if (fromPage < 1 || toPage > totalPages || fromPage > toPage) throw new Error("Selected page range is invalid");
  return Array.from({ length: toPage - fromPage + 1 }, (_, index) => fromPage + index);
}
