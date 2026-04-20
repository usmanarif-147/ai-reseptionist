(function() {
  'use strict';

  var script = document.currentScript;
  var businessId = script && script.getAttribute('data-business-id');
  if (!businessId) return;

  var API_BASE = script.src.replace('/widget.js', '');

  // Preview mode: activated by ?preview=1 on the host page. Stubs all backend calls, disables the
  // inactivity timer, and accepts postMessage commands from the parent frame for the dashboard's
  // Live Preview iframe. Flag is false on real customer sites, so production behavior is unchanged.
  var isPreview = false;
  try {
    isPreview = new URLSearchParams(window.location.search).get('preview') === '1';
  } catch (e) { isPreview = false; }
  var primaryColor = '#2563eb';
  var sessionId = localStorage.getItem('ai-widget-session-' + businessId) || null;
  var tooltipDismissedKey = 'ai-widget-tooltip-dismissed-' + businessId;
  var lastMsgTimeKey = 'ai-widget-last-msg-' + businessId;
  var sessionEnded = false;
  var sessionEndReason = null; // 'ended' or 'expired'
  var contactCardDismissed = false; // visitor hit "Not now"; don't re-render card this session

  // --- Appearance config (populated from API, defaults here) ---
  var cfg = {
    tooltip_enabled: true,
    tooltip_text: 'Ask us anything \u2014 we reply instantly 24/7',
    tooltip_bg_color: '#FFFFFF',
    tooltip_text_color: '#1F2937',
    tooltip_position: 'side',
    avatar_enabled: true,
    avatar_selection: 'robot',
    header_show_status: true,
    header_title: 'Chat with us',
    header_subtitle: 'We reply instantly',
    typing_indicator_style: 'animated_dots',
    session_ended_enabled: true,
    session_ended_icon: '\uD83D\uDC4B',
    session_ended_title: 'Chat Ended',
    session_ended_message: 'Thank you for reaching out! We hope we answered all your questions.',
    session_expired_enabled: true,
    session_expired_icon: '\u23F0',
    session_expired_title: 'Session Expired',
    session_expired_message: 'Your session ended due to inactivity. Start a new chat anytime.',
    feedback_enabled: true,
    feedback_prompt_title: 'How was your experience?',
    feedback_note_placeholder: 'Leave a message for the business (optional)',
  };

  // Avatar map
  var AVATAR_MAP = {
    robot: '\uD83E\uDD16',
    wave: '\uD83D\uDC4B',
    sparkles: '\u2728',
    headset: '\uD83C\uDFA7',
    star: '\u2B50',
    heart: '\u2764\uFE0F',
    lightning: '\u26A1',
    speech: '\uD83D\uDCAC',
    bulb: '\uD83D\uDCA1',
    check: '\u2705',
    smile: '\uD83D\uDE0A',
    rocket: '\uD83D\uDE80',
  };

  function getAvatarEmoji() {
    return AVATAR_MAP[cfg.avatar_selection] || AVATAR_MAP.robot;
  }

  // --- Inactivity timer ---
  var inactivityTimer = null;
  var INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  // --- Visitor ID ---
  var visitorKey = 'ai-widget-visitor-' + businessId;
  var visitorId = localStorage.getItem(visitorKey);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(visitorKey, visitorId);
  }
  // Fire-and-forget ping (skipped in preview mode — no backend should be touched)
  if (!isPreview) {
    fetch(API_BASE + '/api/widget/' + businessId + '/visitor-ping?visitor_id=' + visitorId)
      .catch(function() {}); // silent — never block UI
  }

  // --- Return visitor check ---
  var emailKey = 'ai-widget-email-' + businessId;
  var storedEmail = localStorage.getItem(emailKey);

  // --- Inject CSS ---
  var style = document.createElement('style');
  style.textContent = [
    // Root & reset
    '#ai-widget-root { position: fixed; bottom: 20px; right: 20px; z-index: 2147483647; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }',
    '#ai-widget-root * { box-sizing: border-box; }',
    // Launcher button
    '#ai-widget-btn { display: none; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 50%; background: var(--ai-widget-primary, #2563eb); color: #fff; border: none; cursor: pointer; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1); transition: transform 0.15s ease, box-shadow 0.15s ease; position: relative; }',
    '#ai-widget-btn:hover { transform: scale(1.07); box-shadow: 0 6px 20px rgba(0,0,0,0.25); animation-play-state: paused; }',
    '#ai-widget-btn svg { width: 24px; height: 24px; fill: #fff; }',
    // Tooltip — side position (default)
    '@keyframes ai-widget-tooltip-in { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }',
    '@keyframes ai-widget-tooltip-in-above { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }',
    '#ai-widget-tooltip { position: fixed; border-radius: 8px; padding: 8px 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); font-size: 13px; max-width: 220px; line-height: 1.4; display: flex; align-items: flex-start; gap: 10px; }',
    '#ai-widget-tooltip.tooltip-side { bottom: 28px; right: 84px; animation: ai-widget-tooltip-in 0.3s ease 3s both; }',
    '#ai-widget-tooltip.tooltip-side::after { content: ""; position: absolute; right: -7px; top: 50%; transform: translateY(-50%); border: 7px solid transparent; border-right: none; }',
    '#ai-widget-tooltip.tooltip-above { bottom: 82px; right: 20px; animation: ai-widget-tooltip-in-above 0.3s ease 3s both; }',
    '#ai-widget-tooltip.tooltip-above::after { content: ""; position: absolute; bottom: -7px; right: 20px; border: 7px solid transparent; border-bottom: none; }',
    '#ai-widget-tooltip-text { flex: 1; }',
    '#ai-widget-tooltip-close { background: none; border: none; cursor: pointer; font-size: 16px; padding: 0; flex-shrink: 0; line-height: 1; opacity: 0.6; }',
    '#ai-widget-tooltip-close:hover { opacity: 1; }',
    // Popup shell
    '#ai-widget-popup { position: fixed; bottom: 84px; right: 20px; width: 348px; max-width: calc(100vw - 40px); height: 350px; max-height: calc(100vh - 110px); background: #fff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; display: flex; flex-direction: column; overflow: hidden; }',
    // Header
    '#ai-widget-header { background: var(--ai-widget-primary, #2563eb); color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }',
    '#ai-widget-header-info { display: flex; flex-direction: column; gap: 2px; }',
    '#ai-widget-title { font-size: 14px; font-weight: 700; line-height: 1.2; }',
    '#ai-widget-header-sub { font-size: 11px; opacity: 0.8; display: flex; align-items: center; gap: 4px; }',
    '#ai-widget-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; display: inline-block; }',
    '#ai-widget-close { background: rgba(255,255,255,0.15); border: none; color: #fff; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s; }',
    '#ai-widget-close:hover { background: rgba(255,255,255,0.25); }',
    // Body
    '#ai-widget-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; max-height: 260px; }',
    // Messages
    '#ai-widget-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }',
    '.ai-widget-msg-row { display: flex; align-items: flex-end; gap: 8px; }',
    '.ai-widget-msg-row.bot-row { justify-content: flex-start; }',
    '.ai-widget-msg-row.user-row { justify-content: flex-end; }',
    '.ai-widget-msg-avatar { width: 24px; height: 24px; border-radius: 50%; background: var(--ai-widget-primary, #2563eb); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 12px; }',
    '.ai-widget-msg-user { background: var(--ai-widget-primary, #2563eb); color: #fff; padding: 8px 12px; border-radius: 12px 12px 4px 12px; max-width: 200px; word-wrap: break-word; font-size: 12px; line-height: 1.5; }',
    '.ai-widget-msg-bot { background: #f3f4f6; color: #374151; padding: 8px 12px; border-radius: 12px 12px 12px 4px; max-width: 200px; word-wrap: break-word; font-size: 12px; line-height: 1.5; white-space: pre-wrap; }',
    // Typing indicator
    '@keyframes ai-widget-dot-bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-4px); } }',
    '.ai-widget-typing-dots { display: inline-flex; gap: 2px; align-items: center; padding: 2px 0; }',
    '.ai-widget-typing-dots span { width: 6px; height: 6px; border-radius: 50%; background: #9ca3af; display: inline-block; animation: ai-widget-dot-bounce 1.2s ease-in-out infinite; }',
    '.ai-widget-typing-dots span:nth-child(2) { animation-delay: 0.15s; }',
    '.ai-widget-typing-dots span:nth-child(3) { animation-delay: 0.3s; }',
    // Input row — pill input + circular icon button
    '#ai-widget-input-row { padding: 10px 12px; display: flex; gap: 8px; border-top: 1px solid #f0f0f0; flex-shrink: 0; align-items: center; }',
    '#ai-widget-input { flex: 1; border: 1px solid #e5e7eb; border-radius: 9999px; padding: 6px 12px; font-size: 12px; outline: none; font-family: inherit; background: #f9fafb; transition: border-color 0.15s, background 0.15s; }',
    '#ai-widget-input:focus { border-color: var(--ai-widget-primary, #2563eb); background: #fff; }',
    '#ai-widget-send { background: var(--ai-widget-primary, #2563eb); color: #fff; border: none; border-radius: 50%; width: 32px; height: 32px; min-width: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity 0.15s; }',
    '#ai-widget-send:hover { opacity: 0.88; }',
    '#ai-widget-send svg { width: 14px; height: 14px; fill: #fff; }',
    '#ai-widget-send:disabled, #ai-widget-input:disabled { opacity: 0.45; cursor: not-allowed; }',
    // Inline contact-request card (rendered mid-chat when AI emits [REQUEST_CONTACT])
    '.ai-widget-contact-card { margin: 4px 0 4px 32px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }',
    '.ai-widget-contact-title { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 2px; }',
    '.ai-widget-contact-subtitle { font-size: 11px; color: #6b7280; margin-bottom: 10px; }',
    '.ai-widget-form-group { margin-bottom: 8px; }',
    '.ai-widget-form-label { display: block; font-size: 11px; font-weight: 600; color: #4b5563; margin-bottom: 4px; }',
    '.ai-widget-form-label .req { color: #ef4444; margin-left: 1px; }',
    '.ai-widget-form-input { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 10px; font-size: 12px; font-family: inherit; outline: none; background: #fff; color: #1f2937; transition: border-color 0.15s; }',
    '.ai-widget-form-input:focus { border-color: var(--ai-widget-primary, #2563eb); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }',
    '.ai-widget-form-input.error { border-color: #ef4444; }',
    '.ai-widget-form-error { font-size: 11px; color: #ef4444; margin-top: 3px; }',
    '.ai-widget-contact-buttons { display: flex; gap: 8px; margin-top: 10px; }',
    '.ai-widget-contact-submit { flex: 1; padding: 7px 12px; border: none; border-radius: 8px; background: var(--ai-widget-primary, #2563eb); color: #fff; font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; transition: opacity 0.15s; }',
    '.ai-widget-contact-submit:hover { opacity: 0.9; }',
    '.ai-widget-contact-submit:disabled { opacity: 0.5; cursor: not-allowed; }',
    '.ai-widget-contact-skip { padding: 7px 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; color: #4b5563; font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 0.15s; }',
    '.ai-widget-contact-skip:hover { background: #f9fafb; }',
    // Session end screen
    '.ai-widget-session-end { padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }',
    '.ai-widget-session-end-icon { font-size: 30px; }',
    '.ai-widget-session-end-title { font-size: 14px; font-weight: 700; color: #111827; }',
    '.ai-widget-session-end-msg { font-size: 12px; color: #6b7280; line-height: 1.5; }',
    '.ai-widget-session-end-btn { margin-top: 8px; padding: 8px 16px; border: none; border-radius: 8px; background: var(--ai-widget-primary, #2563eb); color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity 0.15s; }',
    '.ai-widget-session-end-btn:hover { opacity: 0.9; }'
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
        '<div id="ai-widget-header-info"><span id="ai-widget-title">Chat with us</span><span id="ai-widget-header-sub"><span id="ai-widget-status-dot"></span> We reply instantly</span></div>',
        '<button id="ai-widget-close" aria-label="Close chat">\u2715</button>',
      '</div>',
      '<div id="ai-widget-body">',
        '<div id="ai-widget-messages"></div>',
        '<div id="ai-widget-input-row">',
          '<input id="ai-widget-input" type="text" placeholder="Type a message..." aria-label="Type your message" autocomplete="off"/>',
          '<button id="ai-widget-send" aria-label="Send message"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>',
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
    var row = document.createElement('div');
    row.className = 'ai-widget-msg-row ' + (role === 'user' ? 'user-row' : 'bot-row');
    var bubble = document.createElement('div');
    bubble.className = role === 'user' ? 'ai-widget-msg-user' : 'ai-widget-msg-bot';
    bubble.textContent = text;
    if (role === 'bot' && cfg.avatar_enabled) {
      var avatar = document.createElement('div');
      avatar.className = 'ai-widget-msg-avatar';
      avatar.textContent = getAvatarEmoji();
      row.appendChild(avatar);
    }
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollToBottom();
    return bubble;
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

  // --- Apply header config ---
  function applyHeaderConfig() {
    var titleEl = document.getElementById('ai-widget-title');
    var subEl = document.getElementById('ai-widget-header-sub');
    var dotEl = document.getElementById('ai-widget-status-dot');

    if (titleEl) titleEl.textContent = cfg.header_title;
    if (subEl) {
      if (cfg.header_show_status && dotEl) {
        dotEl.style.display = 'inline-block';
      } else if (dotEl) {
        dotEl.style.display = 'none';
      }
      // Set subtitle text (keep the dot element)
      var textNode = subEl.lastChild;
      if (textNode && textNode.nodeType === 3) {
        textNode.textContent = ' ' + cfg.header_subtitle;
      }
    }
  }

  // --- 10-minute resume check ---
  function canResumeSession() {
    var lastMsgTime = localStorage.getItem(lastMsgTimeKey);
    return sessionId && lastMsgTime && (Date.now() - parseInt(lastMsgTime)) < 10 * 60 * 1000;
  }

  // --- Escape HTML helper ---
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Inline contact-request card ---
  // Rendered mid-chat when the server emits { type: 'request_contact' }.
  // Suppressed if the visitor already has a stored email (returning visitor) or has
  // already dismissed the card this session.
  function showInlineContactCard() {
    if (isPreview) return;
    if (localStorage.getItem(emailKey)) return; // returning visitor — never ask
    if (contactCardDismissed) return;            // visitor already said "Not now"
    if (document.getElementById('ai-widget-contact-card')) return; // already rendered

    var card = document.createElement('div');
    card.id = 'ai-widget-contact-card';
    card.className = 'ai-widget-contact-card';
    card.innerHTML = [
      '<div class="ai-widget-contact-title">To continue, we just need your email</div>',
      '<div class="ai-widget-contact-subtitle">We\'ll use this to confirm your booking.</div>',
      '<div class="ai-widget-form-group">',
        '<label class="ai-widget-form-label">Email<span class="req">*</span></label>',
        '<input class="ai-widget-form-input" id="ai-cc-email" type="email" placeholder="you@example.com" />',
        '<div class="ai-widget-form-error" id="ai-cc-email-err"></div>',
      '</div>',
      '<div class="ai-widget-form-group">',
        '<label class="ai-widget-form-label">Name</label>',
        '<input class="ai-widget-form-input" id="ai-cc-name" type="text" placeholder="Your name (optional)" />',
      '</div>',
      '<div class="ai-widget-form-group">',
        '<label class="ai-widget-form-label">Phone</label>',
        '<input class="ai-widget-form-input" id="ai-cc-phone" type="tel" placeholder="Phone number (optional)" />',
      '</div>',
      '<div class="ai-widget-contact-buttons">',
        '<button class="ai-widget-contact-submit" id="ai-cc-submit">Submit</button>',
        '<button class="ai-widget-contact-skip" id="ai-cc-skip">Not now</button>',
      '</div>',
    ].join('');

    messagesEl.appendChild(card);
    scrollToBottom();

    document.getElementById('ai-cc-submit').addEventListener('click', handleInlineContactSubmit);
    document.getElementById('ai-cc-skip').addEventListener('click', function() {
      contactCardDismissed = true;
      card.remove();
      setInputDisabled(false);
    });
  }

  function handleInlineContactSubmit() {
    var emailInput = document.getElementById('ai-cc-email');
    var nameInput = document.getElementById('ai-cc-name');
    var phoneInput = document.getElementById('ai-cc-phone');
    var emailErr = document.getElementById('ai-cc-email-err');
    var submitBtn = document.getElementById('ai-cc-submit');

    var email = emailInput.value.trim();
    var name = nameInput.value.trim();
    var phone = phoneInput.value.trim();

    emailInput.classList.remove('error');
    emailErr.textContent = '';

    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      emailInput.classList.add('error');
      emailErr.textContent = 'Please enter a valid email address';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Please wait...';

    fetch(API_BASE + '/api/widget/' + businessId + '/customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        name: name || null,
        phone: phone || null,
        visitor_id: visitorId,
        session_id: sessionId,
        intent: null,
      }),
    })
      .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function(data) {
        localStorage.setItem(emailKey, email);
        sessionStorage.setItem('ai-widget-customer-id-' + businessId, data.customer_id);
        var card = document.getElementById('ai-widget-contact-card');
        if (card) card.remove();
        setInputDisabled(false);
      })
      .catch(function() {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
        emailErr.textContent = 'Something went wrong. Please try again.';
      });
  }

  // --- Open Chat ---
  function openChat() {
    var endEl = document.getElementById('ai-widget-session-end');
    if (endEl) endEl.remove();
    showChatUI();
    // Show welcome message if not already shown
    if (!welcomeShown) {
      addMessage('bot', welcomeMessage);
      welcomeShown = true;
    }
    // Start inactivity timer when chat opens
    startInactivityTimer();
    // Dismiss tooltip when chat opens
    var tipEl = document.getElementById('ai-widget-tooltip');
    if (tipEl) {
      sessionStorage.setItem(tooltipDismissedKey, '1');
      tipEl.remove();
    }
  }

  // --- Config fetch ---
  var welcomeMessage = 'How can we help you today?';
  var welcomeShown = false;

  // In preview mode we skip the /config network call and bootstrap with built-in defaults so the
  // widget renders immediately. The parent iframe will push the real settings via postMessage.
  var configPromise = isPreview
    ? Promise.resolve({})
    : fetch(API_BASE + '/api/widget/' + businessId + '/config')
        .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); });

  configPromise
    .then(function(config) {
      primaryColor = config.color || primaryColor;
      root.style.setProperty('--ai-widget-primary', primaryColor);
      welcomeMessage = config.welcome_message || welcomeMessage;

      // Apply all appearance config
      cfg.tooltip_enabled = config.tooltip_enabled ?? cfg.tooltip_enabled;
      cfg.tooltip_text = config.tooltip_text || cfg.tooltip_text;
      cfg.tooltip_bg_color = config.tooltip_bg_color || cfg.tooltip_bg_color;
      cfg.tooltip_text_color = config.tooltip_text_color || cfg.tooltip_text_color;
      cfg.tooltip_position = config.tooltip_position || cfg.tooltip_position;
      cfg.avatar_enabled = config.avatar_enabled ?? cfg.avatar_enabled;
      cfg.avatar_selection = config.avatar_selection || cfg.avatar_selection;
      cfg.header_show_status = config.header_show_status ?? cfg.header_show_status;
      cfg.header_title = config.header_title || cfg.header_title;
      cfg.header_subtitle = config.header_subtitle || cfg.header_subtitle;
      cfg.typing_indicator_style = config.typing_indicator_style || cfg.typing_indicator_style;
      cfg.session_ended_enabled = config.session_ended_enabled ?? cfg.session_ended_enabled;
      cfg.session_ended_icon = config.session_ended_icon || cfg.session_ended_icon;
      cfg.session_ended_title = config.session_ended_title || cfg.session_ended_title;
      cfg.session_ended_message = config.session_ended_message || cfg.session_ended_message;
      cfg.session_expired_enabled = config.session_expired_enabled ?? cfg.session_expired_enabled;
      cfg.session_expired_icon = config.session_expired_icon || cfg.session_expired_icon;
      cfg.session_expired_title = config.session_expired_title || cfg.session_expired_title;
      cfg.session_expired_message = config.session_expired_message || cfg.session_expired_message;
      cfg.feedback_enabled = config.feedback_enabled ?? cfg.feedback_enabled;
      cfg.feedback_prompt_title = config.feedback_prompt_title || cfg.feedback_prompt_title;
      cfg.feedback_note_placeholder = config.feedback_note_placeholder || cfg.feedback_note_placeholder;

      // Apply header config
      applyHeaderConfig();

      // Inject tooltip if enabled and not dismissed.
      // Preview mode skips this — the parent iframe drives tooltip rendering via postMessage
      // so toggling `tooltip_enabled` in the dashboard reflects instantly (including dismissal-free).
      var tooltipDismissed = sessionStorage.getItem(tooltipDismissedKey);
      if (!isPreview && cfg.tooltip_enabled && !tooltipDismissed) {
        var tip = document.createElement('div');
        tip.id = 'ai-widget-tooltip';
        tip.className = cfg.tooltip_position === 'above' ? 'tooltip-above' : 'tooltip-side';
        tip.style.backgroundColor = cfg.tooltip_bg_color;
        tip.style.color = cfg.tooltip_text_color;
        tip.innerHTML = '<span id="ai-widget-tooltip-text">' + escapeHtml(cfg.tooltip_text) + '</span>'
          + '<button id="ai-widget-tooltip-close" aria-label="Dismiss" style="color:' + cfg.tooltip_text_color + '">\u00D7</button>';
        // Set the arrow color to match tooltip background
        root.appendChild(tip);
        // Style the arrow after appending
        var arrow = tip.querySelector('::after');
        if (cfg.tooltip_position === 'above') {
          tip.style.setProperty('--arrow-color', cfg.tooltip_bg_color);
        }
        // Apply arrow color via inline style on a real element
        var arrowStyle = document.createElement('style');
        if (cfg.tooltip_position === 'above') {
          arrowStyle.textContent = '#ai-widget-tooltip.tooltip-above::after { border-top-color: ' + cfg.tooltip_bg_color + '; }';
        } else {
          arrowStyle.textContent = '#ai-widget-tooltip.tooltip-side::after { border-left-color: ' + cfg.tooltip_bg_color + '; }';
        }
        document.head.appendChild(arrowStyle);

        document.getElementById('ai-widget-tooltip-close').addEventListener('click', function() {
          sessionStorage.setItem(tooltipDismissedKey, '1');
          tip.remove();
        });
      }

      btn.style.display = 'flex';

      // Chat UI is the only opening surface — make it ready before the popup opens.
      showChatUI();
      // For 10-min resume: pre-load welcome message so it's there when the user reopens.
      if (canResumeSession() && !welcomeShown) {
        addMessage('bot', welcomeMessage);
        welcomeShown = true;
      }
    })
    .catch(function() {
      root.style.display = 'none';
    });

  // --- SSE chat ---
  function sendMessage(text) {
    var userMsg = text.trim();
    if (!userMsg || sessionEnded) return;

    addMessage('user', userMsg);

    // In preview mode, render a canned bot reply so bubble colors/spacing/avatar are visible
    // without any backend call. Skip the real SSE pipeline entirely.
    if (isPreview) {
      setInputDisabled(true);
      setTimeout(function() {
        addMessage('bot', 'This is a sample response from our AI.');
        setInputDisabled(false);
      }, 400);
      return;
    }

    // Show typing indicator based on config
    var typingBubble = null;
    if (cfg.typing_indicator_style !== 'disabled') {
      var typingRow = document.createElement('div');
      typingRow.className = 'ai-widget-msg-row bot-row';
      typingRow.id = 'ai-widget-typing';
      if (cfg.avatar_enabled) {
        var typingAvatar = document.createElement('div');
        typingAvatar.className = 'ai-widget-msg-avatar';
        typingAvatar.textContent = getAvatarEmoji();
        typingRow.appendChild(typingAvatar);
      }
      typingBubble = document.createElement('div');
      typingBubble.className = 'ai-widget-msg-bot';
      if (cfg.typing_indicator_style === 'animated_dots') {
        typingBubble.innerHTML = '<span class="ai-widget-typing-dots"><span></span><span></span><span></span></span>';
      } else {
        typingBubble.textContent = 'AI is typing...';
      }
      typingRow.appendChild(typingBubble);
      messagesEl.appendChild(typingRow);
      scrollToBottom();
    }

    setInputDisabled(true);

    fetch(API_BASE + '/api/widget/' + businessId + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        message: userMsg,
        customer_id: sessionStorage.getItem('ai-widget-customer-id-' + businessId) || null,
        known_customer: !!localStorage.getItem(emailKey),
      })
    }).then(function(response) {
      if (!response.ok) {
        throw new Error('Request failed');
      }

      // Remove typing indicator
      var typingEl = document.getElementById('ai-widget-typing');
      if (typingEl) typingEl.remove();

      var botBubble = addMessage('bot', '');
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
                  localStorage.setItem('ai-widget-session-' + businessId, sessionId);
                } else if (data.type === 'token') {
                  var cleanToken = data.token
                    .replace(/\s*\[END_CONVERSATION\]\s*/g, '')
                    .replace(/\s*\[REQUEST_CONTACT\]\s*/g, '');
                  if (cleanToken) {
                    botBubble.textContent += cleanToken;
                    scrollToBottom();
                  }
                } else if (data.type === 'request_contact') {
                  // Defensively strip marker from persisted bubble text, then render the inline card.
                  if (botBubble) {
                    botBubble.textContent = botBubble.textContent.replace(/\s*\[REQUEST_CONTACT\]\s*/g, '').trim();
                  }
                  setInputDisabled(true);
                  showInlineContactCard();
                } else if (data.type === 'end_conversation') {
                  // AI has detected end of conversation — strip any [END_CONVERSATION] marker
                  if (botBubble) {
                    botBubble.textContent = botBubble.textContent.replace(/\s*\[END_CONVERSATION\]\s*/g, '').trim();
                  }
                  localStorage.setItem(lastMsgTimeKey, Date.now().toString());
                  setTimeout(function() {
                    transitionToEndingState('ended');
                  }, 500);
                } else if (data.type === 'done') {
                  // Record last message time for 10-minute resume
                  localStorage.setItem(lastMsgTimeKey, Date.now().toString());
                  resetInactivityTimer();
                  setInputDisabled(false);
                }
              } catch(e) { /* ignore malformed SSE data */ }
            }
          });
          read();
        }).catch(function() {
          var typingEl = document.getElementById('ai-widget-typing');
          if (typingEl) typingEl.remove();
          botBubble.textContent = 'Sorry, something went wrong. Please try again.';
          setInputDisabled(false);
        });
      }
      read();
    }).catch(function() {
      var typingEl = document.getElementById('ai-widget-typing');
      if (typingEl) typingEl.remove();
      addMessage('bot', 'Sorry, something went wrong. Please try again.');
      setInputDisabled(false);
    });
  }

  // --- Inactivity timer functions ---
  function startInactivityTimer() {
    // Preview mode never auto-expires — the dashboard controls which screen is shown.
    if (isPreview) return;
    stopInactivityTimer();
    inactivityTimer = setTimeout(function() {
      endSessionDueToInactivity();
    }, INACTIVITY_TIMEOUT);
  }

  function resetInactivityTimer() {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    startInactivityTimer();
  }

  function stopInactivityTimer() {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
  }

  // Fire-and-forget session-end POST. In preview mode this is a silent no-op so the dashboard's
  // live preview never writes to the real DB. Returns a resolved promise so callers that chain
  // `.then()` continue to work identically.
  function postSessionEnd(payload) {
    if (isPreview) return Promise.resolve();
    return fetch(API_BASE + '/api/widget/' + businessId + '/session/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  function endSessionDueToInactivity() {
    postSessionEnd({
      session_id: sessionId,
      status: 'expired',
      feedback_rating: null,
      feedback_note: null
    }).catch(function() {});

    if (cfg.session_expired_enabled) {
      transitionToEndingState('expired');
    } else {
      // Just disable input and show a simple message
      addMessage('bot', 'This conversation has been automatically closed due to inactivity.');
      sessionEnded = true;
      sessionEndReason = 'expired';
      stopInactivityTimer();
      setInputDisabled(true);
      document.getElementById('ai-widget-input-row').style.display = 'none';
      showNewConversationButton();
    }
  }

  // --- Session ending state ---
  function transitionToEndingState(reason) {
    sessionEnded = true;
    sessionEndReason = reason;
    stopInactivityTimer();
    setInputDisabled(true);
    document.getElementById('ai-widget-input-row').style.display = 'none';

    var delay = reason === 'expired' ? 1000 : 500;

    // Check if feedback is enabled
    if (cfg.feedback_enabled) {
      setTimeout(function() {
        showFeedbackPrompt(reason);
      }, delay);
    } else {
      // Skip feedback, go straight to ending message or session end screen
      setTimeout(function() {
        postSessionEnd({
          session_id: sessionId,
          status: reason || 'ended',
          feedback_rating: null,
          feedback_note: null
        }).catch(function() {});
        showEndingMessage(reason);
      }, delay);
    }
  }

  function showFeedbackPrompt(reason) {
    var feedbackEl = document.createElement('div');
    feedbackEl.id = 'ai-widget-feedback';
    feedbackEl.style.cssText = 'padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;';

    var feedbackTitle = document.createElement('div');
    feedbackTitle.style.cssText = 'font-size: 14px; font-weight: 700; color: #1f2937; text-align: center;';
    feedbackTitle.textContent = cfg.feedback_prompt_title;

    var starsContainer = document.createElement('div');
    starsContainer.style.cssText = 'display: flex; gap: 12px; justify-content: center;';

    var selectedRating = 0;

    for (var i = 1; i <= 5; i++) {
      (function(star) {
        var starBtn = document.createElement('button');
        starBtn.style.cssText = 'background: none; border: none; font-size: 24px; cursor: pointer; color: #d1d5db; transition: color 0.15s; padding: 0;';
        starBtn.textContent = '\u2605';
        starBtn.setAttribute('data-star', star);

        starBtn.addEventListener('mouseover', function() {
          var allStars = starsContainer.querySelectorAll('button');
          allStars.forEach(function(s) {
            s.style.color = parseInt(s.getAttribute('data-star')) <= star ? primaryColor : '#d1d5db';
          });
        });

        starBtn.addEventListener('mouseout', function() {
          var allStars = starsContainer.querySelectorAll('button');
          allStars.forEach(function(s) {
            s.style.color = parseInt(s.getAttribute('data-star')) <= selectedRating ? primaryColor : '#d1d5db';
          });
        });

        starBtn.addEventListener('click', function() {
          selectedRating = star;
          var allStars = starsContainer.querySelectorAll('button');
          allStars.forEach(function(s) {
            s.style.color = parseInt(s.getAttribute('data-star')) <= selectedRating ? primaryColor : '#d1d5db';
          });
        });

        starsContainer.appendChild(starBtn);
      })(i);
    }

    var noteField = document.createElement('textarea');
    noteField.id = 'ai-widget-feedback-note';
    noteField.placeholder = cfg.feedback_note_placeholder;
    noteField.style.cssText = 'width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; font-size: 12px; font-family: inherit; outline: none; resize: none; height: 80px; background: #f9fafb; box-sizing: border-box;';

    var buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 8px;';

    var submitFeedbackBtn = document.createElement('button');
    submitFeedbackBtn.textContent = 'Submit Feedback';
    submitFeedbackBtn.style.cssText = 'flex: 1; padding: 8px 16px; border: none; border-radius: 8px; background: ' + primaryColor + '; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity 0.15s;';

    submitFeedbackBtn.addEventListener('click', function() {
      // Preview mode: never leaves the feedback screen — it's demoing the prompt, not collecting it.
      if (isPreview) return;

      var feedbackNote = noteField.value.trim();
      submitFeedbackBtn.disabled = true;
      submitFeedbackBtn.textContent = 'Submitting...';

      postSessionEnd({
        session_id: sessionId,
        status: sessionEndReason || 'ended',
        feedback_rating: selectedRating > 0 ? selectedRating : null,
        feedback_note: feedbackNote || null
      })
        .then(function() { showEndingMessage(sessionEndReason); })
        .catch(function() { showEndingMessage(sessionEndReason); });
    });

    var skipBtn = document.createElement('button');
    skipBtn.textContent = 'Skip';
    skipBtn.style.cssText = 'padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; color: #374151; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity 0.15s;';

    skipBtn.addEventListener('click', function() {
      // Preview mode: no-op — keeps the demo stable on the feedback screen.
      if (isPreview) return;

      postSessionEnd({
        session_id: sessionId,
        status: sessionEndReason || 'ended',
        feedback_rating: null,
        feedback_note: null
      })
        .then(function() { showEndingMessage(sessionEndReason); })
        .catch(function() { showEndingMessage(sessionEndReason); });
    });

    buttonContainer.appendChild(submitFeedbackBtn);
    buttonContainer.appendChild(skipBtn);

    feedbackEl.appendChild(feedbackTitle);
    feedbackEl.appendChild(starsContainer);
    feedbackEl.appendChild(noteField);
    feedbackEl.appendChild(buttonContainer);

    // Append feedback form below the messages area
    messagesEl.appendChild(feedbackEl);
    scrollToBottom();
  }

  function showEndingMessage(reason) {
    // Remove feedback form
    var feedbackEl = document.getElementById('ai-widget-feedback');
    if (feedbackEl) feedbackEl.remove();

    // Determine if we should show the session-end screen
    var showScreen = (reason === 'expired' && cfg.session_expired_enabled) ||
                     (reason !== 'expired' && cfg.session_ended_enabled);

    if (showScreen) {
      showSessionEndScreen(reason);
    } else {
      // Simple fallback — just show a thank you message and new conversation button
      addMessage('bot', 'Thank you for your feedback. Have a great day!');
      showNewConversationButton();
    }
  }

  function showSessionEndScreen(reason) {
    // Hide messages and input
    messagesEl.style.display = 'none';
    document.getElementById('ai-widget-input-row').style.display = 'none';

    // Remove existing end screen
    var existing = document.getElementById('ai-widget-session-end');
    if (existing) existing.remove();

    var isExpired = reason === 'expired';
    var icon = isExpired ? cfg.session_expired_icon : cfg.session_ended_icon;
    var title = isExpired ? cfg.session_expired_title : cfg.session_ended_title;
    var message = isExpired ? cfg.session_expired_message : cfg.session_ended_message;

    var endScreen = document.createElement('div');
    endScreen.id = 'ai-widget-session-end';
    endScreen.className = 'ai-widget-session-end';
    endScreen.innerHTML = [
      '<div class="ai-widget-session-end-icon">' + escapeHtml(icon) + '</div>',
      '<div class="ai-widget-session-end-title">' + escapeHtml(title) + '</div>',
      '<div class="ai-widget-session-end-msg">' + escapeHtml(message) + '</div>',
      '<button class="ai-widget-session-end-btn" id="ai-widget-new-conv-btn">Start New Conversation</button>',
    ].join('');

    bodyEl.insertBefore(endScreen, messagesEl);

    document.getElementById('ai-widget-new-conv-btn').addEventListener('click', function() {
      startNewConversation();
    });
  }

  function showNewConversationButton() {
    var newConvRow = document.createElement('div');
    newConvRow.id = 'ai-widget-new-conv';
    newConvRow.style.cssText = 'padding: 12px 14px; text-align: center;';

    var newConvBtn = document.createElement('button');
    newConvBtn.textContent = 'Start New Conversation';
    newConvBtn.style.cssText = 'padding: 12px 20px; border: none; border-radius: 8px; background: ' + primaryColor + '; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity 0.15s;';

    newConvBtn.addEventListener('click', function() {
      startNewConversation();
    });

    newConvRow.appendChild(newConvBtn);
    messagesEl.appendChild(newConvRow);
    scrollToBottom();
  }

  function startNewConversation() {
    // Clear session data (keep email and visitor ID)
    sessionId = null;
    sessionEnded = false;
    sessionEndReason = null;
    welcomeShown = false;
    contactCardDismissed = false;
    localStorage.removeItem('ai-widget-session-' + businessId);
    localStorage.removeItem(lastMsgTimeKey);

    // Clear chat messages
    messagesEl.innerHTML = '';

    // Remove any ending UI
    var newConvEl = document.getElementById('ai-widget-new-conv');
    if (newConvEl) newConvEl.remove();
    var endEl = document.getElementById('ai-widget-session-end');
    if (endEl) endEl.remove();

    // Re-enable and show input row
    document.getElementById('ai-widget-input-row').style.display = 'flex';
    setInputDisabled(false);
    inputEl.placeholder = 'Type a message...';

    openChat();
  }

  // --- Visibility change handler ---
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      // Page hidden — pause inactivity timer
      stopInactivityTimer();
    } else {
      // Page visible again — resume timer if widget is open and session is active
      if (popup.style.display !== 'none' && sessionId && !sessionEnded) {
        startInactivityTimer();
      }
    }
  });

  // --- Event wiring ---
  btn.addEventListener('click', function() {
    var isOpen = popup.style.display !== 'none';
    popup.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) {
      // Expired session — discard it so a fresh one starts on first send
      if (sessionId && !canResumeSession()) {
        sessionId = null;
        localStorage.removeItem('ai-widget-session-' + businessId);
        localStorage.removeItem(lastMsgTimeKey);
        messagesEl.innerHTML = '';
        welcomeShown = false;
      }
      openChat();
      inputEl.focus();
    } else {
      stopInactivityTimer();
    }
  });

  closeBtn.addEventListener('click', function() {
    popup.style.display = 'none';
    stopInactivityTimer();
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

  // ===================================================================================
  // Preview mode bridge
  // -----------------------------------------------------------------------------------
  // When the widget is hosted by the dashboard's Live Preview iframe (?preview=1), the
  // parent window drives it via postMessage instead of the normal user interactions.
  // Everything below is guarded by `if (isPreview)` so customer sites are untouched.
  // ===================================================================================
  if (isPreview) {
    // Tracks the most recent screen requested by the parent so appearance changes can
    // re-render the correct surface.
    var previewCurrentScreen = 'launcher';

    function previewClearScreens() {
      var ids = ['ai-widget-contact-card', 'ai-widget-session-end', 'ai-widget-feedback', 'ai-widget-new-conv'];
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el) el.remove();
      }
      messagesEl.innerHTML = '';
    }

    function previewResetSessionState() {
      sessionEnded = false;
      sessionEndReason = null;
      welcomeShown = false;
      contactCardDismissed = false;
      setInputDisabled(false);
    }

    function previewShowLauncher() {
      popup.style.display = 'none';
      previewClearScreens();
      previewResetSessionState();
    }

    function previewShowChat() {
      popup.style.display = 'flex';
      previewClearScreens();
      previewResetSessionState();
      showChatUI();
      welcomeShown = true;
      addMessage('user', 'Hi, do you have availability this week?');
      addMessage('bot', 'This is a sample response from our AI.');
    }

    function previewShowFeedback() {
      popup.style.display = 'flex';
      previewClearScreens();
      previewResetSessionState();
      showChatUI();
      sessionEndReason = 'ended';
      document.getElementById('ai-widget-input-row').style.display = 'none';
      showFeedbackPrompt('ended');
    }

    function previewShowEnded() {
      popup.style.display = 'flex';
      previewClearScreens();
      previewResetSessionState();
      showChatUI();
      document.getElementById('ai-widget-input-row').style.display = 'none';
      showSessionEndScreen('ended');
    }

    function previewShowExpired() {
      popup.style.display = 'flex';
      previewClearScreens();
      previewResetSessionState();
      showChatUI();
      document.getElementById('ai-widget-input-row').style.display = 'none';
      showSessionEndScreen('expired');
    }

    function previewShowScreen(screen) {
      previewCurrentScreen = screen;
      switch (screen) {
        case 'launcher': previewShowLauncher(); break;
        case 'chat':     previewShowChat(); break;
        case 'feedback': previewShowFeedback(); break;
        case 'ended':    previewShowEnded(); break;
        case 'expired':  previewShowExpired(); break;
        default: break;
      }
    }

    // Merges partial settings into cfg, applies primary color + header, and re-renders
    // the current screen so visual changes (intent colors, icons, copy, avatar) appear
    // immediately without a manual reload.
    function applyPreviewAppearance(settings) {
      if (!settings || typeof settings !== 'object') return;

      if (typeof settings.color === 'string') {
        primaryColor = settings.color;
        root.style.setProperty('--ai-widget-primary', primaryColor);
      }
      if (typeof settings.welcome_message === 'string') {
        welcomeMessage = settings.welcome_message;
      }

      // Copy every known cfg key the parent may send. Using `in` so explicit false/empty
      // string values aren't dropped by `||`-style fallbacks.
      var keys = [
        'tooltip_enabled','tooltip_text','tooltip_bg_color','tooltip_text_color','tooltip_position',
        'avatar_enabled','avatar_selection',
        'header_show_status','header_title','header_subtitle',
        'typing_indicator_style',
        'session_ended_enabled','session_ended_icon','session_ended_title','session_ended_message',
        'session_expired_enabled','session_expired_icon','session_expired_title','session_expired_message',
        'feedback_enabled','feedback_prompt_title','feedback_note_placeholder'
      ];
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k in settings) cfg[k] = settings[k];
      }

      applyHeaderConfig();
      previewRenderTooltip();

      // Re-render whatever screen is currently showing so the new appearance takes effect.
      // Launcher has no screen content to re-render.
      if (previewCurrentScreen && previewCurrentScreen !== 'launcher') {
        previewShowScreen(previewCurrentScreen);
      }
    }

    // Rebuild the tooltip DOM from the current cfg. Removes any existing tooltip first so
    // repeated appearance pushes (color, text, position) re-render cleanly. Dismissal is
    // intentionally ignored in preview so the reviewer can keep iterating on the tooltip.
    function previewRenderTooltip() {
      var existing = document.getElementById('ai-widget-tooltip');
      if (existing) existing.remove();
      if (!cfg.tooltip_enabled) return;

      var tip = document.createElement('div');
      tip.id = 'ai-widget-tooltip';
      tip.className = cfg.tooltip_position === 'above' ? 'tooltip-above' : 'tooltip-side';
      tip.style.backgroundColor = cfg.tooltip_bg_color;
      tip.style.color = cfg.tooltip_text_color;
      tip.innerHTML = '<span id="ai-widget-tooltip-text">' + escapeHtml(cfg.tooltip_text) + '</span>'
        + '<button id="ai-widget-tooltip-close" aria-label="Dismiss" style="color:' + cfg.tooltip_text_color + '">\u00D7</button>';
      root.appendChild(tip);

      var arrowStyle = document.createElement('style');
      if (cfg.tooltip_position === 'above') {
        arrowStyle.textContent = '#ai-widget-tooltip.tooltip-above::after { border-top-color: ' + cfg.tooltip_bg_color + '; }';
      } else {
        arrowStyle.textContent = '#ai-widget-tooltip.tooltip-side::after { border-left-color: ' + cfg.tooltip_bg_color + '; }';
      }
      document.head.appendChild(arrowStyle);

      // Close button hides the tooltip for the remainder of the preview session.
      document.getElementById('ai-widget-tooltip-close').addEventListener('click', function() {
        tip.remove();
      });
    }

    window.addEventListener('message', function(event) {
      var data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'appearance') {
        applyPreviewAppearance(data.settings);
      } else if (data.type === 'screen' && typeof data.screen === 'string') {
        previewShowScreen(data.screen);
      }
    });

    // Ensure the launcher button is visible without waiting on the stubbed config fetch
    // (it resolves with {}, but this guarantees the initial paint).
    btn.style.display = 'flex';

    // Let the parent know we're ready to receive messages. Parent can respond by
    // pushing the initial appearance + screen state.
    try {
      window.parent.postMessage({ type: 'widget-preview-ready' }, '*');
    } catch (e) { /* parent may be cross-origin in odd setups — safe to ignore */ }
  }
})();
