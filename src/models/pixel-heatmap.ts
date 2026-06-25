import type { Transaction } from "@/lib/googleSheetDb";

export const HEATMAP_COLS = 53;
export const HEATMAP_ROWS = 7;
export const HEATMAP_MAX = 4; // Max intensity level (0-4)

export interface HeatmapCell {
  row: number;
  col: number;
  value: number;
  dateStr?: string; // Optional for tooltip
  isFuture?: boolean;
}

export interface HeatmapData {
  cells: HeatmapCell[];
  months: { label: string; colIndex: number }[];
  totalContributions: number;
}

/**
 * Generate a 53-week Github-style contribution heatmap based on real transaction data.
 */
export function generatePixelHeatmap(transactions: Transaction[] = []): HeatmapData {
  const cells: HeatmapCell[] = [];
  let totalContributions = 0;
  
  // Count transactions per day
  const activityMap = new Map<string, number>();
  for (const t of transactions) {
    if (!t.date) continue;
    let dateStr = t.date;
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const isoDate = d.toISOString().split('T')[0];
      activityMap.set(isoDate, (activityMap.get(isoDate) || 0) + 1);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const currentDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  const daysToSaturday = 6 - currentDayOfWeek;
  
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + daysToSaturday);
  
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 371 + 1);

  const months: { label: string; colIndex: number }[] = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let lastMonth = -1;

  for (let c = 0; c < HEATMAP_COLS; c++) {
    for (let r = 0; r < HEATMAP_ROWS; r++) {
      const daysOffset = c * 7 + r;
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + daysOffset);
      
      const isoDate = cellDate.toISOString().split('T')[0];
      const count = activityMap.get(isoDate) || 0;
      
      if (count > 0 && cellDate <= today && cellDate >= startDate) {
        totalContributions += count;
      }
      
      // Normalize count to 0-4 brightness (Github has 5 levels including 0)
      let intensity = 0;
      if (count > 0) intensity = 1;
      if (count >= 3) intensity = 2;
      if (count >= 5) intensity = 3;
      if (count >= 7) intensity = 4;

      const isFuture = cellDate > today;

      // Track month boundaries on the first row
      if (r === 0) {
        const month = cellDate.getMonth();
        if (month !== lastMonth) {
          months.push({ label: monthNames[month], colIndex: c });
          lastMonth = month;
        }
      }

      cells.push({
        row: r,
        col: c,
        value: isFuture ? 0 : intensity,
        dateStr: isoDate,
        isFuture,
      });
    }
  }

  return { cells, months, totalContributions };
}

