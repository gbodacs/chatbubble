(function () {
  const DEFAULT_ICON =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect x="6" y="6" width="52" height="40" rx="18" fill="#16423C"/><path d="M21 24h22M21 32h16" stroke="#F8F5F0" stroke-width="4" stroke-linecap="round"/><path d="M22 46l-2 10 10-8" fill="#16423C"/></svg>'
    );

  const DEFAULTS = {
    url: '/api/chat',
    target: document.body,
    title: 'AI Chat',
    welcomeMessage: 'How can I help you today?',
    placeholder: 'Type your message...',
    sendLabel: 'Send',
    launcherAriaLabel: 'Open chat',
    minimizeAriaLabel: 'Minimize chat',
    width: 360,
    height: 520,
    iconUrl: DEFAULT_ICON,
    headers: {
      'Content-Type': 'application/json'
    },
    themeColors: {
      primary: '#16423C',
      background: '#F6F3EF',
      surface: '#FFFFFF',
      text: '#1F2933',
      muted: '#667085',
      border: '#D6D3CE',
      userBubble: '#16423C',
      userText: '#F8F5F0',
      botBubble: '#ECE7DF',
      botText: '#1F2933'
    },
    fetchOptions: {},
    buildPayload: null,
    responseParser: null,
    onMessageSent: null,
    onResponse: null,
    onError: null,
    startMinimized: false
  };

  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  function mergeConfig(base, overrides) {
    const output = { ...base };

    Object.keys(overrides || {}).forEach((key) => {
      const baseValue = output[key];
      const overrideValue = overrides[key];

      if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
        output[key] = mergeConfig(baseValue, overrideValue);
        return;
      }

      output[key] = overrideValue;
    });

    return output;
  }

  function extractReply(data) {
    if (typeof data === 'string') {
      return data;
    }

    if (!data || typeof data !== 'object') {
      return 'No response body was returned.';
    }

    const candidates = [
      data.reply,
      data.message,
      data.response,
      data.answer,
      data.text,
      data.result,
      data.content,
      data.data && data.data.reply,
      data.data && data.data.message,
      data.data && data.data.text,
      data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
    ];

    const match = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
    return match || JSON.stringify(data);
  }

  class ChatBubble {
    constructor(config) {
      this.config = mergeConfig(DEFAULTS, config || {});
      this.isOpen = !this.config.startMinimized;
      this.isSending = false;
      this.history = [];
      this.host = document.createElement('div');
      this.host.className = 'chatbubble-host';
      this.shadowRoot = this.host.attachShadow({ mode: 'open' });
      this.render();
      this.mount();

      if (this.config.welcomeMessage) {
        this.addMessage('assistant', this.config.welcomeMessage);
      }
    }

    mount() {
      const target = this.config.target instanceof HTMLElement ? this.config.target : document.body;
      target.appendChild(this.host);
    }

    destroy() {
      this.host.remove();
    }

    render() {
      const { themeColors, width, height, iconUrl, title, placeholder, sendLabel } = this.config;

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            all: initial;
          }

          .chatbubble-root {
            position: fixed;
            right: 24px;
            bottom: 24px;
            z-index: 2147483000;
            font-family: Arial, sans-serif;
            color: ${themeColors.text};
          }

          .launcher {
            width: 64px;
            height: 64px;
            border: 0;
            border-radius: 999px;
            background: ${themeColors.primary};
            box-shadow: 0 18px 35px rgba(16, 24, 40, 0.2);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          .launcher:hover {
            transform: translateY(-2px);
            box-shadow: 0 24px 42px rgba(16, 24, 40, 0.24);
          }

          .launcher img,
          .brand-icon {
            width: 28px;
            height: 28px;
            object-fit: contain;
          }

          .panel {
            width: ${width}px;
            height: ${height}px;
            display: grid;
            grid-template-rows: auto 1fr auto;
            overflow: hidden;
            border: 1px solid ${themeColors.border};
            border-radius: 22px;
            background: ${themeColors.surface};
            box-shadow: 0 24px 60px rgba(16, 24, 40, 0.18);
          }

          .hidden {
            display: none;
          }

          .header {
            padding: 16px 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            background: linear-gradient(180deg, ${themeColors.surface} 0%, ${themeColors.background} 100%);
            border-bottom: 1px solid ${themeColors.border};
          }

          .header-copy {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
          }

          .title-wrap {
            min-width: 0;
          }

          .title {
            font-size: 15px;
            font-weight: 700;
            margin: 0;
          }

          .subtitle {
            font-size: 12px;
            color: ${themeColors.muted};
            margin: 2px 0 0;
          }

          .icon-chip,
          .icon-button {
            border-radius: 999px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .icon-chip {
            width: 40px;
            height: 40px;
            background: ${themeColors.primary};
          }

          .icon-button {
            width: 36px;
            height: 36px;
            border: 1px solid ${themeColors.border};
            background: ${themeColors.surface};
            color: ${themeColors.text};
            cursor: pointer;
            font-size: 18px;
          }

          .messages {
            padding: 18px;
            overflow-y: auto;
            background: ${themeColors.background};
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .message {
            max-width: 82%;
            padding: 12px 14px;
            border-radius: 18px;
            line-height: 1.45;
            font-size: 14px;
            white-space: pre-wrap;
            word-break: break-word;
          }

          .message-user {
            align-self: end;
            background: ${themeColors.userBubble};
            color: ${themeColors.userText};
            border-bottom-right-radius: 6px;
          }

          .message-assistant {
            align-self: start;
            background: ${themeColors.botBubble};
            color: ${themeColors.botText};
            border-bottom-left-radius: 6px;
          }

          .composer {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 10px;
            padding: 16px;
            border-top: 1px solid ${themeColors.border};
            background: ${themeColors.surface};
          }

          .input {
            width: 100%;
            box-sizing: border-box;
            padding: 12px 14px;
            border-radius: 14px;
            border: 1px solid ${themeColors.border};
            font-size: 14px;
            outline: none;
            background: #fff;
            color: ${themeColors.text};
          }

          .input:focus {
            border-color: ${themeColors.primary};
            box-shadow: 0 0 0 3px rgba(22, 66, 60, 0.12);
          }

          .send {
            border: 0;
            border-radius: 14px;
            padding: 0 18px;
            font-size: 14px;
            font-weight: 700;
            color: ${themeColors.userText};
            background: ${themeColors.primary};
            cursor: pointer;
          }

          .send:disabled,
          .input:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          @media (max-width: 480px) {
            .chatbubble-root {
              right: 12px;
              left: 12px;
              bottom: 12px;
            }

            .panel {
              width: min(100%, 100vw - 24px);
              height: min(${height}px, 75vh);
            }

            .launcher {
              margin-left: auto;
            }
          }
        </style>
        <div class="chatbubble-root">
          <button class="launcher" type="button" aria-label="${this.escapeAttribute(this.config.launcherAriaLabel)}">
            <img alt="Chat icon" src="${this.escapeAttribute(iconUrl)}" />
          </button>
          <section class="panel" aria-label="${this.escapeAttribute(title)}">
            <div class="header">
              <div class="header-copy">
                <div class="icon-chip">
                  <img class="brand-icon" alt="Chat icon" src="${this.escapeAttribute(iconUrl)}" />
                </div>
                <div class="title-wrap">
                  <p class="title">${this.escapeHtml(title)}</p>
                  <p class="subtitle">Chat with your assistant</p>
                </div>
              </div>
              <button class="icon-button minimize" type="button" aria-label="${this.escapeAttribute(this.config.minimizeAriaLabel)}">−</button>
            </div>
            <div class="messages" role="log" aria-live="polite"></div>
            <form class="composer">
              <input class="input" type="text" placeholder="${this.escapeAttribute(placeholder)}" />
              <button class="send" type="submit">${this.escapeHtml(sendLabel)}</button>
            </form>
          </section>
        </div>
      `;

      this.root = this.shadowRoot.querySelector('.chatbubble-root');
      this.launcherButton = this.shadowRoot.querySelector('.launcher');
      this.panel = this.shadowRoot.querySelector('.panel');
      this.messagesElement = this.shadowRoot.querySelector('.messages');
      this.form = this.shadowRoot.querySelector('.composer');
      this.input = this.shadowRoot.querySelector('.input');
      this.sendButton = this.shadowRoot.querySelector('.send');
      this.minimizeButton = this.shadowRoot.querySelector('.minimize');

      this.launcherButton.addEventListener('click', () => this.open());
      this.minimizeButton.addEventListener('click', () => this.close());
      this.form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handleSubmit();
      });

      this.syncVisibility();
    }

    escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    escapeAttribute(value) {
      return this.escapeHtml(value);
    }

    syncVisibility() {
      this.panel.classList.toggle('hidden', !this.isOpen);
      this.launcherButton.classList.toggle('hidden', this.isOpen);

      if (this.isOpen) {
        requestAnimationFrame(() => {
          this.input.focus();
          this.scrollMessages();
        });
      }
    }

    open() {
      this.isOpen = true;
      this.syncVisibility();
    }

    close() {
      this.isOpen = false;
      this.syncVisibility();
    }

    addMessage(role, text) {
      const normalizedText = typeof text === 'string' ? text : String(text);
      const entry = { role, text: normalizedText };
      this.history.push(entry);

      const message = document.createElement('div');
      message.className = `message message-${role}`;
      message.textContent = normalizedText;
      this.messagesElement.appendChild(message);
      this.scrollMessages();
      return entry;
    }

    scrollMessages() {
      this.messagesElement.scrollTop = this.messagesElement.scrollHeight;
    }

    setSending(isSending) {
      this.isSending = isSending;
      this.input.disabled = isSending;
      this.sendButton.disabled = isSending;
      this.sendButton.textContent = isSending ? 'Sending...' : this.config.sendLabel;
    }

    async handleSubmit() {
      const text = this.input.value.trim();
      if (!text || this.isSending) {
        return;
      }

      this.input.value = '';
      this.addMessage('user', text);

      if (typeof this.config.onMessageSent === 'function') {
        this.config.onMessageSent(text, this.history.slice());
      }

      this.setSending(true);

      try {
        const reply = await this.sendMessage(text);
        this.addMessage('assistant', reply);

        if (typeof this.config.onResponse === 'function') {
          this.config.onResponse(reply, this.history.slice());
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Request failed.';
        this.addMessage('assistant', `Sorry, something went wrong. ${message}`);

        if (typeof this.config.onError === 'function') {
          this.config.onError(error);
        }
      } finally {
        this.setSending(false);
      }
    }

    async sendMessage(text) {
      const payload = typeof this.config.buildPayload === 'function'
        ? this.config.buildPayload(text, this.history.slice())
        : { message: text, history: this.history.slice() };

      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: this.config.headers,
        body: JSON.stringify(payload),
        ...this.config.fetchOptions
      });

      if (!response.ok) {
        throw new Error(`Endpoint returned ${response.status}`);
      }

      if (typeof this.config.responseParser === 'function') {
        return this.config.responseParser(response, payload);
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await response.json();
        return extractReply(data);
      }

      return response.text();
    }
  }

  window.ChatBubbleWidget = {
    create(config) {
      return new ChatBubble(config);
    },
    ChatBubble
  };
})();