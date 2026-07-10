const pendingCountEl = document.getElementById("pendingCount");
const excelNameEl = document.getElementById("excelName");
const pdfInput = document.getElementById("pdfInput");
const selectedFilesEl = document.getElementById("selectedFiles");
const uploadBtn = document.getElementById("uploadBtn");
const refreshBtn = document.getElementById("refreshBtn");
const processBtn = document.getElementById("processBtn");
const previewBtn = document.getElementById("previewBtn");
const uploadLog = document.getElementById("uploadLog");
const processLog = document.getElementById("processLog");
const previewTable = document.getElementById("previewTable");
const dropzone = document.querySelector(".dropzone");

function setLog(element, message, className = "") {
  element.textContent = message;
  element.className = className ? `log ${className}` : "log";
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request gagal (${response.status})`);
  }

  return data;
}

async function loadStatus() {
  const status = await fetchJson("/api/status");
  pendingCountEl.textContent = String(status.pendingPdfCount);
  excelNameEl.textContent = status.excelFile || "Belum ada";
  return status;
}

function renderSelectedFiles(files) {
  if (!files.length) {
    selectedFilesEl.textContent = "";
    return;
  }

  selectedFilesEl.textContent = `${files.length} file dipilih: ${Array.from(files)
    .map((file) => file.name)
    .join(", ")}`;
}

function renderPreview(preview) {
  const thead = previewTable.querySelector("thead");
  const tbody = previewTable.querySelector("tbody");

  thead.innerHTML = `
    <tr>
      <th>Baris</th>
      ${preview.headers.map((header) => `<th>${header}</th>`).join("")}
    </tr>
  `;

  if (!preview.rows.length) {
    tbody.innerHTML = `<tr><td colspan="${preview.headers.length + 1}">Belum ada data.</td></tr>`;
    return;
  }

  tbody.innerHTML = preview.rows
    .map((row) => {
      const cells = [
        row.no,
        row.verifDate,
        row.mcuDate,
        row.company,
        row.employeeNumber,
        row.name,
        row.gender,
        row.position,
        row.dob,
        row.mcuProvider,
        row.visus,
        row.bp,
        row.lipid,
        row.gdp,
        row.bmi,
        row.underweight,
        row.lft,
        row.smoking,
      ];

      return `
        <tr>
          <td>${row.excelRow}</td>
          ${cells.map((value) => `<td>${value ?? ""}</td>`).join("")}
        </tr>
      `;
    })
    .join("");
}

function renderProcessLog(result) {
  const lines = result.results.map((item) => {
    if (item.status === "ok") {
      return `[OK] ${item.file}\n  E/N: ${item.employeeNumber} | Nama: ${item.name} | Baris: ${item.excelRow}`;
    }
    return `[SKIP] ${item.file}\n  ${item.error}`;
  });

  if (result.isFallbackCopy) {
    lines.push(
      "",
      "Excel sedang dibuka. Hasil disimpan ke salinan - updated.xlsx"
    );
  }

  if (result.moved?.length) {
    lines.push("", "PDF dipindah ke PDF-backup:");
    for (const item of result.moved) {
      lines.push(`  ${item.file} -> ${item.backupName}`);
    }
  }

  processLog.innerHTML = lines
    .map((line) => {
      if (line.startsWith("[OK]")) return `<span class="ok">${line}</span>`;
      if (line.startsWith("[SKIP]")) return `<span class="skip">${line}</span>`;
      return line;
    })
    .join("\n");
}

pdfInput.addEventListener("change", () => {
  renderSelectedFiles(pdfInput.files);
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragover");
  pdfInput.files = event.dataTransfer.files;
  renderSelectedFiles(pdfInput.files);
});

uploadBtn.addEventListener("click", async () => {
  const files = pdfInput.files;
  if (!files.length) {
    setLog(uploadLog, "Pilih minimal 1 file PDF.");
    return;
  }

  uploadBtn.disabled = true;
  setLog(uploadLog, "Mengupload PDF...");

  try {
    const formData = new FormData();
    for (const file of files) {
      formData.append("pdfs", file);
    }

    const result = await fetchJson("/api/upload", {
      method: "POST",
      body: formData,
    });

    setLog(
      uploadLog,
      `${result.message}\n${result.files.map((file) => `- ${file.savedAs}`).join("\n")}`
    );
    pdfInput.value = "";
    renderSelectedFiles([]);
    await loadStatus();
  } catch (error) {
    setLog(uploadLog, error.message);
  } finally {
    uploadBtn.disabled = false;
  }
});

processBtn.addEventListener("click", async () => {
  processBtn.disabled = true;
  setLog(processLog, "Memproses PDF...");

  try {
    const result = await fetchJson("/api/process", { method: "POST" });
    renderProcessLog(result);
    if (result.preview) {
      renderPreview(result.preview);
    }
    await loadStatus();
  } catch (error) {
    setLog(processLog, error.message);
  } finally {
    processBtn.disabled = false;
  }
});

previewBtn.addEventListener("click", async () => {
  previewBtn.disabled = true;

  try {
    const preview = await fetchJson("/api/excel/preview");
    renderPreview(preview);
  } catch (error) {
    renderPreview({ headers: [], rows: [] });
    setLog(processLog, error.message);
  } finally {
    previewBtn.disabled = false;
  }
});

refreshBtn.addEventListener("click", async () => {
  try {
    await loadStatus();
    setLog(uploadLog, "Status diperbarui.");
  } catch (error) {
    setLog(uploadLog, error.message);
  }
});

loadStatus().catch((error) => {
  pendingCountEl.textContent = "?";
  excelNameEl.textContent = "Error";
  setLog(uploadLog, error.message);
});
