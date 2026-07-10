const pendingCountEl = document.getElementById("pendingCount");
const excelNameEl = document.getElementById("excelName");
const pdfInput = document.getElementById("pdfInput");
const selectedFilesEl = document.getElementById("selectedFiles");
const uploadBtn = document.getElementById("uploadBtn");
const refreshBtn = document.getElementById("refreshBtn");
const processBtn = document.getElementById("processBtn");
const previewBtn = document.getElementById("previewBtn");
const deleteBtn = document.getElementById("deleteBtn");
const selectedCountEl = document.getElementById("selectedCount");
const uploadLog = document.getElementById("uploadLog");
const processLog = document.getElementById("processLog");
const deleteLog = document.getElementById("deleteLog");
const previewTable = document.getElementById("previewTable");
const dropzone = document.querySelector(".dropzone");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

function getSelectedExcelRows() {
  return Array.from(previewTable.querySelectorAll(".row-select:checked")).map(
    (input) => Number(input.dataset.excelRow)
  );
}

function updateSelectionState() {
  const checkboxes = previewTable.querySelectorAll(".row-select");
  const checked = previewTable.querySelectorAll(".row-select:checked");
  const selectAll = previewTable.querySelector("#selectAllRows");

  selectedCountEl.textContent = String(checked.length);
  deleteBtn.disabled = checked.length === 0;

  if (selectAll) {
    selectAll.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
    selectAll.indeterminate =
      checked.length > 0 && checked.length < checkboxes.length;
  }

  checkboxes.forEach((input) => {
    input.closest("tr")?.classList.toggle("selected", input.checked);
  });
}

function renderPreview(preview) {
  const thead = previewTable.querySelector("thead");
  const tbody = previewTable.querySelector("tbody");
  const headers = preview.headers || [];

  thead.innerHTML = `
    <tr>
      <th class="select-col">
        <input id="selectAllRows" type="checkbox" title="Pilih semua" />
      </th>
      <th>Baris</th>
      ${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}
    </tr>
  `;

  if (!preview.rows.length) {
    tbody.innerHTML = `<tr><td colspan="${headers.length + 2}">Belum ada data.</td></tr>`;
    updateSelectionState();
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
          <td class="select-col">
            <input
              class="row-select"
              type="checkbox"
              data-excel-row="${row.excelRow}"
              aria-label="Pilih baris ${row.excelRow}"
            />
          </td>
          <td>${row.excelRow}</td>
          ${cells.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}
        </tr>
      `;
    })
    .join("");

  updateSelectionState();
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
    setLog(deleteLog, "");
  } catch (error) {
    renderPreview({ headers: [], rows: [] });
    setLog(processLog, error.message);
  } finally {
    previewBtn.disabled = false;
  }
});

previewTable.addEventListener("change", (event) => {
  const target = event.target;

  if (target.id === "selectAllRows") {
    const checked = target.checked;
    previewTable.querySelectorAll(".row-select").forEach((input) => {
      input.checked = checked;
    });
  }

  if (target.classList.contains("row-select") || target.id === "selectAllRows") {
    updateSelectionState();
  }
});

deleteBtn.addEventListener("click", async () => {
  const excelRows = getSelectedExcelRows();
  if (!excelRows.length) {
    setLog(deleteLog, "Pilih minimal 1 baris untuk dihapus.");
    return;
  }

  const confirmed = window.confirm(
    `Hapus ${excelRows.length} baris terpilih dari Excel?\n\nTindakan ini tidak bisa dibatalkan.`
  );
  if (!confirmed) return;

  deleteBtn.disabled = true;
  setLog(deleteLog, "Menghapus baris terpilih...");

  try {
    const result = await fetchJson("/api/excel/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excelRows }),
    });

    const lines = [
      result.message,
      ...result.deleted.map(
        (item) =>
          `- Baris ${item.excelRow}: ${item.employeeNumber} | ${item.name}`
      ),
    ];

    if (result.isFallbackCopy) {
      lines.push(
        "",
        "PENTING: Tutup file Excel yang sedang dibuka.",
        "Perubahan disimpan ke: NEW List Pengajuan Verifikasi MCU KPC - updated.xlsx"
      );
    } else {
      lines.push("", `File diperbarui: ${result.outputFileName}`);
    }

    setLog(deleteLog, lines.join("\n"));

    const preview = await fetchJson("/api/excel/preview");
    renderPreview(preview);
    await loadStatus();
  } catch (error) {
    setLog(deleteLog, error.message);
    updateSelectionState();
  } finally {
    deleteBtn.disabled = getSelectedExcelRows().length === 0;
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
