(function() {
  'use strict';

  var script = document.currentScript;
  var businessId = script && script.getAttribute('data-business-id');
  if (!businessId) return;

  var API_BASE = script.src.replace('/widget.js', '');
  var primaryColor = '#2563eb';
  var sessionId = sessionStorage.getItem('ai-widget-session-' + businessId) || null;

  // --- Inject CSS ---
  var style = document.createElement('style');
  style.textContent = [
    '#ai-widget-root { position: fixed; bottom: 24px; right: 24px; z-index: 2147483647; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }',
    '#ai-widget-root * { box-sizing: border-box; margin: 0; padding: 0; }',
    '#ai-widget-btn { display: none; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 50%; background: var(--ai-widget-primary, #2563eb); color: #fff; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.15s ease; }',
    '#ai-widget-btn:hover { transform: scale(1.08); }',
    '#ai-widget-btn svg { width: 24px; height: 24px; fill: #fff; }',
    '#ai-widget-popup { position: fixed; bottom: 90px; right: 24px; width: 360px; max-width: calc(100vw - 32px); height: 500px; max-height: calc(100vh - 120px); background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.18); display: flex; flex-direction: column; overflow: hidden; }',
    '#ai-widget-header { background: var(--ai-widget-primary, #2563eb); color: #fff; padding: 16px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }',
    '#ai-widget-title { font-size: 16px; font-weight: 600; }',
    '#ai-widget-close { background: transparent; border: none; color: #fff; font-size: 20px; cursor: pointer; padding: 0 4px; line-height: 1; }',
    '#ai-widget-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }',
    '#ai-widget-messages .ai-widget-msg-user { align-self: flex-end; background: var(--ai-widget-primary, #2563eb); color: #fff; padding: 8px 14px; border-radius: 16px 16px 4px 16px; max-width: 80%; word-wrap: break-word; font-size: 14px; line-height: 1.4; }',
    '#ai-widget-messages .ai-widget-msg-bot { align-self: flex-start; background: #f3f4f6; color: #1f2937; padding: 8px 14px; border-radius: 16px 16px 16px 4px; max-width: 80%; word-wrap: break-word; font-size: 14px; line-height: 1.4; white-space: pre-wrap; }',
    '#ai-widget-input-row { padding: 12px; display: flex; gap: 8px; border-top: 1px solid #e5e7eb; flex-shrink: 0; }',
    '#ai-widget-input { flex: 1; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; font-family: inherit; }',
    '#ai-widget-input:focus { border-color: var(--ai-widget-primary, #2563eb); box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }',
    '#ai-widget-send { background: var(--ai-widget-primary, #2563eb); color: #fff; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-size: 14px; font-family: inherit; }',
    '#ai-widget-send:disabled, #ai-widget-input:disabled { opacity: 0.6; cursor: not-allowed; }'
  ].join('\n');
  document.head.appendChild(style);

  // --- Inject HTML ---
  var root = document.createElement('div');
  root.id = 'ai-widget-root';
  root.innerHTML = [
    '<button id="ai-widget-btn" aria-label="Open chat">',
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>',
    '</button>',
    '<div id="ai-widget-popup" aria-label="Chat with us" role="dialog" style="display:none">',
      '<div id="ai-widget-header">',
        '<span id="ai-widget-title">Chat with us</span>',
        '<button id="ai-widget-close" aria-label="Close chat">\u2715</button>',
      '</div>',
      '<div id="ai-widget-messages"></div>',
      '<div id="ai-widget-input-row">',
        '<input id="ai-widget-input" type="text" placeholder="Type a message..." aria-label="Type your message" autocomplete="off"/>',
        '<button id="ai-widget-send">Send</button>',
      '</div>',
    '</div>'
  ].join('');
  document.body.appendChild(root);

  // --- Element references ---
  var btn = document.getElementById('ai-widget-btn');
  var popup = document.getElementById('ai-widget-popup');
  var closeBtn = document.getElementById('ai-widget-close');
  var messagesEl = document.getElementById('ai-widget-messages');
  var inputEl = document.getElementById('ai-widget-input');
  var sendBtn = document.getElementById('ai-widget-send');

  // --- Helper functions ---
  function addMessage(role, text) {
    var div = document.createElement('div');
    div.className = role === 'user' ? 'ai-widget-msg-user' : 'ai-widget-msg-bot';
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setInputDisabled(disabled) {
    inputEl.disabled = disabled;
    sendBtn.disabled = disabled;
    if (!disabled) {
      inputEl.focus();
    }
  }

  // --- Config fetch ---
  fetch(API_BASE + '/api/widget/' + businessId + '/config')
    .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function(config) {
      primaryColor = config.color || primaryColor;
      root.style.setProperty('--ai-widget-primary', primaryColor);
      addMessage('bot', config.welcome_message || 'How can we help you today?');
      btn.style.display = 'flex';
    })
    .catch(function() {
      root.style.display = 'none';
    });

  // --- SSE chat ---
  function sendMessage(text) {
    var userMsg = text.trim();
    if (!userMsg) return;

    addMessage('user', userMsg);
    var botBubble = addMessage('bot', '');
    setInputDisabled(true);

    fetch(API_BASE + '/api/widget/' + businessId + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message: userMsg })
    }).then(function(response) {
      if (!response.ok) {
        throw new Error('Request failed');
      }
      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';

      function read() {
        reader.read().then(function(result) {
          if (result.done) {
            setInputDisabled(false);
            return;
          }
          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop();

          lines.forEach(function(line) {
            if (line.startsWith('data: ')) {
              try {
                var data = JSON.parse(line.slice(6));
                if (data.type === 'session') {
                  sessionId = data.session_id;
                  sessionStorage.setItem('ai-widget-session-' + businessId, sessionId);
                } else if (data.type === 'token') {
                  botBubble.textContent += data.token;
                  scrollToBottom();
                } else if (data.type === 'done') {
                  setInputDisabled(false);
                }
              } catch(e) { /* ignore malformed SSE data */ }
            }
          });
          read();
        }).catch(function() {
          botBubble.textContent = 'Sorry, something went wrong. Please try again.';
          setInputDisabled(false);
        });
      }
      read();
    }).catch(function() {
      botBubble.textContent = 'Sorry, something went wrong. Please try again.';
      setInputDisabled(false);
    });
  }

  // --- Event wiring ---
  btn.addEventListener('click', function() {
    var isOpen = popup.style.display !== 'none';
    popup.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) {
      inputEl.focus();
    }
  });

  closeBtn.addEventListener('click', function() {
    popup.style.display = 'none';
  });

  sendBtn.addEventListener('click', function() {
    sendMessage(inputEl.value);
    inputEl.value = '';
  });

  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage(inputEl.value);
      inputEl.value = '';
    }
  });
})();
