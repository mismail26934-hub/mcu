/**
 * Ekstrak field dari PDF MCU (Trakindo/Tirta) ke Excel
 * Usage: node extract-mcu-to-excel.js
 */

const { processAllPdfs } = require("./lib/extract");

async function main() {
  const result = await processAllPdfs({ moveToBackup: true });

  console.log(`Memproses ${result.results.length} file PDF...\n`);

  for (const item of result.results) {
    if (item.status === "ok") {
      console.log(`[OK] ${item.file}`);
      console.log(`     E/N: ${item.employeeNumber}`);
      console.log(`     Nama: ${item.name}`);
      console.log(`     Baris Excel: ${item.excelRow}`);
      console.log(
        `     BP: ${item.bp} | Lipid: ${item.lipid} | GDP: ${item.gdp}`
      );
      console.log("");
    } else {
      console.error(`[SKIP] ${item.file}: ${item.error}\n`);
    }
  }

  if (result.isFallbackCopy) {
    console.log(
      "File Excel sedang dibuka. Hasil disimpan ke salinan baru:\n"
    );
  }

  console.log(`Selesai. Data ditulis ke sheet "CONTOH" pada:`);
  console.log(result.outputFile);

  if (result.isFallbackCopy) {
    console.log(
      "\nCatatan: Tutup file Excel asli, lalu ganti/rename file salinan di atas."
    );
  }

  if (result.moved.length > 0) {
    console.log(`\nMemindahkan ${result.moved.length} PDF ke PDF-backup...`);
    for (const item of result.moved) {
      console.log(`  [MOVED] ${item.file} -> ${item.backupName}`);
    }
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
