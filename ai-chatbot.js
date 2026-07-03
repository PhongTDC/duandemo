// ====================================================================
// AI CHATBOT WIDGET CONTROLLER - BENH VIEN BACH MAI
// ====================================================================

(function () {
  // DOM Elements
  const triggerBtn = document.getElementById('aiChatTrigger');
  const chatWindow = document.getElementById('aiChatWindow');
  const closeBtn = document.getElementById('aiChatCloseBtn');
  const settingsBtn = document.getElementById('aiChatSettingsBtn');
  const settingsPanel = document.getElementById('aiChatSettings');
  const modeOfflineBtn = document.getElementById('aiModeOffline');
  const modeOnlineBtn = document.getElementById('aiModeOnline');
  const apiKeyGroup = document.getElementById('aiApiKeyGroup');
  const apiKeyInput = document.getElementById('aiApiKeyInput');
  const saveKeyBtn = document.getElementById('aiSaveKeyBtn');
  const chatMessages = document.getElementById('aiChatMessages');
  const chatInput = document.getElementById('aiChatInput');
  const sendBtn = document.getElementById('aiChatSendBtn');
  const modeStatusText = document.getElementById('aiChatModeStatus');

  // App States
  let isChatOpen = false;
  let chatMode = 'offline'; // 'offline' or 'online'
  let apiKey = localStorage.getItem('ai_gemini_api_key') || '';

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    // Load pre-saved API Key
    if (apiKey) {
      apiKeyInput.value = apiKey;
      chatMode = 'online';
      modeOnlineBtn.classList.add('active');
      modeOfflineBtn.classList.remove('active');
      apiKeyGroup.style.display = 'flex';
      modeStatusText.innerText = 'Chế độ Gemini API (Online)';
      appendGreetingMessage(true);
    } else {
      chatMode = 'offline';
      modeOfflineBtn.classList.add('active');
      modeOnlineBtn.classList.remove('active');
      apiKeyGroup.style.display = 'none';
      modeStatusText.innerText = 'Chế độ Offline (Cục bộ)';
    }

    // Toggle Chat Window
    triggerBtn.addEventListener('click', toggleChatWindow);
    closeBtn.addEventListener('click', () => toggleChatWindow(false));

    // Toggle Settings Panel
    settingsBtn.addEventListener('click', () => {
      const isVisible = settingsPanel.style.display === 'block';
      settingsPanel.style.display = isVisible ? 'none' : 'block';
    });

    // Toggle Modes
    modeOfflineBtn.addEventListener('click', () => {
      chatMode = 'offline';
      modeOfflineBtn.classList.add('active');
      modeOnlineBtn.classList.remove('active');
      apiKeyGroup.style.display = 'none';
      modeStatusText.innerText = 'Chế độ Offline (Cục bộ)';
      appendBotMessage("Đã chuyển sang **chế độ Offline**. Tôi sẽ hỗ trợ bạn tìm kiếm cục bộ không cần mạng Internet.");
    });

    modeOnlineBtn.addEventListener('click', () => {
      chatMode = 'online';
      modeOnlineBtn.classList.add('active');
      modeOfflineBtn.classList.remove('active');
      apiKeyGroup.style.display = 'flex';
      modeStatusText.innerText = 'Chế độ Gemini API (Online)';
      if (!apiKey) {
        appendBotMessage("Vui lòng **nhập Google Gemini API Key** của bạn bên dưới và bấm **Lưu** để bắt đầu sử dụng chế độ trực tuyến.");
      } else {
        appendBotMessage("Đã chuyển sang **chế độ Gemini API Online**. Tôi đã sẵn sàng xử lý các câu hỏi phức tạp hơn!");
      }
    });

    // Save API Key
    saveKeyBtn.addEventListener('click', () => {
      const key = apiKeyInput.value.trim();
      if (key) {
        localStorage.setItem('ai_gemini_api_key', key);
        apiKey = key;
        appendBotMessage("Đã lưu API Key thành công! Đang kích hoạt kết nối trực tuyến...");
        settingsPanel.style.display = 'none';
      } else {
        localStorage.removeItem('ai_gemini_api_key');
        apiKey = '';
        appendBotMessage("Đã xóa API Key. Hệ thống quay về chế độ Offline.");
        chatMode = 'offline';
        modeOfflineBtn.click();
      }
    });

    // Input interactions
    chatInput.addEventListener('input', () => {
      sendBtn.disabled = !chatInput.value.trim();
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !sendBtn.disabled) {
        handleSendMessage();
      }
    });

    sendBtn.addEventListener('click', handleSendMessage);

    // Suggestion chips click
    document.querySelectorAll('.ai-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const queryText = chip.getAttribute('data-query');
        if (queryText) {
          chatInput.value = queryText;
          sendBtn.disabled = false;
          handleSendMessage();
        }
      });
    });

    // Remove pulse badge when chat opened first time
    triggerBtn.addEventListener('click', () => {
      const badge = triggerBtn.querySelector('.pulse-badge');
      if (badge) badge.remove();
    }, { once: true });
  });

  // Global window function to open program details
  window.triggerOpenProgram = function (id) {
    if (typeof trainingPrograms === 'undefined') return;
    const prog = trainingPrograms.find(p => p.id === parseInt(id));
    if (prog && typeof openModal === 'function') {
      openModal(prog);
    } else {
      alert(`Không tìm thấy thông tin chi tiết chương trình ID: ${id}`);
    }
  };

  // Toggle Window Visibility
  function toggleChatWindow(forceState) {
    isChatOpen = typeof forceState === 'boolean' ? forceState : !isChatOpen;
    if (isChatOpen) {
      chatWindow.classList.add('active');
      chatInput.focus();
    } else {
      chatWindow.classList.remove('active');
      settingsPanel.style.display = 'none';
    }
  }

  // Handle Send Message
  async function handleSendMessage() {
    const userText = chatInput.value.trim();
    if (!userText) return;

    // Append user message
    appendUserMessage(userText);
    chatInput.value = '';
    sendBtn.disabled = true;

    // Show typing indicator
    const typingIndicator = showTypingIndicator();

    // Small delay for natural feel
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      if (chatMode === 'offline') {
        const reply = processOfflineSearch(userText);
        hideTypingIndicator(typingIndicator);
        appendBotMessage(reply);
      } else {
        // Online Gemini
        if (!apiKey) {
          hideTypingIndicator(typingIndicator);
          appendBotMessage("Cảnh báo: Bạn chưa cấu hình Google Gemini API Key. Vui lòng bấm vào biểu tượng cài đặt ⚙️ ở góc trên để nhập Key.");
          return;
        }
        const reply = await queryGeminiAPI(userText);
        hideTypingIndicator(typingIndicator);
        appendBotMessage(reply);
      }
    } catch (err) {
      console.error(err);
      hideTypingIndicator(typingIndicator);
      appendBotMessage("❌ Đã xảy ra lỗi trong quá trình xử lý phản hồi. Vui lòng kiểm tra kết nối mạng hoặc API Key của bạn.");
    }
  }

  // Render Bot Message
  function appendBotMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'ai-message bot';
    
    // Parse formatting (Simple markdown parser)
    const formattedText = parseMessageFormatting(text);

    msgDiv.innerHTML = `
      <div class="ai-msg-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="ai-msg-bubble">${formattedText}</div>
    `;
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
  }

  // Render User Message
  function appendUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'ai-message user';
    msgDiv.innerHTML = `
      <div class="ai-msg-avatar"><i class="fa-solid fa-user"></i></div>
      <div class="ai-msg-bubble"><p>${escapeHtml(text)}</p></div>
    `;
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
  }

  function appendGreetingMessage(isOnline) {
    // Clear initial greeting to avoid duplication, or append new instruction
    if (isOnline) {
      appendBotMessage("Hệ thống đã nhận diện API Key trực tuyến. Bạn có thể hỏi tôi bất kỳ câu hỏi tự do nào về chương trình đào tạo của bệnh viện!");
    }
  }

  // Scroll to Chat Bottom
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Typing Indicator Controls
  function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'ai-message bot typing-indicator';
    indicator.innerHTML = `
      <div class="ai-msg-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="ai-msg-bubble">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    chatMessages.appendChild(indicator);
    scrollToBottom();
    return indicator;
  }

  function hideTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  // Simple Markdown & custom tag parse (bold, links, lists)
  function parseMessageFormatting(text) {
    let html = escapeHtml(text);

    // Parse strong text: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

    // Parse list items starting with - or * at start of lines
    const lines = html.split('\n');
    let inList = false;
    let newLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!inList) {
          newLines.push('<ul>');
          inList = true;
        }
        newLines.push(`<li>${line.substring(2)}</li>`);
      } else {
        if (inList) {
          newLines.push('</ul>');
          inList = false;
        }
        newLines.push(line ? `<p>${line}</p>` : '');
      }
    }
    if (inList) {
      newLines.push('</ul>');
    }
    html = newLines.join('\n');

    // Parse custom PROGRAM_LINK tag: [PROGRAM_LINK: id]
    html = html.replace(/\[PROGRAM_LINK:\s*(\d+)\]/g, (match, idStr) => {
      const id = parseInt(idStr);
      if (typeof trainingPrograms !== 'undefined') {
        const prog = trainingPrograms.find(p => p.id === id);
        if (prog) {
          const statusClass = prog.doc_status === 'Có' ? 'chat-status-co' : 'chat-status-thieu';
          return `<span class="chat-prog-link" onclick="triggerOpenProgram(${id})"><i class="fa-solid fa-file-medical"></i> ID ${id}: ${prog.name} <span class="chat-prog-status ${statusClass}">${prog.doc_status}</span></span>`;
        }
      }
      return `<span class="chat-prog-link" onclick="triggerOpenProgram(${id})"><i class="fa-solid fa-file-medical"></i> Xem CT ID ${id}</span>`;
    });

    return html;
  }

  // Helper helper to escape HTML
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  // Clean Vietnamese string for search matching
  function cleanVietnamese(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  }

  // ====================================================================
  // OFFLINE QUERY ENGINE (LOCAL JAVASCRIPT SEARCH)
  // ====================================================================
  function processOfflineSearch(query) {
    if (typeof trainingPrograms === 'undefined' || !trainingPrograms.length) {
      return "Dữ liệu chương trình chưa được tải thành công. Vui lòng tải lại trang.";
    }

    const cleanQuery = cleanVietnamese(query);

    // Intent 1: Greeting
    const greetings = ['xin chao', 'hello', 'hi', 'chao', 'ban la ai', 'tro ly ai'];
    if (greetings.some(g => cleanQuery.startsWith(g) || cleanQuery === g)) {
      return "Xin chào! Tôi là **Trợ lý AI Tìm kiếm tài liệu**. Tôi có thể giúp bạn tìm kiếm thông tin đào tạo theo tên chương trình, tìm các chương trình bị thiếu tài liệu, hoặc phân loại theo chuyên ngành. Bạn muốn tìm gì hôm nay?";
    }

    // Intent 2: Missing documents
    if (cleanQuery.includes('thieu') || cleanQuery.includes('chua co') || cleanQuery.includes('bo sung')) {
      const missing = trainingPrograms.filter(p => p.doc_status === 'Thiếu');
      if (!missing.length) {
        return "Tuyệt vời! Hiện tại **không có** chương trình nào bị thiếu tài liệu. Tất cả đều đầy đủ.";
      }
      
      let reply = `Hiện có **${missing.length} chương trình** đang bị thiếu tài liệu chính thức. Dưới đây là danh sách tiêu biểu (Click để xem chi tiết):\n`;
      missing.slice(0, 10).forEach(p => {
        reply += `- [PROGRAM_LINK: ${p.id}]\n`;
      });
      if (missing.length > 10) {
        reply += `\n... và **${missing.length - 10} chương trình khác**. Bạn có thể dùng ô tìm kiếm chính với bộ lọc trạng thái "Thiếu" để xem toàn bộ.`;
      }
      return reply;
    }

    // Intent 3: Available documents
    if (cleanQuery.includes('day du') || cleanQuery.includes('da co') || cleanQuery.includes('hoan thanh')) {
      const available = trainingPrograms.filter(p => p.doc_status === 'Có');
      let reply = `Hệ thống ghi nhận có **${available.length} chương trình** đã đầy đủ tài liệu chính thức (trên tổng số ${trainingPrograms.length} chương trình). Dưới đây là một số chương trình:\n`;
      available.slice(0, 8).forEach(p => {
        reply += `- [PROGRAM_LINK: ${p.id}]\n`;
      });
      return reply;
    }

    // Intent 4: Levels (Cơ bản / Nâng cao / Chuyên sâu)
    let levelMatch = '';
    if (cleanQuery.includes('co ban')) levelMatch = 'Cơ bản';
    else if (cleanQuery.includes('nang cao')) levelMatch = 'Nâng cao';
    else if (cleanQuery.includes('chuyen sau')) levelMatch = 'Chuyên sâu';

    if (levelMatch) {
      const matches = trainingPrograms.filter(p => p.level && p.level.includes(levelMatch));
      let reply = `Có **${matches.length} chương trình** thuộc cấp độ **${levelMatch}**:\n`;
      matches.slice(0, 10).forEach(p => {
        reply += `- [PROGRAM_LINK: ${p.id}] (${p.duration || 'Chưa rõ thời lượng'})\n`;
      });
      if (matches.length > 10) {
        reply += `\n... và **${matches.length - 10} chương trình khác**.`;
      }
      return reply;
    }

    // Intent 5: Duration check (ví dụ: "9 tháng", "3 tháng")
    const durationRegex = /(\d+)\s*thang/g;
    const matchDuration = durationRegex.exec(cleanQuery);
    if (matchDuration) {
      const months = matchDuration[1];
      const matches = trainingPrograms.filter(p => p.duration && p.duration.includes(`${months} tháng`));
      if (matches.length) {
        let reply = `Tôi tìm thấy **${matches.length} chương trình** có thời lượng đào tạo **${months} tháng**:\n`;
        matches.slice(0, 10).forEach(p => {
          reply += `- [PROGRAM_LINK: ${p.id}]\n`;
        });
        return reply;
      }
    }

    // Intent 6: How to download
    const instructWords = ['lam sao', 'huong dan', 'cach tai', 'tai file', 'xem tai lieu', 'open file', 'mo file'];
    if (instructWords.some(w => cleanQuery.includes(w))) {
      return "Để xem hoặc tải tài liệu chi tiết của một chương trình:\n" +
        "1. Tìm chương trình trong danh sách.\n" +
        "2. Click chuột vào thẻ chương trình (hoặc dòng trong bảng) để **mở cửa sổ chi tiết**.\n" +
        "3. Trong cửa sổ hiện ra, bạn sẽ thấy link tải **Drive tài liệu** hoặc mục **Tải tài liệu cục bộ** ở bên dưới.";
    }

    // General Keyword Search
    const searchTerms = cleanQuery.split(/\s+/).filter(t => t.length > 1);
    if (!searchTerms.length) {
      return "Bạn muốn tìm chương trình gì? Vui lòng nhập từ khóa tìm kiếm (ví dụ: 'Nhi khoa', 'Sản', 'Hồi sức cấp cứu', 'ID: 5').";
    }

    // Score programs based on search terms
    const scored = trainingPrograms.map(p => {
      let score = 0;
      const cleanName = cleanVietnamese(p.name);
      const cleanSection = cleanVietnamese(p.section);
      const cleanAudience = cleanVietnamese(p.audience || '');
      const cleanNote = cleanVietnamese(p.note || '');
      const cleanId = p.id.toString();

      searchTerms.forEach(term => {
        if (cleanName.includes(term)) score += 10;
        if (cleanId === term) score += 100; // Perfect ID match
        if (cleanSection.includes(term)) score += 3;
        if (cleanAudience.includes(term)) score += 2;
        if (cleanNote.includes(term)) score += 1;
      });

      return { program: p, score };
    }).filter(item => item.score > 0);

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    if (!scored.length) {
      return `Không tìm thấy chương trình nào phù hợp với từ khóa "${query}". Bạn có thể thử các từ khóa ngắn gọn hơn (như 'Hồi sức', 'Sản', 'Ung thư') hoặc chuyển sang chế độ Online (Gemini API) để được phân tích chuyên sâu hơn.`;
    }

    let reply = `Tìm thấy **${scored.length} chương trình** liên quan nhất đến từ khóa "${query}":\n`;
    scored.slice(0, 10).forEach(item => {
      const p = item.program;
      reply += `- [PROGRAM_LINK: ${p.id}] (Thời lượng: ${p.duration || 'Chưa rõ'}, Cấp độ: ${p.level})\n`;
    });

    if (scored.length > 10) {
      reply += `\n... và **${scored.length - 10} kết quả khác**. Bạn vui lòng dùng thanh tìm kiếm chính của website để lọc chi tiết hơn.`;
    }

    return reply;
  }

  // ====================================================================
  // ONLINE QUERY ENGINE (GOOGLE GEMINI API INTEGRATION)
  // ====================================================================
  async function queryGeminiAPI(userQuery) {
    // 1. Pre-filter relevant programs to avoid bloating context size
    const cleanQuery = cleanVietnamese(userQuery);
    const searchTerms = cleanQuery.split(/\s+/).filter(t => t.length > 1);
    
    let relatedPrograms = [];
    if (searchTerms.length > 0) {
      // Find matching programs
      relatedPrograms = trainingPrograms.filter(p => {
        const cleanName = cleanVietnamese(p.name);
        const cleanSection = cleanVietnamese(p.section);
        const cleanId = p.id.toString();
        return searchTerms.some(term => cleanName.includes(term) || cleanSection.includes(term) || cleanId === term);
      });
    }

    // Fallback/Default programs if query is too broad or doesn't yield results
    if (relatedPrograms.length === 0 || relatedPrograms.length > 40) {
      // Take first 25 programs as a sample representation
      relatedPrograms = trainingPrograms.slice(0, 25);
    }

    // General stats to provide context
    const totalCount = trainingPrograms.length;
    const countCo = trainingPrograms.filter(p => p.doc_status === 'Có').length;
    const countThieu = trainingPrograms.filter(p => p.doc_status === 'Thiếu').length;
    const uniqueSections = [...new Set(trainingPrograms.map(p => p.section))].filter(Boolean);

    // Format a compact representation of programs for Gemini
    const compactPrograms = relatedPrograms.map(p => ({
      id: p.id,
      name: p.name,
      sect: p.section,
      dur: p.duration,
      lvl: p.level,
      status: p.doc_status,
      src: p.doc_source
    }));

    // System instruction prompt
    const systemPrompt = `Bạn là Trợ lý AI Tìm kiếm thông minh tại Cổng Tài Liệu Đào Tạo Y Khoa - Bệnh Viện Bạch Mai.
Nhiệm vụ của bạn là giúp người dùng tìm kiếm, phân tích và giải đáp thắc mắc về các chương trình đào tạo.

HƯỚNG DẪN QUAN TRỌNG:
1. Trả lời bằng tiếng Việt lịch sự, tự nhiên, chuyên nghiệp. Sử dụng Markdown để trình bày đẹp (chữ đậm, danh sách...).
2. Nếu nhắc đến một chương trình đào tạo nào trong câu trả lời, bạn BẮT BUỘC phải viết mã định dạng chính xác là [PROGRAM_LINK: <ID>] (ví dụ: [PROGRAM_LINK: 12] để liên kết tới chương trình ID 12). Client sẽ tự động biến mã này thành nút bấm xem chi tiết.
3. Sử dụng thông tin thống kê và dữ liệu mẫu dưới đây để trả lời câu hỏi. Nếu thông tin không có trong danh sách, hãy thông báo rõ là dữ liệu mẫu chưa có hoặc khuyên người dùng sử dụng thanh tìm kiếm chính.

THÔNG TIN THỐNG KÊ HỆ THỐNG:
- Tổng số chương trình đào tạo: ${totalCount}
- Số lượng chương trình đầy đủ tài liệu (Có): ${countCo}
- Số lượng chương trình còn thiếu tài liệu (Thiếu): ${countThieu}
- Tổng số chuyên ngành: ${uniqueSections.length}

DANH SÁCH CHƯƠNG TRÌNH KHỚP GẦN NHẤT (MẪU DỮ LIỆU):
${JSON.stringify(compactPrograms, null, 2)}`;

    // Prepare messages history for API
    // Gemini API format uses {role: "user"|"model", parts: [{text: ""}]}
    const apiHistory = [];
    
    // Add current question
    apiHistory.push({
      role: "user",
      parts: [{ text: userQuery }]
    });

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: apiHistory,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.3
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || "HTTP Error");
    }

    const resData = await response.json();
    const botText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!botText) {
      return "Tôi không nhận được phản hồi từ mô hình AI. Vui lòng thử lại.";
    }

    return botText;
  }
})();
