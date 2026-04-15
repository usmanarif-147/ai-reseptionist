(function() {
  'use strict';

  var script = document.currentScript;
  var businessId = script && script.getAttribute('data-business-id');
  if (!businessId) return;

  var API_BASE = script.src.replace('/widget.js', '');
  var primaryColor = '#2563eb';
  var sessionId = sessionStorage.getItem('ai-widget-session-' + businessId) || null;
  var intentKey = 'ai-widget-intent-' + businessId;
  var currentIntent = localStorage.getItem(intentKey) || null;

  // --- Visitor ID ---
  var visitorKey = 'ai-widget-visitor-' + businessId;
  var visitorId = localStorage.getItem(visitorKey);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(visitorKey, visitorId);
  }
  // Fire-and-forget ping
  fetch(API_BASE + '/api/widget/' + businessId + '/visitor-ping?visitor_id=' + visitorId)
    .catch(function() {}); // silent — never block UI

  // --- Return visitor check ---
  var emailKey = 'ai-widget-email-' + businessId;
  var storedEmail = localStorage.getItem(emailKey);

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
    '#ai-widget-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; }',
    '#ai-widget-title { font-size: 16px; font-weight: 600; }',
    '#ai-widget-close { background: transparent; border: none; color: #fff; font-size: 20px; cursor: pointer; padding: 0 4px; line-height: 1; }',
    '#ai-widget-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }',
    '#ai-widget-messages .ai-widget-msg-user { align-self: flex-end; background: var(--ai-widget-primary, #2563eb); color: #fff; padding: 8px 14px; border-radius: 16px 16px 4px 16px; max-width: 80%; word-wrap: break-word; font-size: 14px; line-height: 1.4; }',
    '#ai-widget-messages .ai-widget-msg-bot { align-self: flex-start; background: #f3f4f6; color: #1f2937; padding: 8px 14px; border-radius: 16px 16px 16px 4px; max-width: 80%; word-wrap: break-word; font-size: 14px; line-height: 1.4; white-space: pre-wrap; }',
    '#ai-widget-input-row { padding: 12px; display: flex; gap: 8px; border-top: 1px solid #e5e7eb; flex-shrink: 0; }',
    '#ai-widget-input { flex: 1; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; font-family: inherit; }',
    '#ai-widget-input:focus { border-color: var(--ai-widget-primary, #2563eb); box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }',
    '#ai-widget-send { background: var(--ai-widget-primary, #2563eb); color: #fff; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-size: 14px; font-family: inherit; }',
    '#ai-widget-send:disabled, #ai-widget-input:disabled { opacity: 0.6; cursor: not-allowed; }',
    // Intent selection styles
    '.ai-widget-intent-wrap { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 20px 20px 16px; gap: 10px; }',
    '.ai-widget-intent-heading { text-align: center; margin-bottom: 4px; }',
    '.ai-widget-intent-label { font-size: 16px; font-weight: 700; color: #111827; display: block; }',
    '.ai-widget-intent-sublabel { font-size: 13px; color: #6b7280; margin-top: 2px; display: block; }',
    '.ai-widget-intent-btn { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; border: 1.5px solid #e5e7eb; border-radius: 10px; background: #fff; color: #1f2937; font-size: 14px; font-family: inherit; cursor: pointer; text-align: left; transition: border-color 0.15s, background 0.15s, box-shadow 0.15s; }',
    '.ai-widget-intent-btn:hover { border-color: var(--ai-widget-primary, #2563eb); background: #f5f8ff; box-shadow: 0 1px 4px rgba(37,99,235,0.08); }',
    '.ai-widget-intent-icon { flex-shrink: 0; width: 36px; height: 36px; border-radius: 8px; background: rgba(37,99,235,0.08); display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; }',
    '.ai-widget-intent-text { flex: 1; }',
    '.ai-widget-intent-name { display: block; font-size: 13px; font-weight: 600; color: #1f2937; }',
    '.ai-widget-intent-desc { display: block; font-size: 12px; color: #6b7280; margin-top: 1px; }',
    '.ai-widget-intent-arrow { color: #9ca3af; font-size: 16px; flex-shrink: 0; }',
    '.ai-widget-powered { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 4px; }',
    // Pre-chat form styles
    '.ai-widget-form-wrap { flex: 1; overflow-y: auto; padding: 16px 20px 20px; }',
    '.ai-widget-form-back { background: none; border: none; padding: 0; font-size: 12px; color: #6b7280; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 4px; margin-bottom: 12px; }',
    '.ai-widget-form-back:hover { color: #374151; }',
    '.ai-widget-form-title { font-size: 15px; font-weight: 600; color: #1f2937; margin-bottom: 4px; }',
    '.ai-widget-form-subtitle { font-size: 12px; color: #6b7280; margin-bottom: 16px; }',
    '.ai-widget-form-group { margin-bottom: 12px; }',
    '.ai-widget-form-label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 4px; }',
    '.ai-widget-form-label .req { color: #ef4444; margin-left: 2px; }',
    '.ai-widget-form-input { width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; font-size: 14px; font-family: inherit; outline: none; }',
    '.ai-widget-form-input:focus { border-color: var(--ai-widget-primary, #2563eb); box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }',
    '.ai-widget-form-input.error { border-color: #ef4444; }',
    '.ai-widget-form-error { font-size: 12px; color: #ef4444; margin-top: 2px; }',
    '.ai-widget-form-submit { display: block; width: 100%; margin-top: 16px; padding: 10px 16px; border: none; border-radius: 8px; background: var(--ai-widget-primary, #2563eb); color: #fff; font-size: 14px; font-weight: 500; font-family: inherit; cursor: pointer; }',
    '.ai-widget-form-submit:disabled { opacity: 0.6; cursor: not-allowed; }'
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
      '<div id="ai-widget-body">',
        '<div id="ai-widget-messages"></div>',
        '<div id="ai-widget-input-row">',
          '<input id="ai-widget-input" type="text" placeholder="Type a message..." aria-label="Type your message" autocomplete="off"/>',
          '<button id="ai-widget-send">Send</button>',
        '</div>',
      '</div>',
    '</div>'
  ].join('');
  document.body.appendChild(root);

  // --- Element references ---
  var btn = document.getElementById('ai-widget-btn');
  var popup = document.getElementById('ai-widget-popup');
  var closeBtn = document.getElementById('ai-widget-close');
  var bodyEl = document.getElementById('ai-widget-body');
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

  function showChatUI() {
    messagesEl.style.display = 'flex';
    document.getElementById('ai-widget-input-row').style.display = 'flex';
  }

  function hideChatUI() {
    messagesEl.style.display = 'none';
    document.getElementById('ai-widget-input-row').style.display = 'none';
  }

  // --- Intent Selection ---
  function showIntentSelection() {
    hideChatUI();
    // Remove any existing intent/form screens
    var existing = document.getElementById('ai-widget-intent');
    if (existing) existing.remove();
    existing = document.getElementById('ai-widget-prechat');
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.id = 'ai-widget-intent';
    wrap.className = 'ai-widget-intent-wrap';
    wrap.innerHTML = [
      '<div class="ai-widget-intent-heading">',
        '<span class="ai-widget-intent-label">How can we help you?</span>',
        '<span class="ai-widget-intent-sublabel">Select an option to get started</span>',
      '</div>',
      '<button class="ai-widget-intent-btn" data-intent="basic_information">',
        '<span class="ai-widget-intent-icon">💬</span>',
        '<span class="ai-widget-intent-text">',
          '<span class="ai-widget-intent-name">Basic Information</span>',
          '<span class="ai-widget-intent-desc">Services, hours, pricing & more</span>',
        '</span>',
        '<span class="ai-widget-intent-arrow">›</span>',
      '</button>',
      '<button class="ai-widget-intent-btn" data-intent="book_appointment">',
        '<span class="ai-widget-intent-icon">📅</span>',
        '<span class="ai-widget-intent-text">',
          '<span class="ai-widget-intent-name">Book an Appointment</span>',
          '<span class="ai-widget-intent-desc">Schedule a new appointment</span>',
        '</span>',
        '<span class="ai-widget-intent-arrow">›</span>',
      '</button>',
      '<button class="ai-widget-intent-btn" data-intent="appointment_details">',
        '<span class="ai-widget-intent-icon">🔍</span>',
        '<span class="ai-widget-intent-text">',
          '<span class="ai-widget-intent-name">Appointment Details</span>',
          '<span class="ai-widget-intent-desc">Check an existing appointment</span>',
        '</span>',
        '<span class="ai-widget-intent-arrow">›</span>',
      '</button>',
      '<div class="ai-widget-powered">Powered by AI Receptionist</div>',
    ].join('');
    bodyEl.insertBefore(wrap, messagesEl);

    var buttons = wrap.querySelectorAll('.ai-widget-intent-btn');
    buttons.forEach(function(b) {
      b.addEventListener('click', function() {
        currentIntent = b.getAttribute('data-intent');
        localStorage.setItem(intentKey, currentIntent);
        showPreChatForm();
      });
    });
  }

  // --- Pre-chat Form ---
  function showPreChatForm() {
    // Remove intent screen
    var intentEl = document.getElementById('ai-widget-intent');
    if (intentEl) intentEl.remove();
    var existing = document.getElementById('ai-widget-prechat');
    if (existing) existing.remove();

    hideChatUI();

    var showApptField = currentIntent === 'appointment_details';

    var wrap = document.createElement('div');
    wrap.id = 'ai-widget-prechat';
    wrap.className = 'ai-widget-form-wrap';
    wrap.innerHTML = [
      '<button class="ai-widget-form-back" id="ai-pcf-back">&#8592; Back</button>',
      '<div class="ai-widget-form-title">Just a few details</div>',
      '<div class="ai-widget-form-subtitle">We\'ll remember you for next time</div>',
      '<div class="ai-widget-form-group">',
        '<label class="ai-widget-form-label">Email<span class="req">*</span></label>',
        '<input class="ai-widget-form-input" id="ai-pcf-email" type="email" placeholder="you@example.com" />',
        '<div class="ai-widget-form-error" id="ai-pcf-email-err"></div>',
      '</div>',
      '<div class="ai-widget-form-group">',
        '<label class="ai-widget-form-label">Name</label>',
        '<input class="ai-widget-form-input" id="ai-pcf-name" type="text" placeholder="Your name (optional)" />',
      '</div>',
      '<div class="ai-widget-form-group">',
        '<label class="ai-widget-form-label">Phone</label>',
        '<input class="ai-widget-form-input" id="ai-pcf-phone" type="tel" placeholder="Phone number (optional)" />',
      '</div>',
      showApptField ? [
        '<div class="ai-widget-form-group">',
          '<label class="ai-widget-form-label">Appointment Number<span class="req">*</span></label>',
          '<input class="ai-widget-form-input" id="ai-pcf-appt" type="text" placeholder="e.g. APT-12345" />',
          '<div class="ai-widget-form-error" id="ai-pcf-appt-err"></div>',
        '</div>',
      ].join('') : '',
      '<button class="ai-widget-form-submit" id="ai-pcf-submit">Start Chat</button>',
    ].join('');
    bodyEl.insertBefore(wrap, messagesEl);

    var backBtn = document.getElementById('ai-pcf-back');
    backBtn.addEventListener('click', function() {
      currentIntent = null;
      localStorage.removeItem(intentKey);
      var prechatEl = document.getElementById('ai-widget-prechat');
      if (prechatEl) prechatEl.remove();
      showIntentSelection();
    });

    var submitBtn = document.getElementById('ai-pcf-submit');
    submitBtn.addEventListener('click', handlePreChatSubmit);
  }

  function handlePreChatSubmit() {
    var emailInput = document.getElementById('ai-pcf-email');
    var nameInput = document.getElementById('ai-pcf-name');
    var phoneInput = document.getElementById('ai-pcf-phone');
    var apptInput = document.getElementById('ai-pcf-appt');
    var emailErr = document.getElementById('ai-pcf-email-err');
    var apptErr = document.getElementById('ai-pcf-appt-err');

    var email = emailInput.value.trim();
    var name = nameInput.value.trim();
    var phone = phoneInput.value.trim();
    var apptNumber = apptInput ? apptInput.value.trim() : '';

    // Reset errors
    emailInput.classList.remove('error');
    if (emailErr) emailErr.textContent = '';
    if (apptInput) apptInput.classList.remove('error');
    if (apptErr) apptErr.textContent = '';

    // Validate email
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var hasError = false;
    if (!email || !emailRegex.test(email)) {
      emailInput.classList.add('error');
      emailErr.textContent = 'Please enter a valid email address';
      hasError = true;
    }

    // Validate appointment number if required
    if (currentIntent === 'appointment_details' && !apptNumber) {
      apptInput.classList.add('error');
      apptErr.textContent = 'Appointment number is required';
      hasError = true;
    }

    if (hasError) return;

    var submitBtn = document.getElementById('ai-pcf-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Please wait...';

    var body = {
      email: email,
      name: name || null,
      phone: phone || null,
      visitor_id: visitorId,
      intent: currentIntent,
      session_id: null,
    };

    fetch(API_BASE + '/api/widget/' + businessId + '/customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function(data) {
        localStorage.setItem(emailKey, email);
        sessionStorage.setItem('ai-widget-customer-id-' + businessId, data.customer_id);
        openChat();
      })
      .catch(function() {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Start Chat';
        emailErr.textContent = 'Something went wrong. Please try again.';
      });
  }

  // --- Open Chat ---
  function openChat() {
    // Remove intent and prechat screens
    var intentEl = document.getElementById('ai-widget-intent');
    if (intentEl) intentEl.remove();
    var prechatEl = document.getElementById('ai-widget-prechat');
    if (prechatEl) prechatEl.remove();
    showChatUI();
  }

  // --- Config fetch ---
  var welcomeMessage = 'How can we help you today?';
  fetch(API_BASE + '/api/widget/' + businessId + '/config')
    .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function(config) {
      primaryColor = config.color || primaryColor;
      root.style.setProperty('--ai-widget-primary', primaryColor);
      welcomeMessage = config.welcome_message || welcomeMessage;
      btn.style.display = 'flex';

      // Decide initial screen based on return visitor status
      if (storedEmail) {
        // Return visitor — go straight to chat
        addMessage('bot', welcomeMessage);
        showChatUI();
      } else {
        // New visitor — will show intent selection when popup opens
        hideChatUI();
      }
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
      body: JSON.stringify({
        session_id: sessionId,
        message: userMsg,
        customer_id: sessionStorage.getItem('ai-widget-customer-id-' + businessId) || null,
        intent: currentIntent || null,
      })
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
  var popupFirstOpen = true;
  btn.addEventListener('click', function() {
    var isOpen = popup.style.display !== 'none';
    popup.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) {
      if (popupFirstOpen && !storedEmail) {
        // First open for new visitor — show intent selection
        showIntentSelection();
        popupFirstOpen = false;
      } else if (popupFirstOpen && storedEmail) {
        // Return visitor — chat is already visible, just focus input
        inputEl.focus();
        popupFirstOpen = false;
      } else {
        inputEl.focus();
      }
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
