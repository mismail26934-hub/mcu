<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MCU PDF to Excel</title>
    <link rel="stylesheet" href="assets/styles.css" />
  </head>
  <body>
    <div class="page">
      <header class="header">
        <div>
          <p class="eyebrow">Trakindo / Tirta Medical Centre</p>
          <h1>MCU PDF to Excel</h1>
          <p class="subtitle">
            Upload massal PDF MCU, proses ke Excel, lihat preview, dan download
            file hasil.
          </p>
        </div>
        <div class="status-card" id="statusCard">
          <div>
            <span class="label">PDF menunggu</span>
            <strong id="pendingCount">-</strong>
          </div>
          <div>
            <span class="label">File Excel</span>
            <strong id="excelName">-</strong>
          </div>
        </div>
      </header>

      <main class="grid">
        <section class="panel">
          <h2>1. Upload PDF</h2>
          <p>Pilih banyak file PDF sekaligus. File disimpan ke folder <code>PDF FIle</code>.</p>

          <label class="dropzone" for="pdfInput">
            <input id="pdfInput" type="file" accept=".pdf,application/pdf" multiple />
            <span class="dropzone-title">Klik atau tarik PDF ke sini</span>
            <span class="dropzone-hint">Maks. 50 file, 15 MB per file</span>
          </label>

          <div id="selectedFiles" class="file-list"></div>

          <div class="actions">
            <button id="uploadBtn" class="btn primary" type="button">Upload PDF</button>
            <button id="refreshBtn" class="btn secondary" type="button">Refresh Status</button>
          </div>

          <div id="uploadLog" class="log"></div>
        </section>

        <section class="panel">
          <h2>2. Proses ke Excel</h2>
          <p>Ekstrak data dari semua PDF di folder, tulis ke sheet <strong>CONTOH</strong>, lalu pindahkan PDF sukses ke <code>PDF-backup</code>.</p>

          <div class="actions">
            <button id="processBtn" class="btn primary" type="button">Proses MCU</button>
          </div>

          <div id="processLog" class="log"></div>
        </section>

        <section class="panel panel-wide">
          <div class="panel-head">
            <div>
              <h2>3. Preview & Download Excel</h2>
              <p>Tampilan data sheet CONTOH. Formatting Excel asli mungkin berbeda.</p>
            </div>
            <div class="actions">
              <button id="previewBtn" class="btn secondary" type="button">Muat Preview</button>
              <button id="deleteBtn" class="btn danger" type="button" disabled>
                Hapus Terpilih (<span id="selectedCount">0</span>)
              </button>
              <a id="downloadBtn" class="btn primary" href="api/download.php">Download Excel</a>
            </div>
          </div>

          <div id="deleteLog" class="log"></div>

          <div class="table-wrap">
            <table id="previewTable">
              <thead></thead>
              <tbody></tbody>
            </table>
          </div>
        </section>
      </main>
    </div>

    <script src="assets/app.js"></script>
  </body>
</html>
