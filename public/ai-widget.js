(function () {
  const CONFIG = {
    // 🔴 CHANGE THIS TO YOUR VERCEL URL
    API_ENDPOINT: "https://universal-ai-widget.vercel.app/api/chat", 
    THEME_COLOR: "#00ffcc",
    BG_COLOR: "#050505",
  };

  let chatHistory = [];
  let recognition;
  let isListening = false;
  let synthesis = window.speechSynthesis;
  
  // Load Voice Setting (Default to TRUE if not set)
  let voiceEnabled = localStorage.getItem("gemini_voice_enabled") !== "false"; 

  // --- 1. Load Dependencies ---
  if (!window.marked) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    document.head.appendChild(script);
  }

  // --- 2. Setup Speech Recognition ---
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
    * { box-sizing: border-box; font-family: 'Segoe UI', sans-serif; }
    
    /* Markdown Styles */
    code { background: #222; padding: 2px 5px; border-radius: 4px; color: #ff79c6; font-family: monospace; }
    pre { background: #1e1e1e; padding: 10px; border-radius: 8px; overflow-x: auto; border: 1px solid #333; margin: 10px 0; }
    pre code { background: transparent; padding: 0; color: #f8f8f2; }
    strong { color: ${CONFIG.THEME_COLOR}; }
    p { margin: 5px 0; line-height: 1.5; }

    /* Launcher */
    .launcher {
      position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px;
      background: ${CONFIG.BG_COLOR}; border: 2px solid ${CONFIG.THEME_COLOR};
      border-radius: 50%; cursor: pointer; z-index: 999999;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 15px ${CONFIG.THEME_COLOR}40; font-size: 24px; color: ${CONFIG.THEME_COLOR};
      transition: all 0.3s;
    }
    .launcher:hover { transform: scale(1.1); box-shadow: 0 0 25px ${CONFIG.THEME_COLOR}80; }

    /* Chat Window */
    .chat-window {
      position: fixed; bottom: 90px; right: 20px; width: 380px; height: 600px; max-height: calc(100vh - 120px);
      background: #090909; border: 1px solid #333;
      border-radius: 12px; z-index: 999999; display: flex; flex-direction: column;
      opacity: 0; pointer-events: none; transform: translateY(20px); transition: all 0.3s;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .chat-window.open { opacity: 1; pointer-events: all; transform: translateY(0); }

    .header { 
      padding: 15px; background: #111; border-bottom: 1px solid #222;
      color: ${CONFIG.THEME_COLOR}; font-weight: bold; display: flex; justify-content: space-between; align-items: center;
    }
    .settings-btn { cursor: pointer; opacity: 0.6; font-size: 18px; } .settings-btn:hover { opacity: 1; }

    .messages { flex: 1; padding: 20px; overflow-y: auto; color: #e0e0e0; font-size: 14px; }
    .msg { margin-bottom: 15px; padding: 12px; border-radius: 8px; max-width: 90%; word-wrap: break-word; position: relative; }
    .msg.user { background: #222; align-self: flex-end; margin-left: auto; color: #fff; }
    .msg.bot { background: transparent; border-left: 2px solid ${CONFIG.THEME_COLOR}; padding-left: 15px; }

    .speak-btn {
      position: absolute; right: -25px; top: 50%; transform: translateY(-50%);
      cursor: pointer; opacity: 0.4; font-size: 16px; display: none;
    }
    .msg:hover .speak-btn { display: block; }

    /* Input Area */
    .input-area { padding: 15px; background: #111; border-top: 1px solid #222; display: flex; gap: 10px; align-items: center; }
    input { flex: 1; background: #222; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 6px; outline: none; }
    input:focus { border-color: ${CONFIG.THEME_COLOR}; }
    
    button { background: ${CONFIG.THEME_COLOR}; border: none; padding: 0 15px; font-weight: bold; cursor: pointer; border-radius: 6px; color: #000; height: 42px; }
    
    /* Mic Button */
    #micBtn { background: #333; color: #fff; width: 42px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    #micBtn.listening { background: #ff4444; color: white; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(255, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); } }

    /* Settings Panel */
    .settings-panel { position: absolute; inset: 0; background: rgba(10,10,10,0.98); z-index: 10; padding: 30px 20px; display: none; flex-direction: column; }
    .settings-panel.show { display: flex; }
    .settings-close-x { position: absolute; top: 15px; right: 15px; color: #fff; font-size: 28px; cursor: pointer; }
    
    .settings-input-box { margin: 15px 0; padding: 15px; background: #000; border: 2px solid #333; color: ${CONFIG.THEME_COLOR}; border-radius: 8px; outline: none; width: 100%; }
    
    /* Toggle Switch Style */
    .setting-row { display: flex; align-items: center; justify-content: space-between; margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 8px; }
    .toggle-switch { position: relative; display: inline-block; width: 50px; height: 24px; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #333; transition: .4s; border-radius: 24px; }
    .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
    input:checked + .slider { background-color: ${CONFIG.THEME_COLOR}; }
    input:checked + .slider:before { transform: translateX(26px); background-color: black; }

    #saveKeyBtn { width: 100%; padding: 15px; margin-top: auto; }
  `;
  shadow.appendChild(style);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="launcher">🎙️</div>
    <div class="chat-window">
      <div class="header">
        <span>VOICE ASSISTANT</span>
        <span class="settings-btn" id="settingsToggle">⚙️</span>
      </div>

      <div class="settings-panel" id="settingsPanel">
        <span class="settings-close-x" id="closeSettingsX">×</span>
        
        <h3 style="color:#fff; margin:0;">Configuration</h3>
        
        <p style="color:#aaa; font-size:13px; margin-top:15px;">Google Gemini API Key:</p>
        <input type="password" id="apiKeyInput" class="settings-input-box" placeholder="Paste Key here..." />

        <div class="setting-row">
          <span style="color:#fff; font-size:14px;">Auto-Read Responses</span>
          <label class="toggle-switch">
            <input type="checkbox" id="voiceToggle">
            <span class="slider"></span>
          </label>
        </div>

        <button id="saveKeyBtn">Save Settings</button>
      </div>

      <div class="messages" id="messages">
        <div class="msg bot"><p>System Online. I am ready.</p></div>
      </div>

      <div class="input-area">
        <button id="micBtn" title="Speak">🎤</button>
        <input type="text" id="userInput" placeholder="Ask something..." />
        <button id="sendBtn">➤</button>
      </div>
    </div>
  `;
  shadow.appendChild(wrapper);

  // --- 4. Logic ---
  const messagesDiv = shadow.querySelector("#messages");
  const userInput = shadow.querySelector("#userInput");
  const micBtn = shadow.querySelector("#micBtn");
  const settingsPanel = shadow.querySelector("#settingsPanel");
  const apiKeyInput = shadow.querySelector("#apiKeyInput");
  const voiceToggle = shadow.querySelector("#voiceToggle");
  
  let userApiKey = localStorage.getItem("gemini_user_key") || "";

  // Initialize Toggle State
  voiceToggle.checked = voiceEnabled;

  // Helper: Speak Text
  const speakText = (text) => {
    if (!synthesis) return;
    synthesis.cancel(); 
    const cleanText = text.replace(/[*#`_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.1; 
    synthesis.speak(utterance);
  };

  // Helper: Typewriter Effect
  async function typeWriter(element, text, shouldSpeak) {
    const html = window.marked ? window.marked.parse(text) : text;
    element.innerHTML = html;
    
    // Always add manual speaker button
    const speakBtn = document.createElement("span");
    speakBtn.className = "speak-btn";
    speakBtn.innerHTML = "🔊";
    speakBtn.onclick = () => speakText(text);
    element.appendChild(speakBtn);

    element.style.opacity = 0;
    let op = 0;
    const timer = setInterval(() => {
        if (op >= 1) { clearInterval(timer); }
        element.style.opacity = op;
        op += 0.1;
    }, 30);

    // Only speak automatically if Setting is ENABLED
    if (shouldSpeak && voiceEnabled) {
        speakText(text);
    }
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
        // We pass 'true' here to indicate this is a bot response capable of being spoken
        // The typeWriter function will check the 'voiceEnabled' setting.
        typeWriter(div, text, true); 
    } else { 
        div.innerText = text; 
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  const getPageContext = () => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script, style, noscript, svg, .launcher, .chat-window').forEach(el => el.remove());
    return clone.innerText.replace(/\s+/g, " ").trim().substring(0, 8000);
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
      addMessage("❌ Connection Error.", "bot");
    }
  };

  // --- 5. Event Listeners ---
  
  // Mic Logic (Always available for Input, output depends on Toggle)
  if (recognition) {
    micBtn.addEventListener("click", () => {
      if (isListening) recognition.stop();
      else recognition.start();
    });

    recognition.onstart = () => {
      isListening = true;
      micBtn.classList.add("listening");
      userInput.placeholder = "Listening...";
    };

    recognition.onend = () => {
      isListening = false;
      micBtn.classList.remove("listening");
      userInput.placeholder = "Ask something...";
      if(userInput.value) handleSend(); // Auto send on silence
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      userInput.value = transcript;
    };
  } else {
    micBtn.style.display = "none"; 
  }

  shadow.querySelector(".launcher").addEventListener("click", () => shadow.querySelector(".chat-window").classList.toggle("open"));
  
  // Settings Panel Logic
  shadow.querySelector("#settingsToggle").addEventListener("click", () => {
      settingsPanel.classList.add("show");
      apiKeyInput.value = userApiKey;
  });
  shadow.querySelector("#closeSettingsX").addEventListener("click", () => settingsPanel.classList.remove("show"));
  
  // Save Settings
  shadow.querySelector("#saveKeyBtn").addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if(key) { 
        localStorage.setItem("gemini_user_key", key); 
        userApiKey = key; 
    }
    
    // Save Voice Toggle State
    voiceEnabled = voiceToggle.checked;
    localStorage.setItem("gemini_voice_enabled", voiceEnabled);

    settingsPanel.classList.remove("show");
    addMessage("Settings Saved!", "bot");
  });

  shadow.querySelector("#sendBtn").addEventListener("click", handleSend);
  userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSend(); });

})();
