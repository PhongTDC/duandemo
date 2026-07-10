// ====================================================================
// STATE MANAGEMENT & LOCAL STORAGE
// ====================================================================
let currentPage = 1;
const itemsPerPage = 12;
let filteredPrograms = [...trainingPrograms];
let currentView = 'grid'; // 'grid' or 'table'
let selectedProgram = null;

// IndexedDB Helper for simulating local file storage in standard browser
const dbName = "MedicalDocumentsDB";
const storeName = "files";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "programId" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveFileLocal(programId, file) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(transaction.db.objectStoreNames[0] || storeName);
    
    const record = {
      programId: parseInt(programId),
      name: file.name,
      type: file.type,
      data: file // Store the file blob directly
    };
    
    const request = store.put(record);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

async function getFileLocal(programId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(parseInt(programId));
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteFileLocal(programId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(parseInt(programId));
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// ====================================================================
// DOM ELEMENTS
// ====================================================================
const themeToggleBtn = document.getElementById('themeToggleBtn');
const searchInput = document.getElementById('searchInput');
const filterSection = document.getElementById('filterSection');
const filterLevel = document.getElementById('filterLevel');
const filterStatus = document.getElementById('filterStatus');
const filterSource = document.getElementById('filterSource');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const resultsCount = document.getElementById('resultsCount');
const gridToggle = document.getElementById('gridToggle');
const tableToggle = document.getElementById('tableToggle');
const cardsContainer = document.getElementById('cardsContainer');
const tableWrapper = document.getElementById('tableWrapper');
const tableBody = document.getElementById('tableBody');
const pagination = document.getElementById('pagination');

// Stats DOM
const statTotal = document.getElementById('statTotal');
const statCo = document.getElementById('statCo');
const statThieu = document.getElementById('statThieu');
const statNgoai = document.getElementById('statNgoai');

// Modal DOM
const detailModal = document.getElementById('detailModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalSection = document.getElementById('modalSection');
const modalTitle = document.getElementById('modalTitle');
const modalId = document.getElementById('modalId');
const modalTtCn = document.getElementById('modalTtCn');
const modalDuration = document.getElementById('modalDuration');
const modalLevel = document.getElementById('modalLevel');
const modalDocStatus = document.getElementById('modalDocStatus');
const modalDocSource = document.getElementById('modalDocSource');
const modalAudience = document.getElementById('modalAudience');
const modalNote = document.getElementById('modalNote');
const modalReviewNote = document.getElementById('modalReviewNote');
const modalNoteContainer = document.getElementById('modalNoteContainer');
const modalReviewNoteContainer = document.getElementById('modalReviewNoteContainer');
const modalDriveBtn = document.getElementById('modalDriveBtn');
const modalSearchDriveBtn = document.getElementById('modalSearchDriveBtn');

// Local upload/download DOM
const localFileInput = document.getElementById('localFileInput');
const localFileStatus = document.getElementById('localFileStatus');
const localFileName = document.getElementById('localFileName');
const localFileDownloadBtn = document.getElementById('localFileDownloadBtn');
const localFileDeleteBtn = document.getElementById('localFileDeleteBtn');
const localFileViewBtn = document.getElementById('localFileViewBtn');
const localFileViewerContainer = document.getElementById('localFileViewerContainer');
const localFileViewerContent = document.getElementById('localFileViewerContent');
const closeLocalFileViewerBtn = document.getElementById('closeLocalFileViewerBtn');

let currentViewObjectUrl = null;

// Sync Modal DOM
const syncDataBtn = document.getElementById('syncDataBtn');
const syncModal = document.getElementById('syncModal');
const syncModalCloseBtn = document.getElementById('syncModalCloseBtn');
const syncExportCount = document.getElementById('syncExportCount');
const syncExportSize = document.getElementById('syncExportSize');
const exportBackupBtn = document.getElementById('exportBackupBtn');
const syncFileInput = document.getElementById('syncFileInput');
const syncImportStatus = document.getElementById('syncImportStatus');
const syncExportJsonText = document.getElementById('syncExportJsonText');
const syncImportJsonText = document.getElementById('syncImportJsonText');
const importJsonBtn = document.getElementById('importJsonBtn');

// Fullscreen Viewer DOM
const fullscreenViewer = document.getElementById('fullscreenViewer');
const closeFullscreenViewerBtn = document.getElementById('closeFullscreenViewerBtn');
const fullscreenViewerTitle = document.getElementById('fullscreenViewerTitle');
const fullscreenOpenTabBtn = document.getElementById('fullscreenOpenTabBtn');
const fullscreenDownloadBtn = document.getElementById('fullscreenDownloadBtn');
const fullscreenViewerContent = document.getElementById('fullscreenViewerContent');
const pdfControlsBar = document.getElementById('pdfControlsBar');
const pdfPrevPageBtn = document.getElementById('pdfPrevPageBtn');
const pdfNextPageBtn = document.getElementById('pdfNextPageBtn');
const pdfCurrentPageNum = document.getElementById('pdfCurrentPageNum');
const pdfTotalPages = document.getElementById('pdfTotalPages');
const pdfZoomOutBtn = document.getElementById('pdfZoomOutBtn');
const pdfZoomInBtn = document.getElementById('pdfZoomInBtn');
const pdfZoomPercent = document.getElementById('pdfZoomPercent');

// PDF.js State Variables
let currentPdfDoc = null;
let currentPdfPageNum = 1;
let currentPdfScale = 1.0;
let isRenderingPage = false;
let pageRenderingPending = null;

// Configure PDF.js Worker
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

// ====================================================================
// INITIALIZATION
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDropdowns();
  updateStats();
  applyFilters();
  
  // Event listeners
  themeToggleBtn.addEventListener('click', toggleTheme);
  searchInput.addEventListener('input', () => { currentPage = 1; applyFilters(); });
  filterSection.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  filterLevel.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  filterStatus.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  filterSource.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  resetFiltersBtn.addEventListener('click', resetFilters);
  exportExcelBtn.addEventListener('click', exportExcel);
  
  gridToggle.addEventListener('click', () => switchView('grid'));
  tableToggle.addEventListener('click', () => switchView('table'));
  
  modalCloseBtn.addEventListener('click', closeModal);
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeModal();
  });
  
  // Local File Interactions
  localFileInput.addEventListener('change', handleLocalFileUpload);
  localFileDownloadBtn.addEventListener('click', downloadLocalFile);
  localFileDeleteBtn.addEventListener('click', deleteLocalFile);
  localFileViewBtn.addEventListener('click', viewLocalFile);
  closeLocalFileViewerBtn.addEventListener('click', () => {
    localFileViewerContainer.style.display = 'none';
    localFileViewerContent.innerHTML = '';
    if (currentViewObjectUrl) {
      URL.revokeObjectURL(currentViewObjectUrl);
      currentViewObjectUrl = null;
    }
  });

  // Fullscreen Viewer Event Listeners
  closeFullscreenViewerBtn.addEventListener('click', closeFullscreenViewer);
  fullscreenOpenTabBtn.addEventListener('click', openFullscreenFileInNewTab);
  fullscreenDownloadBtn.addEventListener('click', downloadFullscreenFile);
  pdfPrevPageBtn.addEventListener('click', showPrevPdfPage);
  pdfNextPageBtn.addEventListener('click', showNextPdfPage);
  pdfZoomOutBtn.addEventListener('click', zoomOutPdf);
  pdfZoomInBtn.addEventListener('click', zoomInPdf);

  // Sync Modal Events
  syncDataBtn.addEventListener('click', openSyncModal);
  syncModalCloseBtn.addEventListener('click', closeSyncModal);
  syncModal.addEventListener('click', (e) => {
    if (e.target === syncModal) closeSyncModal();
  });
  exportBackupBtn.addEventListener('click', exportDatabase);
  syncFileInput.addEventListener('change', handleImportBackup);
  if (importJsonBtn) {
    importJsonBtn.addEventListener('click', handleImportJsonText);
  }
});

// ====================================================================
// THEME CONTROL
// ====================================================================
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const icon = themeToggleBtn.querySelector('i');
  if (theme === 'dark') {
    icon.className = 'fa-solid fa-sun';
  } else {
    icon.className = 'fa-solid fa-moon';
  }
}

// ====================================================================
// STATISTICS METRICS
// ====================================================================
function updateStats() {
  const total = trainingPrograms.length;
  const co = trainingPrograms.filter(p => p.doc_status === 'Có').length;
  const thieu = trainingPrograms.filter(p => p.doc_status === 'Thiếu').length;
  const ngoai = trainingPrograms.filter(p => p.doc_source && p.doc_source.includes('Không phải của BVBM')).length;
  
  statTotal.innerText = total.toLocaleString();
  statCo.innerText = co.toLocaleString();
  statThieu.innerText = thieu.toLocaleString();
  statNgoai.innerText = ngoai.toLocaleString();
}

// ====================================================================
// DROPDOWNS POPULATION
// ====================================================================
function initDropdowns() {
  // Extract unique sections
  const sections = [...new Set(trainingPrograms.map(p => p.section))].filter(Boolean).sort();
  sections.forEach(sect => {
    const opt = document.createElement('option');
    opt.value = sect;
    opt.innerText = sect;
    filterSection.appendChild(opt);
  });
}

// ====================================================================
// SEARCH & FILTERING LOGIC
// ====================================================================
function applyFilters() {
  const query = searchInput.value.toLowerCase().trim();
  const sectVal = filterSection.value;
  const levelVal = filterLevel.value;
  const statusVal = filterStatus.value;
  const sourceVal = filterSource.value;
  
  filteredPrograms = trainingPrograms.filter(prog => {
    // 1. Text Search
    const matchQuery = !query || 
      (prog.name && prog.name.toLowerCase().includes(query)) ||
      (prog.audience && prog.audience.toLowerCase().includes(query)) ||
      (prog.note && prog.note.toLowerCase().includes(query)) ||
      (prog.id && prog.id.toString().includes(query));
      
    // 2. Section Filter
    const matchSect = sectVal === 'all' || prog.section === sectVal;
    
    // 3. Level Filter
    const matchLevel = levelVal === 'all' || (prog.level && prog.level.includes(levelVal));
    
    // 4. Status Filter
    const matchStatus = statusVal === 'all' || prog.doc_status === statusVal;
    
    // 5. Source Filter
    const matchSource = sourceVal === 'all' || prog.doc_source === sourceVal;
    
    return matchQuery && matchSect && matchLevel && matchStatus && matchSource;
  });
  
  resultsCount.innerText = `Đang tìm thấy ${filteredPrograms.length} chương trình`;
  renderData();
}

function resetFilters() {
  searchInput.value = '';
  filterSection.value = 'all';
  filterLevel.value = 'all';
  filterStatus.value = 'all';
  filterSource.value = 'all';
  currentPage = 1;
  applyFilters();
}

// ====================================================================
// DATA RENDERING (GRID/TABLE & PAGINATION)
// ====================================================================
function switchView(view) {
  currentView = view;
  if (view === 'grid') {
    gridToggle.classList.add('active');
    tableToggle.classList.remove('active');
    cardsContainer.style.display = 'grid';
    tableWrapper.style.display = 'none';
  } else {
    gridToggle.classList.remove('active');
    tableToggle.classList.add('active');
    cardsContainer.style.display = 'none';
    tableWrapper.style.display = 'block';
  }
  renderData();
}

function renderData() {
  // Compute page slices
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = filteredPrograms.slice(startIndex, endIndex);
  
  if (currentView === 'grid') {
    renderGrid(pageItems);
  } else {
    renderTable(pageItems);
  }
  
  renderPagination();
}

function getBadgeClass(status) {
  if (status === 'Có') return 'badge-success';
  if (status === 'Thiếu') return 'badge-warning';
  return 'badge-danger';
}

function getDocIcon(status) {
  if (status === 'Có') return '<i class="fa-solid fa-circle-check"></i>';
  if (status === 'Thiếu') return '<i class="fa-solid fa-circle-exclamation"></i>';
  return '<i class="fa-solid fa-circle-question"></i>';
}

function renderGrid(items) {
  cardsContainer.innerHTML = '';
  
  if (items.length === 0) {
    cardsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">Không có dữ liệu phù hợp bộ lọc.</div>`;
    return;
  }
  
  items.forEach(prog => {
    const card = document.createElement('div');
    card.className = 'program-card';
    card.addEventListener('click', () => openModal(prog));
    
    const badgeClass = getBadgeClass(prog.doc_status);
    const docIcon = getDocIcon(prog.doc_status);
    
    card.innerHTML = `
      <div class="card-top">
        <span class="card-section">${prog.section}</span>
        <h3 class="card-title">${prog.name}</h3>
        <div class="card-meta">
          <span class="meta-item"><i class="fa-solid fa-fingerprint"></i> ID: ${prog.id}</span>
          ${prog.duration ? `<span class="meta-item"><i class="fa-solid fa-clock"></i> ${prog.duration}</span>` : ''}
          ${prog.level ? `<span class="meta-item"><i class="fa-solid fa-graduation-cap"></i> ${prog.level}</span>` : ''}
        </div>
      </div>
      <div class="card-bottom">
        <span class="badge ${badgeClass}">${docIcon} ${prog.doc_status}</span>
        <span style="font-size: 0.8rem; color: var(--text-secondary); max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <i class="fa-solid fa-building-shield"></i> ${prog.doc_source || 'Chưa rõ'}
        </span>
      </div>
    `;
    cardsContainer.appendChild(card);
  });
}

function renderTable(items) {
  tableBody.innerHTML = '';
  
  if (items.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-secondary);">Không có dữ liệu phù hợp bộ lọc.</td></tr>`;
    return;
  }
  
  items.forEach(prog => {
    const tr = document.createElement('tr');
    tr.addEventListener('click', () => openModal(prog));
    
    const badgeClass = getBadgeClass(prog.doc_status);
    const docIcon = getDocIcon(prog.doc_status);
    
    tr.innerHTML = `
      <td><b>${prog.id}</b></td>
      <td><div style="font-weight: 600; color: var(--text-primary); max-width: 450px; white-space: normal;">${prog.name}</div></td>
      <td><span style="font-size: 0.85rem; color: var(--text-secondary);">${prog.section}</span></td>
      <td><span style="font-size: 0.85rem;">${prog.level || '-'}</span></td>
      <td><span class="badge ${badgeClass}">${docIcon} ${prog.doc_status}</span></td>
      <td><span style="font-size: 0.85rem; color: var(--text-secondary);">${prog.doc_source || 'Chưa rõ'}</span></td>
      <td class="col-action">
        <button class="btn btn-secondary" style="padding: 0.4rem 0.7rem; font-size: 0.8rem;"><i class="fa-solid fa-eye"></i> Xem</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderPagination() {
  pagination.innerHTML = '';
  const totalPages = Math.ceil(filteredPrograms.length / itemsPerPage);
  
  if (totalPages <= 1) return;
  
  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderData();
    }
  });
  pagination.appendChild(prevBtn);
  
  // Smart page numbers (display max 5 pages)
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${currentPage === i ? 'active' : ''}`;
    btn.innerText = i;
    btn.addEventListener('click', () => {
      currentPage = i;
      renderData();
    });
    pagination.appendChild(btn);
  }
  
  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderData();
    }
  });
  pagination.appendChild(nextBtn);
}

// ====================================================================
// MODAL INTERACTIONS & FILE ATTACHMENTS
// ====================================================================
async function openModal(prog) {
  selectedProgram = prog;
  
  // Populate static fields
  modalSection.innerText = prog.section;
  modalTitle.innerText = prog.name;
  modalId.innerText = prog.id;
  modalTtCn.innerText = prog.tt_cn || 'N/A';
  modalDuration.innerText = prog.duration || 'Chưa rõ';
  modalLevel.innerText = prog.level || 'Chưa rõ';
  modalDocStatus.innerText = prog.doc_status;
  modalDocSource.innerText = prog.doc_source || 'Chưa rõ';
  modalAudience.innerText = prog.audience || 'Chưa có thông tin đối tượng học viên.';
  
  // Handle Ghi chú
  if (prog.note) {
    modalNote.innerText = prog.note;
    modalNoteContainer.style.display = 'block';
  } else {
    modalNoteContainer.style.display = 'none';
  }
  
  if (prog.review_note) {
    modalReviewNote.innerText = prog.review_note;
    modalReviewNoteContainer.style.display = 'block';
  } else {
    modalReviewNoteContainer.style.display = 'none';
  }
  
  // Google Drive buttons
  if (prog.document_url) {
    modalDriveBtn.href = prog.document_url;
    modalDriveBtn.style.display = 'inline-flex';
  } else {
    modalDriveBtn.style.display = 'none';
  }
  
  modalSearchDriveBtn.href = `https://drive.google.com/drive/search?q=${encodeURIComponent(prog.name)}`;
  
  // Check and display local file status from IndexedDB
  await refreshLocalFileStatus();
  
  // Open modal animation
  detailModal.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // Lock body scroll
}

function closeModal() {
  detailModal.style.display = 'none';
  document.body.style.overflow = ''; // Unlock body scroll
  selectedProgram = null;
  
  // Hide viewer container and clear contents
  if (localFileViewerContainer) {
    localFileViewerContainer.style.display = 'none';
    localFileViewerContent.innerHTML = '';
  }
  if (currentViewObjectUrl) {
    URL.revokeObjectURL(currentViewObjectUrl);
    currentViewObjectUrl = null;
  }
}

// ====================================================================
// REAL SIMULATED LOCAL FILE UPLOAD/DOWNLOAD
// ====================================================================
async function refreshLocalFileStatus() {
  if (!selectedProgram) return;
  
  try {
    const fileRecord = await getFileLocal(selectedProgram.id);
    if (fileRecord) {
      localFileName.innerText = fileRecord.name;
      localFileStatus.style.display = 'flex';
    } else {
      localFileStatus.style.display = 'none';
      if (localFileViewerContainer) {
        localFileViewerContainer.style.display = 'none';
        localFileViewerContent.innerHTML = '';
      }
      if (currentViewObjectUrl) {
        URL.revokeObjectURL(currentViewObjectUrl);
        currentViewObjectUrl = null;
      }
    }
    localFileInput.value = ''; // Reset input element
  } catch (e) {
    console.error("Lỗi truy cập dữ liệu tệp cục bộ:", e);
    localFileStatus.style.display = 'none';
  }
}

async function handleLocalFileUpload(e) {
  if (!selectedProgram || !e.target.files.length) return;
  
  const file = e.target.files[0];
  
  // Visual Feedback
  const uploadBox = document.querySelector('.uploader-box');
  const originalText = uploadBox.innerHTML;
  uploadBox.innerHTML = `<i class="fa-solid fa-spinner fa-spin uploader-icon"></i> <div>Đang lưu trữ tệp tin chi tiết...</div>`;
  
  try {
    // Save to IndexedDB
    await saveFileLocal(selectedProgram.id, file);
    
    // Update local state in memory
    selectedProgram.doc_status = 'Có';
    
    // Update main program statistics
    const idx = trainingPrograms.findIndex(p => p.id === selectedProgram.id);
    if (idx !== -1) {
      trainingPrograms[idx].doc_status = 'Có';
    }
    
    updateStats();
    applyFilters();
    
    // Refresh modal UI
    modalDocStatus.innerText = 'Có';
    await refreshLocalFileStatus();
    
    alert(`Đã tải lên tệp "${file.name}" thành công và lưu vào thư mục con ảo của chương trình!`);
  } catch (err) {
    console.error(err);
    alert("Tải lên tệp thất bại, vui lòng thử lại.");
  } finally {
    uploadBox.innerHTML = originalText;
  }
}

async function downloadLocalFile() {
  if (!selectedProgram) return;
  
  try {
    const fileRecord = await getFileLocal(selectedProgram.id);
    if (!fileRecord) {
      alert("Không tìm thấy tệp cục bộ.");
      return;
    }
    
    // Create a temporary link and trigger browser download
    const url = URL.createObjectURL(fileRecord.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileRecord.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("Không thể tải xuống tệp.");
  }
}

async function deleteLocalFile() {
  if (!selectedProgram || !confirm("Bạn có chắc chắn muốn xóa tài liệu cục bộ của chương trình này?")) return;
  
  try {
    await deleteFileLocal(selectedProgram.id);
    
    // Hide viewer container
    if (localFileViewerContainer) {
      localFileViewerContainer.style.display = 'none';
      localFileViewerContent.innerHTML = '';
    }
    if (currentViewObjectUrl) {
      URL.revokeObjectURL(currentViewObjectUrl);
      currentViewObjectUrl = null;
    }
    
    // Refresh modal UI
    await refreshLocalFileStatus();
    alert("Đã xóa tài liệu cục bộ thành công!");
  } catch (err) {
    console.error(err);
    alert("Xóa tệp thất bại.");
  }
}

async function viewLocalFile() {
  if (!selectedProgram) return;
  
  try {
    const fileRecord = await getFileLocal(selectedProgram.id);
    if (!fileRecord) {
      alert("Không tìm thấy tệp cục bộ.");
      return;
    }
    
    // Check if on mobile view to trigger the fullscreen viewer
    if (window.innerWidth <= 768) {
      openFullscreenViewer(fileRecord);
      return;
    }
    
    // Clear previous content
    localFileViewerContent.innerHTML = '';
    if (currentViewObjectUrl) {
      URL.revokeObjectURL(currentViewObjectUrl);
      currentViewObjectUrl = null;
    }
    
    const fileName = fileRecord.name.toLowerCase();
    
    if (fileName.endsWith('.pdf')) {
      currentViewObjectUrl = URL.createObjectURL(fileRecord.data);
      const embedUrl = currentViewObjectUrl + '#toolbar=0&navpanes=0&scrollbar=0';
      localFileViewerContent.innerHTML = `<iframe src="${embedUrl}" width="100%" height="100%" style="border: none;"></iframe>`;
    } else if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.gif') || fileName.endsWith('.webp')) {
      currentViewObjectUrl = URL.createObjectURL(fileRecord.data);
      localFileViewerContent.innerHTML = `<img src="${currentViewObjectUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />`;
    } else if (fileName.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        localFileViewerContent.innerHTML = `<pre style="width: 100%; height: 100%; padding: 1rem; overflow: auto; background: var(--bg-secondary); color: var(--text-primary); margin: 0; text-align: left; font-family: monospace; font-size: 0.9rem; white-space: pre-wrap; word-break: break-all;">${escapeHTML(e.target.result)}</pre>`;
      };
      reader.readAsText(fileRecord.data);
    } else {
      localFileViewerContent.innerHTML = `<div style="padding: 2rem; color: #ffffff; text-align: center;">Định dạng file "${fileRecord.name}" chưa hỗ trợ xem trực tuyến trực tiếp. Vui lòng sử dụng nút Tải về để xem.</div>`;
    }
    
    localFileViewerContainer.style.display = 'flex';
  } catch (err) {
    console.error(err);
    alert("Không thể hiển thị tệp.");
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ====================================================================
// CLIENT-SIDE EXCEL EXPORT (STANDALONE)
// ====================================================================
function exportExcel() {
  let csvContent = "\uFEFF"; // BOM for Vietnamese character compatibility
  
  // Headers
  const headers = ["TT / ID", "Chuyên ngành", "Tên chương trình", "Thời lượng", "Cấp độ", "Tình trạng tài liệu", "Nguồn ban hành", "Ghi chú"];
  csvContent += headers.join(",") + "\r\n";
  
  // Rows
  filteredPrograms.forEach(p => {
    const row = [
      p.id,
      `"${(p.section || '').replace(/"/g, '""')}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.duration || '').replace(/"/g, '""')}"`,
      `"${(p.level || '').replace(/"/g, '""')}"`,
      `"${(p.doc_status || '').replace(/"/g, '""')}"`,
      `"${(p.doc_source || '').replace(/"/g, '""')}"`,
      `"${(p.note || '').replace(/"/g, '""')}"`
    ];
    csvContent += row.join(",") + "\r\n";
  });
  
  // Trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Danh_muc_Dao_tao_Export.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ====================================================================
// FULLSCREEN MOBILE-FRIENDLY DOCUMENT VIEWER
// ====================================================================
async function openFullscreenViewer(fileRecord) {
  if (!fileRecord) return;
  
  // Display the fullscreen container
  fullscreenViewer.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // Lock background scroll
  
  fullscreenViewerTitle.innerText = fileRecord.name;
  fullscreenViewerContent.innerHTML = '<div style="color: var(--text-secondary); text-align: center;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem; color: var(--primary);"></i><br>Đang tải tài liệu...</div>';
  
  if (currentViewObjectUrl) {
    URL.revokeObjectURL(currentViewObjectUrl);
  }
  
  currentViewObjectUrl = URL.createObjectURL(fileRecord.data);
  const fileName = fileRecord.name.toLowerCase();
  
  if (fileName.endsWith('.pdf')) {
    pdfControlsBar.style.display = 'flex';
    try {
      const arrayBuffer = await fileRecord.data.arrayBuffer();
      // Reset PDF.js state
      currentPdfPageNum = 1;
      currentPdfScale = 1.0; 
      isRenderingPage = false;
      pageRenderingPending = null;
      
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      currentPdfDoc = await loadingTask.promise;
      pdfTotalPages.innerText = currentPdfDoc.numPages;
      
      renderPdfPage(currentPdfPageNum);
    } catch (err) {
      console.error("PDF.js loading error, falling back to iframe:", err);
      fullscreenViewerContent.innerHTML = `<iframe src="${currentViewObjectUrl}" width="100%" height="100%" style="border: none;"></iframe>`;
      pdfControlsBar.style.display = 'none';
    }
  } else if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.gif') || fileName.endsWith('.webp')) {
    pdfControlsBar.style.display = 'none';
    currentPdfDoc = null;
    fullscreenViewerContent.innerHTML = `<img src="${currentViewObjectUrl}" alt="${fileRecord.name}" />`;
  } else if (fileName.endsWith('.txt')) {
    pdfControlsBar.style.display = 'none';
    currentPdfDoc = null;
    const reader = new FileReader();
    reader.onload = function(e) {
      fullscreenViewerContent.innerHTML = `<pre>${escapeHTML(e.target.result)}</pre>`;
    };
    reader.readAsText(fileRecord.data);
  } else {
    // Other file types fallback
    pdfControlsBar.style.display = 'none';
    currentPdfDoc = null;
    fullscreenViewerContent.innerHTML = `
      <div style="padding: 2rem; text-align: center; max-width: 450px;">
        <i class="fa-solid fa-file-circle-question" style="font-size: 3rem; color: var(--text-light); margin-bottom: 1rem;"></i>
        <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.5rem;">Không thể xem trực tiếp tệp này</div>
        <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem;">Định dạng file "${fileRecord.name}" chưa được hỗ trợ xem trực tiếp trên điện thoại.</div>
        <div style="display: flex; gap: 0.5rem; justify-content: center;">
          <button onclick="downloadFullscreenFile()" class="btn btn-primary"><i class="fa-solid fa-download"></i> Tải về</button>
          <button onclick="openFullscreenFileInNewTab()" class="btn btn-secondary"><i class="fa-solid fa-up-right-from-square"></i> Mở tab mới</button>
        </div>
      </div>
    `;
  }
}

function closeFullscreenViewer() {
  fullscreenViewer.style.display = 'none';
  fullscreenViewerContent.innerHTML = '';
  pdfControlsBar.style.display = 'none';
  
  if (currentViewObjectUrl) {
    URL.revokeObjectURL(currentViewObjectUrl);
    currentViewObjectUrl = null;
  }
  currentPdfDoc = null;
  
  // If detailModal is still open, keep the body scroll locked
  if (detailModal && detailModal.style.display === 'flex') {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

function renderPdfPage(num) {
  if (!currentPdfDoc) return;
  isRenderingPage = true;
  
  // Disable buttons while rendering
  pdfPrevPageBtn.disabled = num <= 1;
  pdfNextPageBtn.disabled = num >= currentPdfDoc.numPages;
  pdfCurrentPageNum.innerText = num;
  
  currentPdfDoc.getPage(num).then(page => {
    // Clear previous contents
    fullscreenViewerContent.innerHTML = '';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    fullscreenViewerContent.appendChild(canvas);
    
    // Get viewport at default zoom
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Calculate scale if scale is default to fit mobile container width nicely
    let scale = currentPdfScale;
    if (scale === 1.0) {
      const containerWidth = fullscreenViewerContent.clientWidth - 24; // Padding
      scale = containerWidth / viewport.width;
      // Cap initial auto-scale to reasonable boundaries
      if (scale > 1.5) scale = 1.5;
      if (scale < 0.5) scale = 0.5;
      currentPdfScale = scale;
    }
    
    pdfZoomPercent.innerText = Math.round(currentPdfScale * 100) + '%';
    
    const responsiveViewport = page.getViewport({ scale: currentPdfScale });
    canvas.height = responsiveViewport.height;
    canvas.width = responsiveViewport.width;
    
    const renderContext = {
      canvasContext: ctx,
      viewport: responsiveViewport
    };
    
    const renderTask = page.render(renderContext);
    
    renderTask.promise.then(() => {
      isRenderingPage = false;
      if (pageRenderingPending !== null) {
        renderPdfPage(pageRenderingPending);
        pageRenderingPending = null;
      }
    });
  }).catch(err => {
    console.error("Error rendering page:", err);
    isRenderingPage = false;
  });
}

function queueRenderPage(num) {
  if (isRenderingPage) {
    pageRenderingPending = num;
  } else {
    renderPdfPage(num);
  }
}

function showPrevPdfPage() {
  if (currentPdfPageNum <= 1) return;
  currentPdfPageNum--;
  queueRenderPage(currentPdfPageNum);
}

function showNextPdfPage() {
  if (!currentPdfDoc || currentPdfPageNum >= currentPdfDoc.numPages) return;
  currentPdfPageNum++;
  queueRenderPage(currentPdfPageNum);
}

function zoomOutPdf() {
  if (currentPdfScale <= 0.3) return;
  currentPdfScale -= 0.15;
  queueRenderPage(currentPdfPageNum);
}

function zoomInPdf() {
  if (currentPdfScale >= 3.0) return;
  currentPdfScale += 0.15;
  queueRenderPage(currentPdfPageNum);
}

function openFullscreenFileInNewTab() {
  if (currentViewObjectUrl) {
    window.open(currentViewObjectUrl, '_blank');
  }
}

function downloadFullscreenFile() {
  if (!currentViewObjectUrl) return;
  const a = document.createElement('a');
  a.href = currentViewObjectUrl;
  a.download = fullscreenViewerTitle.innerText;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ====================================================================
// DATABASE SYNCHRONIZATION (BACKUP & RESTORE)
// ====================================================================
async function getAllFilesLocal() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (e) => reject(reader.target.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64, type) {
  const binStr = atob(base64);
  const len = binStr.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = binStr.charCodeAt(i);
  }
  return new Blob([arr], { type: type });
}

async function refreshSyncInfo() {
  try {
    const files = await getAllFilesLocal();
    let totalSize = 0;
    files.forEach(f => {
      if (f.data) totalSize += f.data.size;
    });
    syncExportCount.innerText = `${files.length} tệp`;
    
    let sizeText = '0 KB';
    if (totalSize >= 1024 * 1024) {
      sizeText = (totalSize / (1024 * 1024)).toFixed(2) + ' MB';
    } else {
      sizeText = (totalSize / 1024).toFixed(1) + ' KB';
    }
    syncExportSize.innerText = sizeText;
  } catch (err) {
    console.error("Lỗi khi tải thông tin đồng bộ:", err);
  }
}

async function openSyncModal() {
  syncModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  syncImportStatus.style.display = 'none';
  syncFileInput.value = '';
  if (syncExportJsonText) syncExportJsonText.value = '';
  if (syncImportJsonText) syncImportJsonText.value = '';
  await refreshSyncInfo();
}

function closeSyncModal() {
  syncModal.style.display = 'none';
  // If detailModal is open, keep body scroll locked, else unlock
  if (detailModal && detailModal.style.display === 'flex') {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

async function exportDatabase() {
  const originalText = exportBackupBtn.innerHTML;
  exportBackupBtn.disabled = true;
  exportBackupBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang chuẩn bị tệp sao lưu...';
  
  try {
    const files = await getAllFilesLocal();
    if (files.length === 0) {
      alert("Không có tài liệu nào để sao lưu trên thiết bị này.");
      exportBackupBtn.disabled = false;
      exportBackupBtn.innerHTML = originalText;
      return;
    }
    
    const backupData = [];
    for (const f of files) {
      const base64Data = await blobToBase64(f.data);
      backupData.push({
        programId: f.programId,
        name: f.name,
        type: f.type,
        base64: base64Data
      });
    }
    
    const jsonString = JSON.stringify(backupData);
    if (syncExportJsonText) {
      syncExportJsonText.value = jsonString;
    }
    
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = `bachmai_database_backup_${dateStr}.bachmai`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Lỗi xuất database:", err);
    alert("Có lỗi xảy ra trong quá trình xuất sao lưu.");
  } finally {
    exportBackupBtn.disabled = false;
    exportBackupBtn.innerHTML = originalText;
  }
}

async function handleImportBackup(e) {
  if (!e.target.files.length) return;
  const file = e.target.files[0];
  
  syncImportStatus.style.display = 'block';
  syncImportStatus.className = 'sync-working-status';
  syncImportStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang nhập và đồng bộ dữ liệu...';
  
  const reader = new FileReader();
  reader.onload = async function(evt) {
    try {
      const backupData = JSON.parse(evt.target.result);
      if (!Array.isArray(backupData)) {
        throw new Error("Định dạng tệp sao lưu không hợp lệ.");
      }
      
      let importedCount = 0;
      for (const item of backupData) {
        if (!item.programId || !item.name || !item.type || !item.base64) {
          continue; // skip malformed records
        }
        
        const blob = base64ToBlob(item.base64, item.type);
        // Add file metadata properties
        blob.name = item.name;
        blob.type = item.type;
        
        // Save to IndexedDB
        await saveFileLocal(item.programId, blob);
        
        // Update in-memory trainingPrograms state
        const idx = trainingPrograms.findIndex(p => p.id === parseInt(item.programId));
        if (idx !== -1) {
          trainingPrograms[idx].doc_status = 'Có';
        }
        importedCount++;
      }
      
      // Update UI
      updateStats();
      applyFilters();
      await refreshSyncInfo();
      
      syncImportStatus.className = 'sync-success-status';
      syncImportStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> Đồng bộ thành công! Đã nhập ${importedCount} tài liệu vào trình duyệt này.`;
      
      // If we are currently looking at a program details modal, refresh it
      if (selectedProgram) {
        await refreshLocalFileStatus();
      }
    } catch (err) {
      console.error("Lỗi nhập dữ liệu:", err);
      syncImportStatus.className = 'sync-error-status';
      syncImportStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Nhập dữ liệu thất bại. Vui lòng đảm bảo tệp tin đúng định dạng `.bachmai`.';
    }
  };
  reader.readAsText(file);
}

async function handleImportJsonText() {
  if (!syncImportJsonText) return;
  const jsonText = syncImportJsonText.value.trim();
  if (!jsonText) {
    alert("Vui lòng dán chuỗi JSON sao lưu.");
    return;
  }
  
  syncImportStatus.style.display = 'block';
  syncImportStatus.className = 'sync-working-status';
  syncImportStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang nhập và đồng bộ dữ liệu...';
  
  try {
    const backupData = JSON.parse(jsonText);
    if (!Array.isArray(backupData)) {
      throw new Error("Định dạng dữ liệu sao lưu không hợp lệ.");
    }
    
    let importedCount = 0;
    for (const item of backupData) {
      if (!item.programId || !item.name || !item.type || !item.base64) {
        continue;
      }
      const blob = base64ToBlob(item.base64, item.type);
      blob.name = item.name;
      blob.type = item.type;
      
      await saveFileLocal(item.programId, blob);
      
      const idx = trainingPrograms.findIndex(p => p.id === parseInt(item.programId));
      if (idx !== -1) {
        trainingPrograms[idx].doc_status = 'Có';
      }
      importedCount++;
    }
    
    updateStats();
    applyFilters();
    await refreshSyncInfo();
    
    syncImportStatus.className = 'sync-success-status';
    syncImportStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> Đồng bộ thành công! Đã nhập ${importedCount} tài liệu vào trình duyệt này.`;
    
    if (selectedProgram) {
      await refreshLocalFileStatus();
    }
  } catch (err) {
    console.error("Lỗi nhập dữ liệu JSON:", err);
    syncImportStatus.className = 'sync-error-status';
    syncImportStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Nhập dữ liệu thất bại. Vui lòng đảm bảo chuỗi JSON đúng định dạng.';
  }
}
