/**
 * Utility functions untuk generate dokumen SPK
 */

/**
 * Konversi tanggal ke format Indonesia lengkap
 * Input: "31/10/2025" atau Date object
 * Output: "Jumat, tanggal tiga puluh satu, bulan Oktober, tahun dua ribu dua puluh lima"
 */
export function dateToIndonesianText(dateInput: string | Date): string {
  let date: Date;

  if (typeof dateInput === "string") {
    // Parse format dd/mm/yyyy
    const [day, month, year] = dateInput.split("/").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = dateInput;
  }

  // Nama hari dalam bahasa Indonesia
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const dayName = days[date.getDay()];

  // Nama bulan dalam bahasa Indonesia
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const monthName = months[date.getMonth()];

  // Konversi tanggal ke terbilang
  const dayNumber = date.getDate();
  const dayText = numberToWords(dayNumber);

  // Konversi tahun ke terbilang
  const year = date.getFullYear();
  const yearText = numberToWords(year);

  return `${dayName}, tanggal ${dayText}, bulan ${monthName}, tahun ${yearText}`;
}

/**
 * Konversi angka ke kata-kata Indonesia
 * Mendukung angka sampai miliaran
 */
export function numberToWords(num: number): string {
  if (num === 0) return "nol";

  const ones = [
    "",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
  ];
  const teens = [
    "sepuluh",
    "sebelas",
    "dua belas",
    "tiga belas",
    "empat belas",
    "lima belas",
    "enam belas",
    "tujuh belas",
    "delapan belas",
    "sembilan belas",
  ];

  function convertLessThanThousand(n: number): string {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n >= 10 && n < 20) return teens[n - 10];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const one = n % 10;
      return ones[ten] + " puluh" + (one > 0 ? " " + ones[one] : "");
    }

    // 100-999
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    const hundredText = hundred === 1 ? "seratus" : ones[hundred] + " ratus";
    return hundredText + (rest > 0 ? " " + convertLessThanThousand(rest) : "");
  }

  function convertLargeNumber(n: number): string {
    if (n === 0) return "nol";
    if (n < 1000) return convertLessThanThousand(n);

    // Handle ribuan (thousands)
    if (n < 1000000) {
      const thousand = Math.floor(n / 1000);
      const rest = n % 1000;
      const thousandText =
        thousand === 1 ? "seribu" : convertLessThanThousand(thousand) + " ribu";
      return (
        thousandText + (rest > 0 ? " " + convertLessThanThousand(rest) : "")
      );
    }

    // Handle jutaan (millions)
    if (n < 1000000000) {
      const million = Math.floor(n / 1000000);
      const rest = n % 1000000;
      const millionText = convertLessThanThousand(million) + " juta";
      return millionText + (rest > 0 ? " " + convertLargeNumber(rest) : "");
    }

    // Handle miliaran (billions)
    const billion = Math.floor(n / 1000000000);
    const rest = n % 1000000000;
    const billionText = convertLessThanThousand(billion) + " miliar";
    return billionText + (rest > 0 ? " " + convertLargeNumber(rest) : "");
  }

  return convertLargeNumber(num);
}

/**
 * Format rupiah ke terbilang
 * Input: 1320000
 * Output: "satu juta tiga ratus dua puluh ribu rupiah"
 */
export function rupiahToWords(amount: number): string {
  if (amount === 0) return "nol rupiah";
  return numberToWords(amount) + " rupiah";
}

/**
 * Format currency ke format Rupiah
 * Input: 1320000
 * Output: "Rp 1.320.000"
 */
export function formatRupiah(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

/**
 * Get first and last day of month
 */
export function getMonthRange(
  year: number,
  month: number,
): { startDate: Date; endDate: Date; startText: string; endText: string } {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Day 0 of next month = last day of current month

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const monthName = months[month - 1];

  return {
    startDate,
    endDate,
    startText: `1 ${monthName} ${year}`,
    endText: `${endDate.getDate()} ${monthName} ${year}`,
  };
}

/**
 * Parse date from dd/mm/yyyy to Date object
 */
export function parseIndonesianDate(dateString: string): Date {
  const [day, month, year] = dateString.split("/").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format date to dd/mm/yyyy
 */
export function formatIndonesianDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
