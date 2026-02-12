(function () {
  const CONFIG = {
    // 🔴 CHANGE THIS TO YOUR VERCEL URL
    API_ENDPOINT: "https://universal-ai-widget.vercel.app/api/chat", 
    THEME_COLOR: "#00ffcc", // Cyber Neon
    BG_COLOR: "#0a0a0a",    // Deep Dark
  };

  let chatHistory = [];
  let recognition;
  let isListening = false;
  let synthesis = window.speechSynthesis;
  let voiceEnabled = localStorage.getItem("gemini_voice_enabled") !== "false"; 

  // --- 1. Load Dependencies ---
  if (!window.marked) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    document.head.appendChild(script);
  }

  // --- 2. Setup Speech ---
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
  }

  // --- 3. UI Construction ---
  const container = document.createElement("div");
  container.id = "cyber-ai-widget";
  document.body.appendChild(container);
  const shadow = container.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; font-family: 'Segoe UI', Roboto, Helvetica, sans-serif; }
    
    /* --- Markdown Styles --- */
    code { background: #1a1a1a; padding: 2px 6px; border-radius: 4px; color: #ff79c6; font-family: 'Fira Code', monospace; font-size: 0.9em; }
    pre { background: #111; padding: 15px; border-radius: 8px; overflow-x: auto; border: 1px solid #333; margin: 10px 0; }
    pre code { background: transparent; padding: 0; color: #f8f8f2; }
    strong { color: ${CONFIG.THEME_COLOR}; font-weight: 600; }
    p { margin: 8px 0; line-height: 1.6; color: #e0e0e0; }
    a { color: ${CONFIG.THEME_COLOR}; text-decoration: none; }

    /* --- Launcher Button --- */
    .launcher {
      position: fixed; bottom: 25px; right: 25px; 
      width: 55px; height: 55px;
      background: ${CONFIG.BG_COLOR}; 
      border: 1px solid ${CONFIG.THEME_COLOR};
      border-radius: 50%; cursor: pointer; z-index: 999990;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 20px rgba(0, 255, 204, 0.2); 
      font-size: 24px; transition: all 0.3s ease;
    }
    .launcher:hover { transform: scale(1.05); box-shadow: 0 0 30px rgba(0, 255, 204, 0.4); }
    .launcher.hidden { display: none; }

    /* --- Main Sidebar (The Drawer) --- */
    .sidebar {
      position: fixed; top: 0; right: -450px; /* Hidden by default */
      width: 450px; height: 100vh;
      background: rgba(10, 10, 10, 0.95);
      border-left: 1px solid #333;
      z-index: 999999;
      display: flex; flex-direction: column;
      transition: right 0.4s cubic-bezier(0.19, 1, 0.22, 1); /* Smooth slide */
      box-shadow: -10px 0 40px rgba(0,0,0,0.5);
      backdrop-filter: blur(12px); /* Glass effect */
    }
    .sidebar.open { right: 0; }
    
    /* Mobile Responsive */
    @media (max-width: 500px) { .sidebar { width: 100%; right: -100%; } }

    /* --- Header --- */
    .header { 
      padding: 20px; 
      border-bottom: 1px solid #222;
      display: flex; justify-content: space-between; align-items: center;
      background: rgba(255,255,255,0.02);
    }
    .brand { font-weight: 700; color: #fff; display: flex; align-items: center; gap: 10px; letter-spacing: 0.5px; }
    .brand span { color: ${CONFIG.THEME_COLOR}; }
    
    .header-controls { display: flex; gap: 15px; align-items: center; }
    .icon-btn { cursor: pointer; opacity: 0.6; transition: 0.2s; font-size: 18px; color: #fff; background: none; border: none; padding: 5px; }
    .icon-btn:hover { opacity: 1; color: ${CONFIG.THEME_COLOR}; }

    /* --- Chat Area --- */
    .messages { flex: 1; padding: 20px; overflow-y: auto; scroll-behavior: smooth; }
    .messages::-webkit-scrollbar { width: 6px; }
    .messages::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

    .msg { margin-bottom: 20px; animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    
    .msg.user { 
      background: #222; padding: 12px 16px; border-radius: 12px 12px 0 12px; 
      margin-left: auto; max-width: 85%; border: 1px solid #333; color: #fff;
    }
    .msg.bot { 
      padding-left: 10px; border-left: 2px solid ${CONFIG.THEME_COLOR}; 
      max-width: 95%; 
    }

    /* Speak Button */
    .speak-btn { cursor: pointer; opacity: 0.5; font-size: 14px; margin-left: 8px; vertical-align: middle; }
    .speak-btn:hover { opacity: 1; color: ${CONFIG.THEME_COLOR}; }

    /* --- Input Area --- */
    .input-wrapper { padding: 20px; border-top: 1px solid #222; background: rgba(0,0,0,0.2); }
    .input-box { 
      display: flex; align-items: center; gap: 10px; 
      background: #151515; border: 1px solid #333; border-radius: 8px; padding: 5px 10px;
      transition: border-color 0.2s;
    }
    .input-box:focus-within { border-color: ${CONFIG.THEME_COLOR}; }
    
    input { 
      flex: 1; background: transparent; border: none; color: #fff; padding: 12px 5px; 
      font-size: 14px; outline: none; 
    }
    
    #micBtn { font-size: 16px; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    #micBtn.listening { color: #ff4444; background: rgba(255, 68, 68, 0.1); }
    
    #sendBtn { color: ${CONFIG.THEME_COLOR}; font-size: 18px; padding: 8px; }
    
    /* --- Settings Overlay --- */
    .settings-overlay {
      position: absolute; inset: 0; background: rgba(5,5,5,0.95); z-index: 10;
      padding: 30px; display: none; flex-direction: column; backdrop-filter: blur(10px);
    }
    .settings-overlay.show { display: flex; }
    
    .settings-input { 
      width: 100%; background: #111; border: 1px solid #333; color: #fff; padding: 12px; 
      border-radius: 6px; margin: 15px 0; font-family: monospace; outline: none;
    }
    .settings-input:focus { border-color: ${CONFIG.THEME_COLOR}; }

    .toggle-row { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 15px; background: #111; border-radius: 8px; border: 1px solid #222; }
    
    .save-btn { 
      margin-top: auto; width: 100%; padding: 14px; background: ${CONFIG.THEME_COLOR}; 
      border: none; border-radius: 6px; font-weight: 600; cursor: pointer; color: #000;
    }
  `;
  shadow.appendChild(style);

  // --- 4. HTML Structure ---
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="launcher" id="launcherBtn">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${CONFIG.THEME_COLOR}" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </div>

    <div class="sidebar" id="sidebar">
      
      <div class="header">
        <div class="brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${CONFIG.THEME_COLOR}" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          AI <span>ASSISTANT</span>
        </div>
        <div class="header-controls">
          <button class="icon-btn" id="settingsToggle" title="Settings">⚙️</button>
          <button class="icon-btn" id="closeSidebar" title="Close">✕</button>
        </div>
      </div>

      <div class="settings-overlay" id="settingsPanel">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="color:#fff; margin:0; font-size:18px;">Configuration</h2>
          <button class="icon-btn" id="closeSettings" style="font-size:24px;">✕</button>
        </div>
        
        <p style="color:#888; font-size:13px; margin-top:30px;">GOOGLE GEMINI API KEY</p>
        <input type="password" id="apiKeyInput" class="settings-input" placeholder="Paste sk-..." />

        <div class="toggle-row">
          <span style="color:#ddd; font-size:14px;">Voice Response (Read Aloud)</span>
          <input type="checkbox" id="voiceToggle" style="accent-color:${CONFIG.THEME_COLOR}; transform:scale(1.2);">
        </div>

        <button class="save-btn" id="saveKeyBtn">Save Changes</button>
      </div>

      <div class="messages" id="messages">
        <div class="msg bot"><p>System Ready. I can read this page. How can I help?</p></div>
      </div>

      <div class="input-wrapper">
        <div class="input-box">
          <button class="icon-btn" id="micBtn" title="Speak">🎙️</button>
          <input type="text" id="userInput" placeholder="Ask a question about this page..." />
          <button class="icon-btn" id="sendBtn">➤</button>
        </div>
        <div style="text-align:center; margin-top:8px; font-size:11px; color:#444;">
          Made by Dhruv Sharma
        </div>
      </div>
    </div>
  `;
  shadow.appendChild(wrapper);

  // --- 5. Logic ---
  const sidebar = shadow.querySelector("#sidebar");
  const launcherBtn = shadow.querySelector("#launcherBtn");
  const closeSidebarBtn = shadow.querySelector("#closeSidebar");
  
  const messagesDiv = shadow.querySelector("#messages");
  const userInput = shadow.querySelector("#userInput");
  const micBtn = shadow.querySelector("#micBtn");
  
  const settingsPanel = shadow.querySelector("#settingsPanel");
  const settingsToggle = shadow.querySelector("#settingsToggle");
  const closeSettings = shadow.querySelector("#closeSettings");
  const apiKeyInput = shadow.querySelector("#apiKeyInput");
  const voiceToggle = shadow.querySelector("#voiceToggle");

  let userApiKey = localStorage.getItem("gemini_user_key") || "";
  voiceToggle.checked = voiceEnabled;

  // --- UI Toggles ---
  function openSidebar() {
    sidebar.classList.add("open");
    launcherBtn.classList.add("hidden"); // Hide launcher when open
    setTimeout(() => userInput.focus(), 100);
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    launcherBtn.classList.remove("hidden"); // Show launcher when closed
  }

  launcherBtn.addEventListener("click", openSidebar);
  closeSidebarBtn.addEventListener("click", closeSidebar);

  // Settings Logic
  settingsToggle.addEventListener("click", () => {
    settingsPanel.classList.add("show");
    apiKeyInput.value = userApiKey;
  });
  closeSettings.addEventListener("click", () => settingsPanel.classList.remove("show"));
  
  shadow.querySelector("#saveKeyBtn").addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if(key) { localStorage.setItem("gemini_user_key", key); userApiKey = key; }
    
    voiceEnabled = voiceToggle.checked;
    localStorage.setItem("gemini_voice_enabled", voiceEnabled);
    
    settingsPanel.classList.remove("show");
    addMessage("Configuration saved successfully.", "bot");
  });

  // --- Chat Logic ---
  const speakText = (text) => {
    if (!synthesis) return;
    synthesis.cancel();
    const cleanText = text.replace(/[*#`_\[\]]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.1; 
    synthesis.speak(utterance);
  };

  async function typeWriter(element, text, shouldSpeak) {
    const html = window.marked ? window.marked.parse(text) : text;
    element.innerHTML = html;
    
    const speakBtn = document.createElement("span");
    speakBtn.className = "speak-btn";
    speakBtn.innerHTML = "🔊";
    speakBtn.onclick = () => speakText(text);
    element.appendChild(speakBtn);

    if (shouldSpeak && voiceEnabled) speakText(text);
  }

  const addMessage = (text, sender, isLoading = false) => {
    const div = document.createElement("div");
    div.className = `msg ${sender}`;
    messagesDiv.appendChild(div);
    if (isLoading) {
      div.innerText = "Processing context...";
      div.style.color = "#666";
      div.style.fontStyle = "italic";
      return div;
    }
    if (sender === "bot") { typeWriter(div, text, true); } 
    else { div.innerText = text; }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  const getPageContext = () => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script, style, noscript, svg').forEach(el => el.remove());
    return clone.innerText.replace(/\s+/g, " ").trim().substring(0, 10000);
  };

  const handleSend = async () => {
    const question = userInput.value.trim();
    if (!question) return;
    if (!userApiKey) { settingsPanel.classList.add("show"); return; }

    addMessage(question, "user");
    userInput.value = "";
    
    const loadingMsg = addMessage("", "bot", true);

    try {
      const formattedHistory = chatHistory.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));

      const res = await fetch(CONFIG.API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gemini-api-key": userApiKey },
        body: JSON.stringify({ question, context: getPageContext(), history: formattedHistory }),
      });
      
      const data = await res.json();
      messagesDiv.removeChild(loadingMsg);
      
      chatHistory.push({ role: "user", content: question });
      chatHistory.push({ role: "bot", content: data.answer });
      
      addMessage(data.answer, "bot");

    } catch (err) {
      messagesDiv.removeChild(loadingMsg);
      addMessage("Error: Could not reach AI server.", "bot");
    }
  };

  // Mic
  if (recognition) {
    micBtn.addEventListener("click", () => {
      if (isListening) recognition.stop(); else recognition.start();
    });
    recognition.onstart = () => { isListening = true; micBtn.classList.add("listening"); userInput.placeholder = "Listening..."; };
    recognition.onend = () => { isListening = false; micBtn.classList.remove("listening"); userInput.placeholder = "Ask a question..."; if(userInput.value) handleSend(); };
    recognition.onresult = (e) => { userInput.value = e.results[0][0].transcript; };
  } else {
    micBtn.style.display = "none";
  }

  shadow.querySelector("#sendBtn").addEventListener("click", handleSend);
  userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSend(); });

})();
