(function () {
  "use strict";

  const LINKEDIN_URL = "https://www.linkedin.com/in/saitejaboppiniti";
  const MAX_MESSAGE_LENGTH = 1200;
  const STORAGE_KEY = "portfolio-chat-conversation";
  const MAX_SAVED_TURNS = 40;
  const script = document.currentScript;
  const configuredEndpoint = script?.dataset.endpoint?.trim() || "";
  const isLocalPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const endpoint = configuredEndpoint || (isLocalPreview ? "http://127.0.0.1:8787/api/chat" : "");
  // Chatbot icon by Shashank Singh (Flaticon). Resolved next to this script so it works on every page.
  const BOT_ICON_URL = new URL("chatbot-icon.png", script?.src || window.location.href).href;
  const ICON_CREDIT = `Chatbot icon by <a href="https://www.flaticon.com/free-icons/chatbot" title="chatbot icons" target="_blank" rel="noopener noreferrer">Shashank Singh - Flaticon</a>.`;

  const root = document.createElement("div");
  root.className = "portfolio-chat";
  root.innerHTML = `
    <button class="chat-launcher" type="button" aria-expanded="false" aria-controls="chat-panel">
      <span class="chat-launcher-label">Ask about Sai</span>
      <span class="chat-bot-badge" aria-hidden="true"><img src="${BOT_ICON_URL}" alt="" width="40" height="40"></span>
    </button>
    <section class="chat-panel" id="chat-panel" role="dialog" aria-modal="false" aria-labelledby="chat-title" hidden>
      <header class="chat-header">
        <div class="chat-avatar" aria-hidden="true">ST</div>
        <div class="chat-heading">
          <h2 class="chat-title" id="chat-title">Portfolio Assistant</h2>
          <p class="chat-subtitle">About Sai Teja Boppiniti</p>
        </div>
        <div class="chat-header-actions">
          <button class="chat-icon-button chat-clear" type="button" aria-label="Start a new conversation" title="New conversation">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/></svg>
          </button>
          <button class="chat-icon-button chat-minimize" type="button" aria-label="Minimize chat (keeps the conversation)" title="Minimize">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>
          </button>
          <button class="chat-icon-button chat-close" type="button" aria-label="Close chat and end the conversation" title="Close and end chat">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
        </div>
      </header>
      <div class="chat-content">
        <div class="chat-welcome">
          <strong>Explore Sai’s work and background.</strong> Ask about his data engineering experience, healthcare AI research, education, or publications. Answers are grounded in approved information, with relevant sources.
        </div>
        <div class="chat-suggestions" aria-label="Suggested questions">
          <button class="chat-suggestion" type="button">Summarize Sai’s data engineering experience</button>
          <button class="chat-suggestion" type="button">What is his healthcare AI research about?</button>
          <button class="chat-suggestion" type="button">Tell me about his education and publications</button>
        </div>
        <div class="chat-messages" role="log" aria-live="polite" aria-relevant="additions text" aria-label="Conversation"></div>
      </div>
      <form class="chat-form">
        <div class="chat-status" role="status" aria-live="polite"></div>
        <div class="chat-input-wrap">
          <textarea class="chat-input" rows="1" maxlength="${MAX_MESSAGE_LENGTH}" aria-label="Your question" placeholder="Ask a question…" required></textarea>
          <button class="chat-send" type="submit" aria-label="Send question" disabled>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>
          </button>
        </div>
        <p class="chat-disclosure">AI-generated answers may be inaccurate. Questions are sent to Google Gemini, and Google may use them to improve its products. A temporary keyed IP hash enforces usage limits. Don’t share sensitive information. <a href="${LINKEDIN_URL}" target="_blank" rel="noopener noreferrer">Contact Sai on LinkedIn</a>. ${ICON_CREDIT}</p>
      </form>
    </section>
  `;
  document.body.appendChild(root);

  const launcher = root.querySelector(".chat-launcher");
  const panel = root.querySelector(".chat-panel");
  const closeButton = root.querySelector(".chat-close");
  const minimizeButton = root.querySelector(".chat-minimize");
  const launcherLabel = root.querySelector(".chat-launcher-label");
  const clearButton = root.querySelector(".chat-clear");
  const form = root.querySelector(".chat-form");
  const input = root.querySelector(".chat-input");
  const sendButton = root.querySelector(".chat-send");
  const status = root.querySelector(".chat-status");
  const content = root.querySelector(".chat-content");
  const messagesElement = root.querySelector(".chat-messages");
  const suggestions = root.querySelector(".chat-suggestions");
  let isSending = false;
  let conversation = [];

  function setOpen(isOpen) {
    panel.hidden = !isOpen;
    launcher.hidden = isOpen;
    launcher.setAttribute("aria-expanded", String(isOpen));
    // After minimizing, the launcher invites the visitor back to the same conversation.
    launcherLabel.textContent = conversation.length > 0 ? "Continue chat" : "Ask about Sai";
    if (isOpen) input.focus();
    else launcher.focus();
  }

  function addMessage(role, text, sources = []) {
    const message = document.createElement("div");
    message.className = `chat-message chat-message-${role}`;
    message.textContent = text;
    messagesElement.appendChild(message);

    // Only real links are shown as sources; plain-text notes are skipped.
    const linkSources = role === "assistant"
      ? sources.filter((source) => typeof source.url === "string" && /^(https:\/\/|mailto:)/i.test(source.url)).slice(0, 3)
      : [];
    if (linkSources.length > 0) {
      const sourceList = document.createElement("div");
      sourceList.className = "chat-source-list";
      sourceList.setAttribute("aria-label", "Answer sources");

      const heading = document.createElement("div");
      heading.className = "chat-source-label";
      heading.textContent = "Sources";
      sourceList.appendChild(heading);

      linkSources.forEach((source) => {
        const sourceItem = document.createElement("div");
        sourceItem.className = "chat-source";
        const link = document.createElement("a");
        link.textContent = source.label;
        link.href = source.url;
        if (source.url.startsWith("https://")) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
        sourceItem.appendChild(link);
        sourceList.appendChild(sourceItem);
      });

      messagesElement.appendChild(sourceList);
    }
    content.scrollTop = content.scrollHeight;
    return message;
  }

  // The chat shows plain text, so turn any Markdown the model adds into
  // readable text: "* item" becomes "• item", and **bold** / # headings lose their symbols.
  function cleanAnswer(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      .replace(/^[ \t]*[*\-+][ \t]+/gm, "• ")
      .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // Keeps the conversation while the visitor moves between pages in the same
  // browser tab. sessionStorage is cleared when the tab closes. If storage is
  // blocked (private mode, strict settings), the chat still works without it.
  function saveConversation() {
    try {
      if (conversation.length > 0) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(conversation));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable: the conversation simply won't carry over.
    }
  }

  function restoreConversation() {
    let saved;
    try {
      saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return;
    }
    if (!Array.isArray(saved)) return;
    saved
      .filter((turn) => (turn?.role === "user" || turn?.role === "assistant") && typeof turn.text === "string" && turn.text.trim())
      .slice(-MAX_SAVED_TURNS)
      .forEach((turn) => {
        const sources = Array.isArray(turn.sources) ? turn.sources : [];
        conversation.push(turn.role === "assistant" ? { role: turn.role, text: turn.text, sources } : { role: turn.role, text: turn.text });
        addMessage(turn.role, turn.text, sources);
      });
    if (conversation.length > 0) {
      suggestions.hidden = true;
      launcherLabel.textContent = "Continue chat";
    }
  }

  function updateSendButton() {
    sendButton.disabled = isSending || !input.value.trim();
  }

  function resetConversation() {
    messagesElement.replaceChildren();
    conversation = [];
    saveConversation();
    suggestions.hidden = false;
    status.textContent = "";
    input.value = "";
    input.style.height = "";
    updateSendButton();
    input.focus();
  }

  async function sendMessage(text) {
    const question = text.trim();
    if (!question || isSending) return;
    if (question.length > MAX_MESSAGE_LENGTH) {
      status.textContent = `Please keep your question under ${MAX_MESSAGE_LENGTH} characters.`;
      return;
    }

    if (!endpoint) {
      status.textContent = `The chat service is not connected yet. Please contact Sai on LinkedIn.`;
      return;
    }

    status.textContent = "";
    suggestions.hidden = true;
    const userMessage = addMessage("user", question);
    // Only role and text go to the server; saved source links stay in the browser.
    const history = conversation.slice(-8).map(({ role, text: turnText }) => ({ role, text: turnText }));
    conversation.push({ role: "user", text: question });
    input.value = "";
    input.style.height = "";
    isSending = true;
    input.disabled = true;
    clearButton.disabled = true;
    updateSendButton();

    const typing = document.createElement("div");
    typing.className = "chat-typing";
    typing.textContent = "Thinking…";
    typing.setAttribute("aria-hidden", "true");
    messagesElement.appendChild(typing);
    content.scrollTop = content.scrollHeight;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history })
      });
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error("The chat service returned an unreadable response. Please try again.");
      }
      if (!response.ok) {
        throw new Error(payload.error || "The chat service is temporarily unavailable. Please try again.");
      }
      if (typeof payload.answer !== "string" || !payload.answer.trim()) {
        throw new Error("No answer was returned. Please try again.");
      }

      const answer = cleanAnswer(payload.answer);
      const sources = Array.isArray(payload.sources) ? payload.sources : [];
      conversation.push({ role: "assistant", text: answer, sources });
      addMessage("assistant", answer, sources);
      saveConversation();
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? "Couldn’t connect to the chat service. Your question is still here—please try again."
        : error instanceof Error
          ? error.message
          : "The chat service is temporarily unavailable. Your question is still here—please try again.";
      if (!input.value.trim()) {
        input.value = question;
        input.dispatchEvent(new Event("input"));
      }
      if (conversation.at(-1)?.role === "user" && conversation.at(-1)?.text === question) {
        conversation.pop();
      }
      // The question goes back into the input, so remove its bubble to avoid
      // showing it twice when the visitor resends it.
      userMessage.remove();
      if (!messagesElement.querySelector(".chat-message")) suggestions.hidden = false;
    } finally {
      typing.remove();
      isSending = false;
      input.disabled = false;
      clearButton.disabled = false;
      updateSendButton();
      input.focus();
    }
  }

  restoreConversation();

  launcher.addEventListener("click", () => setOpen(true));
  // Minimize keeps the conversation; close ends it so the next chat starts fresh.
  minimizeButton.addEventListener("click", () => setOpen(false));
  closeButton.addEventListener("click", () => {
    resetConversation();
    setOpen(false);
  });
  clearButton.addEventListener("click", resetConversation);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });

  root.querySelectorAll(".chat-suggestion").forEach((button) => {
    button.addEventListener("click", () => sendMessage(button.textContent));
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 104)}px`;
    updateSendButton();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(input.value);
  });
})();
