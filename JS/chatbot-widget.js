import { askLibraryAssistant } from "./firebase/chatbot-service.js";

function createWidgetDOM() {
  const wrapper = document.createElement("div");
  wrapper.id = "librax-chatbot-wrapper";
  wrapper.innerHTML = `
    <button id="librax-chat-toggle" title="Library Assistant">💬</button>

    <div id="librax-chat-panel" class="hidden">
      <div id="librax-chat-header">
        Librax Assistant
        <span>Ask me about our books</span>
        <button id="librax-chat-close">&times;</button>
      </div>
      <div id="librax-chat-messages"></div>
      <div id="librax-chat-input-row">
        <input type="text" id="librax-chat-input" placeholder="Write your question..." />
        <button id="librax-chat-send">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);
}

function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    #librax-chatbot-wrapper * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, sans-serif; }

    #librax-chat-toggle {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background:#023dc8;
      color: white;
      font-size: 24px;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
      z-index: 9999;
    }
    #librax-chat-toggle:hover { background: #023dc8; }

    #librax-chat-panel {
      position: fixed;
      bottom: 92px;
      right: 24px;
      width: 340px;
      height: 460px;
      background: white;
      border-radius: 14px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.25);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 9999;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }
    #librax-chat-panel.hidden {
      opacity: 0;
      pointer-events: none;
      transform: translateY(10px);
    }

    #librax-chat-header {
      background: #023dc8;
      color: white;
      padding: 12px 14px;
      font-size: 15px;
      font-weight: 600;
      position: relative;
    }
    #librax-chat-header span {
      display: block;
      font-size: 11px;
      font-weight: 400;
      opacity: 0.75;
      margin-top: 2px;
    }
    #librax-chat-close {
      position: absolute;
      top: 8px;
      right: 10px;
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
    }

    #librax-chat-messages {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 13px;
    }
    .librax-msg {
      max-width: 82%;
      padding: 8px 12px;
      border-radius: 10px;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .librax-msg.user {
      background: #023dc8;
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 3px;
    }
    .librax-msg.bot {
      background: #f0f2f5;
      color: #222;
      align-self: flex-start;
      border-bottom-left-radius: 3px;
    }
    .librax-msg.typing { background: #f0f2f5; color: #888; font-style: italic; }

    #librax-chat-input-row {
      display: flex;
      border-top: 1px solid #e2e5ea;
      padding: 8px;
      gap: 6px;
    }
    #librax-chat-input {
      flex: 1;
      padding: 8px 10px;
      border: 1px solid #d5d9e0;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }
    #librax-chat-send {
      background: #023dc8;
      color: white;
      border: none;
      padding: 0 14px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }
    #librax-chat-send:disabled { background: #9aa7b8; cursor: not-allowed; }
  `;
  document.head.appendChild(style);
}

function addMessage(container, text, sender) {
  const div = document.createElement("div");
  div.className = `librax-msg ${sender}`;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function initChatbot() {
  injectStyles();
  createWidgetDOM();

  const toggleBtn = document.getElementById("librax-chat-toggle");
  const closeBtn = document.getElementById("librax-chat-close");
  const panel = document.getElementById("librax-chat-panel");
  const messages = document.getElementById("librax-chat-messages");
  const input = document.getElementById("librax-chat-input");
  const sendBtn = document.getElementById("librax-chat-send");

  toggleBtn.addEventListener("click", () => panel.classList.toggle("hidden"));
  closeBtn.addEventListener("click", () => panel.classList.add("hidden"));

  addMessage(messages, "Hello! Feel free to ask me anything about our books.", "bot");

  async function handleSend() {
    const question = input.value.trim();
    if (!question) return;

    addMessage(messages, question, "user");
    input.value = "";
    sendBtn.disabled = true;

    const typingEl = addMessage(messages, "Typing....", "typing");

    try {
      const answer = await askLibraryAssistant(question);
      typingEl.remove();
      addMessage(messages, answer, "bot");
    } catch (err) {
      typingEl.remove();
      addMessage(messages, "Error: " + err.message, "bot");
      console.error(err);
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  sendBtn.addEventListener("click", handleSend);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSend();
  });
}

document.addEventListener("DOMContentLoaded", initChatbot);