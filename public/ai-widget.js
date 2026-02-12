(function () {
  const CONFIG = {
    // CHANGE THIS URL IF YOU DEPLOY TO VERCEL
    API_ENDPOINT: "http://localhost:3000/api/chat", 
    THEME_COLOR: "#00ffcc",
    BG_COLOR: "#050505",
  };

  // --- 1. UI Setup ---
  const container = document.createElement("div");
  container.id = "cyber-ai-widget";
  document.body.appendChild(container);
  const shadow = container.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; font-family: 'Courier New', monospace; }
    
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
      position: fixed; bottom: 90px; right: 20px; width: 350px; height: 500px;
      background: rgba(5, 5, 5, 0.95); border: 1px solid ${CONFIG.THEME_COLOR};
      border-radius: 12px; z-index: 999999; display: flex; flex-direction: column;
      opacity: 0; pointer-events: none; transform: translateY(20px); transition: all 0.3s;
      box-shadow: 0 0 30px rgba(0, 255, 204, 0.15); backdrop-filter: blur(10px);
    }
    .chat-window.open { opacity: 1; pointer-events: all; transform: translateY(0); }

    .header { 
      padding: 15px; border-bottom: 1px solid ${CONFIG.THEME_COLOR}; 
      color: ${CONFIG.THEME_COLOR}; font-weight: bold; display: flex; justify-content: space-between; 
    }
    .settings-btn { cursor: pointer; font-size: 18px; opacity: 0.8; }
    .settings-btn:hover { opacity: 1; }
    
    .messages { flex: 1; padding: 15px; overflow-y: auto; color: #fff; font-size: 14px; }
    .msg { margin-bottom: 10px; padding: 10px; border-radius: 6px; max-width: 85%; word-wrap: break-word; }
    .msg.user { background: #222; align-self: flex-end; margin-left: auto; border: 1px solid #444; }
    .msg.bot { background: rgba(0, 255, 204, 0.1); border: 1px solid ${CONFIG.THEME_COLOR}; color: #ddd; }

    .input-area { padding: 15px; border-top: 1px solid #333; display: flex; gap: 10px; }
    input { flex: 1; background: #111; border: 1px solid #333; color: ${CONFIG.THEME_COLOR}; padding: 10px; border-radius: 4px; outline: none; }
    button { background: ${CONFIG.THEME_COLOR}; border: none; padding: 0 15px; font-weight: bold; cursor: pointer; border-radius: 4px; }

    /* Settings Panel */
    .settings-panel {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(5, 5, 5, 0.98); z-index: 10; padding: 20px; display: none; flex-direction: column;
    }
    .settings-panel.show { display: flex; }
    .settings-panel h3 { color: ${CONFIG.THEME_COLOR}; margin-top: 0; }
    .settings-panel input { width: 100%; margin: 10px 0; padding: 10px; background: #222; border: 1px solid #444; color: #fff; }
    .save-btn { width: 100%; padding: 10px; margin-top: 10px; background: ${CONFIG.THEME_COLOR}; border: none; font-weight: bold; cursor: pointer; }
    .cancel-btn { width: 100%; padding: 10px; margin-top: 5px; background: #333; color: #fff; border: none; cursor: pointer; }
  `;
  shadow.appendChild(style);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="launcher">🤖</div>
    <div class="chat-window">
      <div class="header">
        <span>AI ASSISTANT</span>
        <span class="settings-btn" id="settingsToggle">⚙️</span>
      </div>

      <div class="settings-panel" id="settingsPanel">
        <h3>API Configuration</h3>
        <p style="color:#aaa; font-size:12px;">Enter your Google Gemini API Key.</p>
        <input type="password" id="apiKeyInput" placeholder="Paste API Key here..." />
        <button class="save-btn" id="saveKeyBtn">SAVE KEY</button>
        <button class="cancel-btn" id="closeSettings">CANCEL</button>
      </div>

      <div class="messages" id="messages">
        <div class="msg bot">Hello! Please click ⚙️ to set your API Key.</div>
      </div>
      <div class="input-area">
        <input type="text" id="userInput" placeholder="Ask about this page..." />
        <button id="sendBtn">➤</button>
      </div>
    </div>
  `;
  shadow.appendChild(wrapper);

  // --- 2. Logic ---
  const settingsPanel = shadow.querySelector("#settingsPanel");
  const apiKeyInput = shadow.querySelector("#apiKeyInput");
  const messagesDiv = shadow.querySelector("#messages");
  const chatWindow = shadow.querySelector(".chat-window");

  // Load Key from LocalStorage
  let userApiKey = localStorage.getItem("gemini_user_key") || "";
  if(userApiKey) {
    apiKeyInput.value = userApiKey;
    messagesDiv.innerHTML = `<div class="msg bot">System Online. Key loaded.</div>`;
  }

  // Toggle Window
  const toggle = () => chatWindow.classList.toggle("open");
  shadow.querySelector(".launcher").addEventListener("click", toggle);

  // Settings Handlers
  const toggleSettings = () => settingsPanel.classList.toggle("show");
  shadow.querySelector("#settingsToggle").addEventListener("click", toggleSettings);
  shadow.querySelector("#closeSettings").addEventListener("click", toggleSettings);
  
  shadow.querySelector("#saveKeyBtn").addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if(key) {
      localStorage.setItem("gemini_user_key", key);
      userApiKey = key;
      settingsPanel.classList.remove("show");
      addMessage("API Key saved! You can now chat.", "bot");
    }
  });

  // Chat Helpers
  const addMessage = (text, sender) => {
    const div = document.createElement("div");
    div.className = `msg ${sender}`;
    div.innerText = text;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  const getPageContext = () => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script, style, noscript, svg').forEach(el => el.remove());
    return clone.innerText.replace(/\s+/g, " ").trim().substring(0, 6000);
  };

  // Send Message
  const handleSend = async () => {
    const question = shadow.querySelector("#userInput").value.trim();
    if (!question) return;

    if (!userApiKey) {
      addMessage("⚠️ Error: No API Key found. Click ⚙️ to set it.", "bot");
      toggleSettings();
      return;
    }

    addMessage(question, "user");
    shadow.querySelector("#userInput").value = "";
    
    // Add loading indicator
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "msg bot";
    loadingDiv.innerText = "Thinking...";
    messagesDiv.appendChild(loadingDiv);
    
    try {
      const res = await fetch(CONFIG.API_ENDPOINT, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-gemini-api-key": userApiKey // 🔑 Sending the key here
        },
        body: JSON.stringify({ question, context: getPageContext() }),
      });
      
      const data = await res.json();
      
      // Remove loading and show answer
      messagesDiv.removeChild(loadingDiv);
      addMessage(data.answer, "bot");

    } catch (err) {
      messagesDiv.removeChild(loadingDiv);
      addMessage("❌ Connection Error. Is the server running?", "bot");
      console.error(err);
    }
  };

  shadow.querySelector("#sendBtn").addEventListener("click", handleSend);
  shadow.querySelector("#userInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSend();
  });
})();