(function () {
  // --- CONFIGURATION ---
  const CONFIG = {
    // MAKE SURE THIS POINTS TO YOUR REAL VERCEL URL WHEN DEPLOYED
    API_ENDPOINT: "https://universal-ai-widget.vercel.app/api/chat", 
    THEME_COLOR: "#00ffcc",
    BG_COLOR: "#050505",
  };

  let chatHistory = []; // Local memory

  // --- 1. Load Dependencies ---
  // Load marked.js for Markdown support (bold, code blocks, etc.)
  if (!window.marked) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    document.head.appendChild(script);
  }

  // --- 2. Create UI Structure ---
  const container = document.createElement("div");
  container.id = "cyber-ai-widget";
  document.body.appendChild(container);
  const shadow = container.attachShadow({ mode: "open" });

  // --- 3. Define Styles (CSS) ---
  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; font-family: 'Segoe UI', Roboto, sans-serif; }
    
    /* --- Markdown & Content Styles --- */
    code { background: #222; padding: 2px 5px; border-radius: 4px; color: #ff79c6; font-family: monospace; }
    pre { background: #1e1e1e; padding: 10px; border-radius: 8px; overflow-x: auto; border: 1px solid #333; margin: 10px 0; }
    pre code { background: transparent; padding: 0; color: #f8f8f2; }
    strong { color: ${CONFIG.THEME_COLOR}; }
    p { margin: 5px 0; line-height: 1.5; }
    ul, ol { padding-left: 20px; margin: 5px 0; }

    /* --- Launcher Button --- */
    .launcher {
      position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px;
      background: ${CONFIG.BG_COLOR}; border: 2px solid ${CONFIG.THEME_COLOR};
      border-radius: 50%; cursor: pointer; z-index: 999999;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 15px ${CONFIG.THEME_COLOR}40; font-size: 24px; color: ${CONFIG.THEME_COLOR};
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }
    .launcher:hover { transform: scale(1.1); box-shadow: 0 0 25px ${CONFIG.THEME_COLOR}80; }

    /* --- Main Chat Window --- */
    .chat-window {
      position: fixed; bottom: 90px; right: 20px; width: 380px; height: 600px; max-height: calc(100vh - 120px);
      background: #090909; border: 1px solid #333;
      border-radius: 12px; z-index: 999999; display: flex; flex-direction: column;
      opacity: 0; pointer-events: none; transform: translateY(20px); 
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      box-shadow: 0 10px 30px rgba(0,0,0,0.5); overflow: hidden;
    }
    .chat-window.open { opacity: 1; pointer-events: all; transform: translateY(0); }

    /* Header */
    .header { 
      padding: 15px; background: #111; border-bottom: 1px solid #222;
      color: ${CONFIG.THEME_COLOR}; font-weight: bold; display: flex; justify-content: space-between; align-items: center;
    }
    .settings-btn { cursor: pointer; opacity: 0.6; font-size: 18px; transition: opacity 0.2s; } 
    .settings-btn:hover { opacity: 1; }

    /* Chat Area & Messages */
    .messages { flex: 1; padding: 20px; overflow-y: auto; color: #e0e0e0; font-size: 14px; scroll-behavior: smooth; }
    .msg { margin-bottom: 15px; padding: 12px; border-radius: 8px; max-width: 90%; word-wrap: break-word; }
    .msg.user { background: #222; align-self: flex-end; margin-left: auto; color: #fff; }
    .msg.bot { background: transparent; border-left: 2px solid ${CONFIG.THEME_COLOR}; padding-left: 15px; margin-left: 0; }
    
    /* Typing Animation */
    .typing::after { content: '▋'; animation: blink 1s infinite; color: ${CONFIG.THEME_COLOR}; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

    /* Main Input Area */
    .input-area { padding: 15px; background: #111; border-top: 1px solid #222; display: flex; gap: 10px; }
    input { flex: 1; background: #222; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 6px; outline: none; transition: border-color 0.2s; }
    input:focus { border-color: ${CONFIG.THEME_COLOR}; }
    button { background: ${CONFIG.THEME_COLOR}; border: none; padding: 0 20px; font-weight: bold; cursor: pointer; border-radius: 6px; color: #000; transition: opacity 0.2s; }
    button:hover { opacity: 0.9; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    /* --- Settings Panel (Improved UI) --- */
    .settings-panel { 
      position: absolute; inset: 0; background: rgba(10, 10, 10, 0.98); z-index: 10; 
      padding: 30px 20px; display: none; flex-direction: column; backdrop-filter: blur(5px);
    }
    .settings-panel.show { display: flex; }
    
    /* The new X close button */
    .settings-close-x {
        position: absolute; top: 15px; right: 15px;
        color: #fff; font-size: 28px; line-height: 1; cursor: pointer;
        opacity: 0.7; transition: all 0.2s;
    }
    .settings-close-x:hover { opacity: 1; color: ${CONFIG.THEME_COLOR}; transform: scale(1.1); }

    /* Improved Input Box */
    .settings-input-box {
        margin: 20px 0;
        padding: 15px;
        background: #000;
        border: 2px solid #333;
        color: ${CONFIG.THEME_COLOR};
        border-radius: 8px;
        outline: none;
        font-family: monospace;
        font-size: 14px;
        transition: all 0.3s ease;
        box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
    }
    .settings-input-box:focus { 
        border-color: ${CONFIG.THEME_COLOR}; 
        box-shadow: 0 0 15px ${CONFIG.THEME_COLOR}30, inset 0 0 10px rgba(0,0,0,0.5);
    }
    .settings-input-box::placeholder { color: #555; }

    #saveKeyBtn { width: 100%; padding: 15px; margin-top: auto; }
  `;
  shadow.appendChild(style);

  // --- 4. Define HTML Structure ---
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="launcher">✦</div>
    <div class="chat-window">
      <div class="header">
        <span>AI ASSISTANT</span>
        <span class="settings-btn" id="settingsToggle" title="Settings">⚙️</span>
      </div>

      <div class="settings-panel" id="settingsPanel">
        <span class="settings-close-x" id="closeSettingsX">×</span>

        <h3 style="color:#fff; margin: 0;">API Key Setup</h3>
        <p style="color:#aaa; font-size: 13px; margin-top: 10px;">
          Enter your Google Gemini API Key below. It is stored locally in your browser.
        </p>
        
        <input type="password" id="apiKeyInput" class="settings-input-box" placeholder="Paste your API Key here..." />
        
        <button id="saveKeyBtn">Save Securely</button>
      </div>

      <div class="messages" id="messages">
        <div class="msg bot"><p>System Online. I'm ready to analyze this page.</p></div>
      </div>

      <div class="input-area">
        <input type="text" id="userInput" placeholder="Ask a question..." />
        <button id="sendBtn">➤</button>
      </div>
    </div>
  `;
  shadow.appendChild(wrapper);

  // --- 5. Logic Implementation ---
  const messagesDiv = shadow.querySelector("#messages");
  const userInput = shadow.querySelector("#userInput");
  const sendBtn = shadow.querySelector("#sendBtn");
  const settingsPanel = shadow.querySelector("#settingsPanel");
  const apiKeyInput = shadow.querySelector("#apiKeyInput");
  
  let userApiKey = localStorage.getItem("gemini_user_key") || "";

  // Helper: Typewriter/Fade effect for messages
  async function typeWriter(element, text) {
    const html = window.marked ? window.marked.parse(text) : text;
    element.innerHTML = html;
    element.style.opacity = 0;
    let op = 0;
    const timer = setInterval(() => {
        if (op >= 1) { clearInterval(timer); }
        element.style.opacity = op;
        op += 0.1;
    }, 30);
  }

  // Helper: Add Message to UI
  const addMessage = (text, sender, isLoading = false) => {
    const div = document.createElement("div");
    div.className = `msg ${sender}`;
    messagesDiv.appendChild(div);
    if (isLoading) {
      div.innerText = "Thinking...";
      div.id = "loadingMsg";
      return div;
    }
    if (sender === "bot") { typeWriter(div, text); } 
    else { div.innerText = text; }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  // Helper: Get clean page text
  const getPageContext = () => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script, style, noscript, svg, .launcher, .chat-window').forEach(el => el.remove());
    return clone.innerText.replace(/\s+/g, " ").trim().substring(0, 12000); // Increased limit slightly
  };

  // Action: Send Message
  const handleSend = async () => {
    const question = userInput.value.trim();
    if (!question) return;
    
    if (!userApiKey) { 
      settingsPanel.classList.add("show"); 
      apiKeyInput.focus();
      return; 
    }

    addMessage(question, "user");
    userInput.value = "";
    sendBtn.disabled = true;
    
    const loadingMsg = addMessage("", "bot", true);

    try {
      // Format history for backend
      const formattedHistory = chatHistory.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));

      const res = await fetch(CONFIG.API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gemini-api-key": userApiKey },
        body: JSON.stringify({ 
          question, 
          context: getPageContext(),
          history: formattedHistory
        }),
      });
      
      const data = await res.json();
      
      messagesDiv.removeChild(loadingMsg);

      if(res.status !== 200) {
          addMessage(`⚠️ ${data.answer || "Error connecting."}`, "bot");
      } else {
          chatHistory.push({ role: "user", content: question });
          chatHistory.push({ role: "bot", content: data.answer });
          addMessage(data.answer, "bot");
      }

    } catch (err) {
      messagesDiv.removeChild(loadingMsg);
      addMessage("❌ Connection Error. Cannot reach server.", "bot");
    } finally {
        sendBtn.disabled = false;
    }
  };

  // --- 6. Event Listeners ---
  
  // Toggle Chat Window
  shadow.querySelector(".launcher").addEventListener("click", () => shadow.querySelector(".chat-window").classList.toggle("open"));
  
  // Settings: Open
  shadow.querySelector("#settingsToggle").addEventListener("click", () => {
      settingsPanel.classList.add("show");
      apiKeyInput.value = userApiKey; // Pre-fill existing key if available
  });

  // Settings: Close (X button)
  shadow.querySelector("#closeSettingsX").addEventListener("click", () => settingsPanel.classList.remove("show"));

  // Settings: Save
  shadow.querySelector("#saveKeyBtn").addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if(key) { 
        localStorage.setItem("gemini_user_key", key); 
        userApiKey = key; 
        settingsPanel.classList.remove("show"); 
        addMessage("API Key saved. You can now chat.", "bot");
    }
  });

  // Send Actions
  shadow.querySelector("#sendBtn").addEventListener("click", handleSend);
  userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSend(); });

})();