import { formatCompactRupiah, formatRupiah } from "@/lib/formatters";
import type { PdfChartAttachment } from "./pdf-types";

export interface DashboardChartData {
  monthlySeries: Array<{
    label: string;
    revenue: number;
    expense: number;
    netCash: number;
    txCount: number;
  }>;
  incomeStatement: {
    totalRevenue: number;
    totalDirectExpense: number;
    totalSharedExpense: number;
    netProfit: number;
  };
  agingBuckets: Array<{
    label: string;
    amount: number;
  }>;
  totalReceivable: number;
  language?: "id" | "en";
}

/**
 * Merender grafik-grafik dasbor keuangan ke dalam bentuk PNG resolusi tinggi
 * menggunakan canvas 2D untuk dilampirkan ke halaman Lampiran PDF.
 */
export async function renderDashboardChartsToPng(
  data: DashboardChartData,
): Promise<PdfChartAttachment[]> {
  if (typeof document === "undefined" || !document.createElement) {
    return [];
  }

  const isEn = data.language === "en";
  const attachments: PdfChartAttachment[] = [];

  try {
    // 1. Grafik Tren Pendapatan, Beban, & Arus Kas (Bar Chart)
    const png1 = renderMonthlyTrendChart(data.monthlySeries, isEn);
    if (png1) {
      attachments.push({
        title: isEn
          ? "Monthly Revenue, Expense & Cash Flow Trends"
          : "Tren Pendapatan, Beban, & Arus Kas Bulanan",
        subtitle: isEn
          ? "Comparative trend of operational revenue, direct expenses, and net cash flow"
          : "Perbandingan realisasi pendapatan, beban langsung, dan arus kas bersih bulanan",
        imageBytes: png1,
      });
    }

    // 2. Grafik Komposisi Finansial Laba Rugi (Donut Chart)
    const png2 = renderFinancialCompositionChart(data.incomeStatement, isEn);
    if (png2) {
      attachments.push({
        title: isEn
          ? "Profit & Loss Financial Composition"
          : "Komposisi Finansial Laba Rugi",
        subtitle: isEn
          ? "Proportion of revenue vs direct project expenses, operational costs & net margin"
          : "Distribusi proporsi pendapatan, beban langsung proyek, beban operasional, dan margin",
        imageBytes: png2,
      });
    }

    // 3. Grafik Frekuensi & Aktivitas Transaksi (Line / Area Chart)
    const png3 = renderTransactionFrequencyChart(data.monthlySeries, isEn);
    if (png3) {
      attachments.push({
        title: isEn
          ? "Monthly Journal Transaction Frequency"
          : "Frekuensi & Aktivitas Transaksi Jurnal",
        subtitle: isEn
          ? "Volume of posted journal transactions recorded across billing periods"
          : "Volume pencatatan transaksi jurnal terposting per periode bulan berjalan",
        imageBytes: png3,
      });
    }

    // 4. Grafik Sebaran Umur Piutang Usaha (AR Aging Distribution)
    const png4 = renderArAgingChart(data.agingBuckets, data.totalReceivable, isEn);
    if (png4) {
      attachments.push({
        title: isEn
          ? "Accounts Receivable (AR) Aging Distribution"
          : "Sebaran Umur Piutang Usaha (AR Aging)",
        subtitle: isEn
          ? "Invoice receivables grouped by aging buckets from issuance to due date"
          : "Klasifikasi saldo piutang klien berdasarkan kategori jatuh tempo penagihan",
        imageBytes: png4,
      });
    }
  } catch (err) {
    console.warn("[DashboardChartRenderer] Gagal merender grafik canvas:", err);
  }

  return attachments;
}

/** Helper konversi canvas ke Uint8Array PNG */
function canvasToPngBytes(canvas: HTMLCanvasElement): Uint8Array | null {
  try {
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];
    if (!base64) return null;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

/** 1. Render Bar Chart Tren Bulanan */
function renderMonthlyTrendChart(
  series: DashboardChartData["monthlySeries"],
  isEn: boolean,
): Uint8Array | null {
  const width = 748;
  const height = 340;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Border kartu
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  // Header
  ctx.font = "bold 15px sans-serif";
  ctx.fillStyle = "#0f172a";
  ctx.fillText(
    isEn ? "Tren Pendapatan, Beban, & Arus Kas" : "Tren Pendapatan, Beban, & Arus Kas",
    20,
    26,
  );

  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText(
    isEn
      ? "Monthly financial comparison (in IDR)"
      : "Perbandingan realisasi finansial bulanan (dalam IDR)",
    20,
    44,
  );

  // Legend di kanan atas
  const legends = [
    { label: isEn ? "Revenue" : "Pendapatan", color: "#10b981" },
    { label: isEn ? "Expense" : "Beban", color: "#f59e0b" },
    { label: isEn ? "Net Cash" : "Arus Kas", color: "#2563eb" },
  ];
  let legendX = width - 260;
  for (const leg of legends) {
    ctx.fillStyle = leg.color;
    ctx.fillRect(legendX, 22, 10, 10);
    ctx.fillStyle = "#334155";
    ctx.font = "11px sans-serif";
    ctx.fillText(leg.label, legendX + 14, 31);
    legendX += 80;
  }

  // Divider
  ctx.strokeStyle = "#f1f5f9";
  ctx.beginPath();
  ctx.moveTo(20, 56);
  ctx.lineTo(width - 20, 56);
  ctx.stroke();

  // Plot Area
  const plotLeft = 65;
  const plotRight = width - 25;
  const plotTop = 75;
  const plotBottom = height - 42;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  // Hitung max value
  let maxVal = 100000;
  for (const s of series) {
    if (s.revenue > maxVal) maxVal = s.revenue;
    if (s.expense > maxVal) maxVal = s.expense;
    if (s.netCash > maxVal) maxVal = s.netCash;
  }
  maxVal = Math.ceil(maxVal / 1000000) * 1000000;
  if (maxVal === 0) maxVal = 5000000;

  // Grid lines & Y-axis labels
  const steps = 4;
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "#94a3b8";

  for (let i = 0; i <= steps; i++) {
    const val = (maxVal / steps) * i;
    const y = plotBottom - (i / steps) * plotHeight;
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();

    ctx.fillText(formatCompactRupiah(val), plotLeft - 8, y + 3);
  }

  // Draw Bars
  const itemCount = Math.max(1, series.length);
  const groupWidth = plotWidth / itemCount;
  const barWidth = Math.min(22, (groupWidth * 0.65) / 3);
  const gap = 3;

  series.forEach((s, idx) => {
    const groupCenterX = plotLeft + idx * groupWidth + groupWidth / 2;
    const xBase = groupCenterX - (barWidth * 3 + gap * 2) / 2;

    const values = [
      { val: Math.max(0, s.revenue), color: "#10b981" },
      { val: Math.max(0, s.expense), color: "#f59e0b" },
      { val: Math.max(0, s.netCash), color: "#2563eb" },
    ];

    values.forEach((v, bIdx) => {
      const bH = (v.val / maxVal) * plotHeight;
      const bX = xBase + bIdx * (barWidth + gap);
      const bY = plotBottom - bH;

      ctx.fillStyle = v.color;
      // rounded top bar
      const radius = 3;
      ctx.beginPath();
      ctx.moveTo(bX, plotBottom);
      ctx.lineTo(bX, bY + radius);
      ctx.quadraticCurveTo(bX, bY, bX + radius, bY);
      ctx.lineTo(bX + barWidth - radius, bY);
      ctx.quadraticCurveTo(bX + barWidth, bY, bX + barWidth, bY + radius);
      ctx.lineTo(bX + barWidth, plotBottom);
      ctx.closePath();
      ctx.fill();
    });

    // Month Label
    ctx.textAlign = "center";
    ctx.fillStyle = "#475569";
    ctx.font = "11px sans-serif";
    ctx.fillText(s.label, groupCenterX, plotBottom + 18);
  });

  return canvasToPngBytes(canvas);
}

/** 2. Render Donut Chart Komposisi Finansial */
function renderFinancialCompositionChart(
  inc: DashboardChartData["incomeStatement"],
  isEn: boolean,
): Uint8Array | null {
  const width = 748;
  const height = 340;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  // Header
  ctx.font = "bold 15px sans-serif";
  ctx.fillStyle = "#0f172a";
  ctx.fillText(
    isEn ? "Komposisi Finansial Laba Rugi" : "Komposisi Finansial Laba Rugi",
    20,
    26,
  );

  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText(
    isEn
      ? "Distribution of revenue, direct expenses, and shared overhead"
      : "Proporsi perbandingan pendapatan, beban pokok, dan beban bersama",
    20,
    44,
  );

  // Divider
  ctx.strokeStyle = "#f1f5f9";
  ctx.beginPath();
  ctx.moveTo(20, 56);
  ctx.lineTo(width - 20, 56);
  ctx.stroke();

  // Donut Geometry
  const centerX = 160;
  const centerY = 190;
  const outerRadius = 95;
  const innerRadius = 55;

  const total =
    Math.max(0, inc.totalRevenue) +
    Math.max(0, inc.totalDirectExpense) +
    Math.max(0, inc.totalSharedExpense);

  const slices = [
    {
      label: isEn ? "Revenue" : "Pendapatan Usaha",
      val: Math.max(0, inc.totalRevenue),
      color: "#10b981",
    },
    {
      label: isEn ? "Direct Expense" : "Beban Langsung Proyek",
      val: Math.max(0, inc.totalDirectExpense),
      color: "#f59e0b",
    },
    {
      label: isEn ? "Shared Overhead" : "Beban Bersama & Umum",
      val: Math.max(0, inc.totalSharedExpense),
      color: "#2563eb",
    },
  ];

  if (total === 0) {
    // Empty state circle
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = outerRadius - innerRadius;
    ctx.beginPath();
    ctx.arc(centerX, centerY, (outerRadius + innerRadius) / 2, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    let currentAngle = -Math.PI / 2;
    for (const slice of slices) {
      const sliceAngle = (slice.val / total) * (Math.PI * 2);
      if (sliceAngle <= 0.001) continue;

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.fill();

      currentAngle += sliceAngle;
    }
  }

  // Center Text in Donut
  ctx.textAlign = "center";
  ctx.font = "10px sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText(isEn ? "Net Profit" : "Laba Bersih", centerX, centerY - 6);

  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = inc.netProfit >= 0 ? "#10b981" : "#ef4444";
  ctx.fillText(formatCompactRupiah(inc.netProfit), centerX, centerY + 12);

  // Right Side Legends & Details
  const legendLeft = 310;
  let rowY = 85;

  slices.forEach((s) => {
    const pct = total > 0 ? Math.round((s.val / total) * 100) : 0;

    // Dot
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(legendLeft, rowY + 5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.textAlign = "left";
    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#1e293b";
    ctx.fillText(s.label, legendLeft + 16, rowY + 9);

    // Value & Pct
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText(
      `${formatRupiah(s.val)} (${pct}%)`,
      legendLeft + 16,
      rowY + 26,
    );

    // Small progress bar
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(legendLeft + 16, rowY + 34, 380, 5);
    ctx.fillStyle = s.color;
    ctx.fillRect(legendLeft + 16, rowY + 34, Math.max(4, (pct / 100) * 380), 5);

    rowY += 58;
  });

  // Net Profit Card Box on Bottom Right
  const netBoxY = height - 60;
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.fillRect(legendLeft + 16, netBoxY, 380, 42);
  ctx.strokeRect(legendLeft + 16, netBoxY, 380, 42);

  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText(isEn ? "Accumulative Net Profit Margin:" : "Margin Laba Bersih Akumulatif:", legendLeft + 28, netBoxY + 18);

  const marginPct =
    inc.totalRevenue > 0
      ? Math.round((inc.netProfit / inc.totalRevenue) * 100)
      : 0;

  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = "#0f172a";
  ctx.fillText(`${formatRupiah(inc.netProfit)} (${marginPct}%)`, legendLeft + 28, netBoxY + 34);

  return canvasToPngBytes(canvas);
}

/** 3. Render Line / Area Chart Frekuensi Transaksi */
function renderTransactionFrequencyChart(
  series: DashboardChartData["monthlySeries"],
  isEn: boolean,
): Uint8Array | null {
  const width = 748;
  const height = 340;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  // Header
  ctx.font = "bold 15px sans-serif";
  ctx.fillStyle = "#0f172a";
  ctx.fillText(
    isEn ? "Frekuensi & Aktivitas Transaksi" : "Frekuensi & Aktivitas Transaksi",
    20,
    26,
  );

  const totalTx = series.reduce((sum, s) => sum + s.txCount, 0);
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText(
    isEn
      ? `Total ${totalTx} journal transactions recorded over active months`
      : `Total ${totalTx} transaksi jurnal terposting selama bulan aktif`,
    20,
    44,
  );

  // Divider
  ctx.strokeStyle = "#f1f5f9";
  ctx.beginPath();
  ctx.moveTo(20, 56);
  ctx.lineTo(width - 20, 56);
  ctx.stroke();

  // Plot Area
  const plotLeft = 60;
  const plotRight = width - 30;
  const plotTop = 80;
  const plotBottom = height - 45;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  let maxTx = 6;
  for (const s of series) {
    if (s.txCount > maxTx) maxTx = s.txCount;
  }
  maxTx = Math.max(6, Math.ceil(maxTx / 2) * 2);

  // Y-axis grid
  const steps = 3;
  ctx.textAlign = "right";
  ctx.font = "10px sans-serif";
  ctx.fillStyle = "#94a3b8";

  for (let i = 0; i <= steps; i++) {
    const val = Math.round((maxTx / steps) * i);
    const y = plotBottom - (i / steps) * plotHeight;

    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();

    ctx.fillText(`${val} trx`, plotLeft - 8, y + 3);
  }

  if (series.length > 0) {
    const points = series.map((s, idx) => {
      const x =
        series.length === 1
          ? plotLeft + plotWidth / 2
          : plotLeft + (idx / (series.length - 1)) * plotWidth;
      const y = plotBottom - (s.txCount / maxTx) * plotHeight;
      return { x, y, ...s };
    });

    // Area Gradient Fill
    const grad = ctx.createLinearGradient(0, plotTop, 0, plotBottom);
    grad.addColorStop(0, "rgba(37, 99, 235, 0.22)");
    grad.addColorStop(1, "rgba(37, 99, 235, 0.01)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, plotBottom);
    for (const pt of points) {
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.lineTo(points[points.length - 1]!.x, plotBottom);
    ctx.closePath();
    ctx.fill();

    // Line
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Nodes & Badges
    points.forEach((pt) => {
      // Circle node
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Value badge above
      ctx.textAlign = "center";
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "#1e293b";
      ctx.fillText(`${pt.txCount}`, pt.x, pt.y - 10);

      // X Label below
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#475569";
      ctx.fillText(pt.label, pt.x, plotBottom + 20);
    });
  }

  return canvasToPngBytes(canvas);
}

/** 4. Render AR Aging Chart (Sebaran Umur Piutang) */
function renderArAgingChart(
  buckets: DashboardChartData["agingBuckets"],
  total: number,
  isEn: boolean,
): Uint8Array | null {
  const width = 748;
  const height = 340;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  // Header
  ctx.font = "bold 15px sans-serif";
  ctx.fillStyle = "#0f172a";
  ctx.fillText(
    isEn ? "Sebaran Umur Piutang Usaha (AR Aging)" : "Sebaran Umur Piutang Usaha (AR Aging)",
    20,
    26,
  );

  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText(
    isEn
      ? `Total Outstanding Receivable: ${formatRupiah(total)}`
      : `Total Saldo Piutang Belum Tertagih: ${formatRupiah(total)}`,
    20,
    44,
  );

  // Status Badge in Header
  const badgeText = total === 0 ? "Kolektibilitas: 100% Lancar" : "Kolektibilitas: Terkelola";
  ctx.font = "bold 11px sans-serif";
  const badgeW = ctx.measureText(badgeText).width + 16;
  ctx.fillStyle = "#f0fdf4";
  ctx.strokeStyle = "#bbf7d0";
  ctx.fillRect(width - badgeW - 20, 18, badgeW, 24);
  ctx.strokeRect(width - badgeW - 20, 18, badgeW, 24);
  ctx.fillStyle = "#15803d";
  ctx.fillText(badgeText, width - badgeW - 12, 34);

  // Divider
  ctx.strokeStyle = "#f1f5f9";
  ctx.beginPath();
  ctx.moveTo(20, 56);
  ctx.lineTo(width - 20, 56);
  ctx.stroke();

  // Progress Bar Area
  const barX = 25;
  const barY = 80;
  const barW = width - 50;
  const barH = 32;

  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(barX, barY, barW, barH);

  const colors = ["#10b981", "#0ea5e9", "#f59e0b", "#f43f5e"];

  if (total === 0) {
    // 100% Belum Jatuh Tempo (Lancar)
    ctx.fillStyle = "#10b981";
    ctx.fillRect(barX, barY, barW, barH);

    ctx.textAlign = "center";
    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("100% Lancar / Belum Ada Tagihan Jatuh Tempo (Rp0)", barX + barW / 2, barY + 20);
  } else {
    let curX = barX;
    buckets.forEach((b, idx) => {
      const segW = (b.amount / total) * barW;
      if (segW > 0) {
        ctx.fillStyle = colors[idx % colors.length]!;
        ctx.fillRect(curX, barY, segW, barH);
        curX += segW;
      }
    });
  }

  // 4 Cards / KPI Boxes below
  const boxTop = 145;
  const boxW = (barW - 36) / 4;
  const boxH = 150;

  buckets.forEach((b, idx) => {
    const x = barX + idx * (boxW + 12);
    const color = colors[idx % colors.length]!;

    // Card background
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.fillRect(x, boxTop, boxW, boxH);
    ctx.strokeRect(x, boxTop, boxW, boxH);

    // Colored Accent Line at top
    ctx.fillStyle = color;
    ctx.fillRect(x, boxTop, boxW, 4);

    // Indicator Dot & Title
    ctx.beginPath();
    ctx.arc(x + 16, boxTop + 24, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = "left";
    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#1e293b";
    ctx.fillText(b.label, x + 26, boxTop + 28);

    // Amount Value
    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = b.amount > 0 ? "#0f172a" : "#64748b";
    ctx.fillText(formatRupiah(b.amount), x + 16, boxTop + 65);

    // Subtext
    const pct = total > 0 ? Math.round((b.amount / total) * 100) : 0;
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`Proporsi: ${pct}%`, x + 16, boxTop + 85);
    ctx.fillText(b.amount === 0 ? "Status: Nihil" : "Status: Aktif", x + 16, boxTop + 105);
  });

  return canvasToPngBytes(canvas);
}
