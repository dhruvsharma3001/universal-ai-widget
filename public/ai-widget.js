(function () {
  const CONFIG = {
    API_ENDPOINT: "https://universal-ai-widget.vercel.app/api/chat", // Update this to your Vercel URL
    THEME_COLOR: "#00ffcc",
    BG_COLOR: "#050505",
  };

  let chatHistory = []; // Local memory

  // --- 1. Load Markdown Library Dynamically ---
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
  document.head.appendChild(script);

  // --- 2. Create UI ---
  const container = document.createElement("div");
  container.id = "cyber-ai-widget";
  document.body.appendChild(container);
  const shadow = container.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; font-family: 'Segoe UI', sans-serif; }
    
    /* Syntax Highlighting & Markdown Styles */
    code { background: #222; padding: 2px 5px; border-radius: 4px; color: #ff79c6; font-family: monospace; }
    pre { background: #1e1e1e; padding: 10px; border-radius: 8px; overflow-x: auto; border: 1px solid #333; }
    pre code { background: transparent; padding: 0; color: #f8f8f2; }
    strong { color: ${CONFIG.THEME_COLOR}; }
    p { margin: 5px 0; line-height: 1.5; }
    ul { padding-left: 20px; }

    .launcher {
      position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px;
      background: ${CONFIG.BG_COLOR}; border: 2px solid ${CONFIG.THEME_COLOR};
      border-radius: 50%; cursor: pointer; z-index: 999999;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 15px ${CONFIG.THEME_COLOR}; font-size: 24px; color: ${CONFIG.THEME_COLOR};
      transition: all 0.3s;
    }
    .launcher:hover { transform: scale(1.1); box-shadow: 0 0 25px ${CONFIG.THEME_COLOR}; }

    .chat-window {
      position: fixed; bottom: 90px; right: 20px; width: 380px; height: 600px;
      background: #090909; border: 1px solid #333;
      border-radius: 12px; z-index: 999999; display: flex; flex-direction: column;
      opacity: 0; pointer-events: none; transform: translateY(20px); transition: all 0.3s;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    }
    .chat-window.open { opacity: 1; pointer-events: all; transform: translateY(0); }

    .header { 
      padding: 15px; border-bottom: 1px solid #333; background: #111;
      color: ${CONFIG.THEME_COLOR}; font-weight: bold; display: flex; justify-content: space-between; 
      border-radius: 12px 12px 0 0;
    }
    .settings-btn { cursor: pointer; opacity: 0.7; } .settings-btn:hover { opacity: 1; }

    .messages { flex: 1; padding: 20px; overflow-y: auto; color: #e0e0e0; font-size: 14px; scroll-behavior: smooth; }
    .msg { margin-bottom: 15px; padding: 12px; border-radius: 8px; max-width: 90%; word-wrap: break-word; }
    .msg.user { background: #222; align-self: flex-end; margin-left: auto; border: 1px solid #333; color: #fff; }
    .msg.bot { background: transparent; border-left: 2px solid ${CONFIG.THEME_COLOR}; padding-left: 15px; margin-left: 0; }
    
    /* Typing Cursor */
    .typing::after { content: '▋'; animation: blink 1s infinite; color: ${CONFIG.THEME_COLOR}; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

    .input-area { padding: 15px; background: #111; border-top: 1px solid #333; display: flex; gap: 10px; border-radius: 0 0 12px 12px; }
    input { flex: 1; background: #222; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 6px; outline: none; }
    input:focus { border-color: ${CONFIG.THEME_COLOR}; }
    button { background: ${CONFIG.THEME_COLOR}; border: none; padding: 0 20px; font-weight: bold; cursor: pointer; border-radius: 6px; color: #000; }
    
    /* Settings */
    .settings-panel { position: absolute; inset: 0; background: rgba(0,0,0,0.95); z-index: 10; padding: 20px; display: none; flex-direction: column; }
    .settings-panel.show { display: flex; }
    .settings-panel input { margin: 10px 0; }
  `;
  shadow.appendChild(style);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="launcher">✦</div>
    <div class="chat-window">
      <div class="header">
        <span>AI ASSISTANT</span>
        <span class="settings-btn" id="settingsToggle">⚙️</span>
      </div>
      <div class="settings-panel" id="settingsPanel">
        <h3 style="color:#fff">API Key Setup</h3>
        <p style="color:#aaa; font-size:12px;">Enter your Gemini API Key.</p>
        <input type="password" id="apiKeyInput" placeholder="Paste Key..." />
        <button id="saveKeyBtn">Save & Close</button>
      </div>
      <div class="messages" id="messages">
        <div class="msg bot"><p>System Online. Ask me about this page.</p></div>
      </div>
      <div class="input-area">
        <input type="text" id="userInput" placeholder="Type a message..." />
        <button id="sendBtn">➤</button>
      </div>
    </div>
  `;
  shadow.appendChild(wrapper);

  // --- 3. Logic & Typewriter Effect ---
  const messagesDiv = shadow.querySelector("#messages");
  const userInput = shadow.querySelector("#userInput");
  let userApiKey = localStorage.getItem("gemini_user_key") || "";

  // Helper: Typewriter Animation
  async function typeWriter(element, text) {
    // 1. Parse Markdown first (using marked.js)
    const html = window.marked ? window.marked.parse(text) : text;
    
    // 2. Create a temporary container to "reveal" content
    element.innerHTML = ""; // Clear loading
    element.classList.add("typing");
    
    // Simple logic: Just render HTML instantly for now to support Code Blocks properly
    // (Complex DOM typing is hard, so we fake it by small delays per sentence if needed, 
    // but for Code Blocks, instant render is better UX).
    // Let's do a fast fade-in effect instead of letter-by-letter to support Markdown HTML.
    
    element.innerHTML = html;
    element.style.opacity = 0;
    
    let op = 0;
    const timer = setInterval(() => {
        if (op >= 1) { clearInterval(timer); element.classList.remove("typing"); }
        element.style.opacity = op;
        op += 0.1;
    }, 30);
  }

  const addMessage = (text, sender, isLoading = false) => {
    const div = document.createElement("div");
    div.className = `msg ${sender}`;
    messagesDiv.appendChild(div);
    
    if (isLoading) {
      div.innerText = "Thinking...";
      return div;
    }

    if (sender === "bot") {
      typeWriter(div, text);
    } else {
      div.innerText = text;
    }
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  const getPageContext = () => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script, style, noscript, svg').forEach(el => el.remove());
    return clone.innerText.replace(/\s+/g, " ").trim().substring(0, 8000);
  };

  const handleSend = async () => {
    const question = userInput.value.trim();
    if (!question) return;
    if (!userApiKey) { shadow.querySelector("#settingsPanel").classList.add("show"); return; }

    addMessage(question, "user");
    userInput.value = "";
    
    const loadingMsg = addMessage("", "bot", true); // Show "Thinking..."

    try {
      // Prepare History for Gemini (User = user, Bot = model)
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
          history: formattedHistory // Sending History!
        }),
      });
      
      const data = await res.json();
      
      // Update Memory
      chatHistory.push({ role: "user", content: question });
      chatHistory.push({ role: "bot", content: data.answer });

      typeWriter(loadingMsg, data.answer); // Replace "Thinking..." with typed response

    } catch (err) {
      loadingMsg.innerText = "Error connecting.";
    }
  };

  // Event Listeners
  shadow.querySelector(".launcher").addEventListener("click", () => shadow.querySelector(".chat-window").classList.toggle("open"));
  shadow.querySelector("#settingsToggle").addEventListener("click", () => shadow.querySelector("#settingsPanel").classList.add("show"));
  shadow.querySelector("#saveKeyBtn").addEventListener("click", () => {
    const key = shadow.querySelector("#apiKeyInput").value.trim();
    if(key) { localStorage.setItem("gemini_user_key", key); userApiKey = key; shadow.querySelector("#settingsPanel").classList.remove("show"); }
  });
  shadow.querySelector("#sendBtn").addEventListener("click", handleSend);
  userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSend(); });

})();
