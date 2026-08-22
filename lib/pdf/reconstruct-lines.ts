export type PositionedText = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function reconstructLines(items: PositionedText[]): string {
  const visible = items.filter((item) => item.text.trim());
  const lines: PositionedText[][] = [];

  for (const item of visible.sort((a, b) => b.y - a.y || a.x - b.x)) {
    const tolerance = Math.max(2, item.height * 0.35);
    const line = lines.find((candidate) => Math.abs(candidate[0].y - item.y) <= tolerance);
    if (line) line.push(item);
    else lines.push([item]);
  }

  return lines
    .sort((a, b) => b[0].y - a[0].y)
    .map((line) => {
      const ordered = line.sort((a, b) => a.x - b.x);
      let result = "";
      let previous: PositionedText | undefined;
      for (const item of ordered) {
        if (previous) {
          const gap = item.x - (previous.x + previous.width);
          const averageCharacterWidth = previous.width / Math.max([...previous.text].length, 1);
          if (gap > Math.max(1.5, averageCharacterWidth * 0.45)) result += " ";
        }
        result += item.text;
        previous = item;
      }
      return result.trim();
    })
    .filter(Boolean)
    .join("\n");
}
