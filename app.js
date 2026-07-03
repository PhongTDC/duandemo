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
    
    // Refresh modal UI
    await refreshLocalFileStatus();
    alert("Đã xóa tài liệu cục bộ thành công!");
  } catch (err) {
    console.error(err);
    alert("Xóa tệp thất bại.");
  }
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
