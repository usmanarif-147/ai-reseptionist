(function() {
  'use strict';

  var script = document.currentScript;
  var businessId = script && script.getAttribute('data-business-id');
  if (!businessId) return;

  var API_BASE = script.src.replace('/widget.js', '');
  var primaryColor = '#2563eb';
  var sessionId = localStorage.getItem('ai-widget-session-' + businessId) || null;
  var intentKey = 'ai-widget-intent-' + businessId;
  var lastIntentKey = 'ai-widget-last-intent-' + businessId;
  var tooltipDismissedKey = 'ai-widget-tooltip-dismissed-' + businessId;
  var lastMsgTimeKey = 'ai-widget-last-msg-' + businessId;
  var currentIntent = null; // never pre-loaded — only set after intent selection
  var sessionEnded = false;
  var sessionEndReason = null; // 'ended' or 'expired'

  // --- Appearance config (populated from API, defaults here) ---
  var cfg = {
    tooltip_enabled: true,
    tooltip_text: 'Ask us anything \u2014 we reply instantly 24/7',
    tooltip_bg_color: '#FFFFFF',
    tooltip_text_color: '#1F2937',
    tooltip_position: 'side',
    intent_title: 'How can we help you?',
    intent_description: 'Select an option to get started',
    intent_color_1: '#3B82F6',
    intent_color_2: '#10B981',
    intent_color_3: '#F59E0B',
    intent_border_radius: 'rounded',
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

  function getBorderRadiusValue() {
    if (cfg.intent_border_radius === 'sharp') return '4px';
    if (cfg.intent_border_radius === 'pill') return '28px';
    return '14px'; // rounded (default)
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
  // Fire-and-forget ping
  fetch(API_BASE + '/api/widget/' + businessId + '/visitor-ping?visitor_id=' + visitorId)
    .catch(function() {}); // silent — never block UI

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
    // Intent selection
    '.ai-widget-intent-wrap { flex: 1; display: flex; flex-direction: column; padding: 16px; gap: 10px; }',
    '.ai-widget-intent-heading { text-align: center; padding-bottom: 6px; }',
    '.ai-widget-intent-label { font-size: 14px; font-weight: 700; color: #111827; display: block; }',
    '.ai-widget-intent-sublabel { font-size: 11px; color: #9ca3af; margin-top: 4px; display: block; }',
    '.ai-widget-intent-btn { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 12px; border: none; color: #fff; font-family: inherit; cursor: pointer; transition: transform 0.12s, box-shadow 0.12s; text-align: left; }',
    '.ai-widget-intent-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.15); }',
    '.ai-widget-intent-btn.selected { outline: 3px solid rgba(255,255,255,0.7); outline-offset: 2px; }',
    '.ai-widget-intent-icon-wrap { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.22); display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }',
    '.ai-widget-intent-text { flex: 1; }',
    '.ai-widget-intent-name { display: block; font-size: 12px; font-weight: 700; }',
    '.ai-widget-intent-desc { display: block; font-size: 10px; opacity: 0.8; margin-top: 2px; }',
    '.ai-widget-intent-chevron { opacity: 0.6; font-size: 14px; font-weight: 300; flex-shrink: 0; }',
    // Pre-chat form
    '.ai-widget-form-wrap { flex: 1; overflow-y: auto; }',
    '.ai-widget-form-inner { padding: 16px 18px 20px; }',
    '.ai-widget-form-title { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 3px; }',
    '.ai-widget-form-subtitle { font-size: 11px; color: #9ca3af; margin-bottom: 18px; }',
    '.ai-widget-form-group { margin-bottom: 13px; }',
    '.ai-widget-form-label { display: block; font-size: 11px; font-weight: 600; color: #4b5563; margin-bottom: 5px; }',
    '.ai-widget-form-label .req { color: #ef4444; margin-left: 1px; }',
    '.ai-widget-form-input { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-family: inherit; outline: none; background: #fff; color: #1f2937; transition: border-color 0.15s; }',
    '.ai-widget-form-input:focus { border-color: var(--ai-widget-primary, #2563eb); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }',
    '.ai-widget-form-input.error { border-color: #ef4444; }',
    '.ai-widget-form-error { font-size: 11.5px; color: #ef4444; margin-top: 3px; }',
    '.ai-widget-form-submit { display: block; width: 100%; margin-top: 20px; padding: 8px 16px; border: none; border-radius: 8px; background: var(--ai-widget-primary, #2563eb); color: #fff; font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; transition: opacity 0.15s; }',
    '.ai-widget-form-submit:hover { opacity: 0.9; }',
    '.ai-widget-form-submit:disabled { opacity: 0.5; cursor: not-allowed; }',
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

  function hideChatUI() {
    messagesEl.style.display = 'none';
    document.getElementById('ai-widget-input-row').style.display = 'none';
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

  // --- Intent Selection ---
  // isReturning: true for returning customers (form is skipped, goes straight to chat)
  function showIntentSelection(isReturning) {
    hideChatUI();
    // Remove any existing intent/form screens
    var existing = document.getElementById('ai-widget-intent');
    if (existing) existing.remove();
    existing = document.getElementById('ai-widget-prechat');
    if (existing) existing.remove();
    // Remove any session-end screen
    existing = document.getElementById('ai-widget-session-end');
    if (existing) existing.remove();

    var lastIntent = localStorage.getItem(lastIntentKey);
    var borderRadius = getBorderRadiusValue();

    var intentColors = [cfg.intent_color_1, cfg.intent_color_2, cfg.intent_color_3];

    var wrap = document.createElement('div');
    wrap.id = 'ai-widget-intent';
    wrap.className = 'ai-widget-intent-wrap';
    wrap.innerHTML = [
      '<div class="ai-widget-intent-heading">',
        '<span class="ai-widget-intent-label">' + escapeHtml(cfg.intent_title) + '</span>',
        '<span class="ai-widget-intent-sublabel">' + escapeHtml(cfg.intent_description) + '</span>',
      '</div>',
      '<button class="ai-widget-intent-btn" data-intent="basic_information" style="background:' + intentColors[0] + ';border-radius:' + borderRadius + '">',
        '<span class="ai-widget-intent-icon-wrap">\uD83D\uDCAC</span>',
        '<span class="ai-widget-intent-text"><span class="ai-widget-intent-name">Basic Information</span><span class="ai-widget-intent-desc">Ask questions about our services</span></span>',
        '<span class="ai-widget-intent-chevron">\u203A</span>',
      '</button>',
      '<button class="ai-widget-intent-btn" data-intent="book_appointment" style="background:' + intentColors[1] + ';border-radius:' + borderRadius + '">',
        '<span class="ai-widget-intent-icon-wrap">\uD83D\uDCC5</span>',
        '<span class="ai-widget-intent-text"><span class="ai-widget-intent-name">Book an Appointment</span><span class="ai-widget-intent-desc">Schedule a visit with us</span></span>',
        '<span class="ai-widget-intent-chevron">\u203A</span>',
      '</button>',
      '<button class="ai-widget-intent-btn" data-intent="appointment_details" style="background:' + intentColors[2] + ';border-radius:' + borderRadius + '">',
        '<span class="ai-widget-intent-icon-wrap">\uD83D\uDD0D</span>',
        '<span class="ai-widget-intent-text"><span class="ai-widget-intent-name">Appointment Details</span><span class="ai-widget-intent-desc">Check or manage an existing booking</span></span>',
        '<span class="ai-widget-intent-chevron">\u203A</span>',
      '</button>',
    ].join('');
    bodyEl.insertBefore(wrap, messagesEl);

    // Pre-select last used intent for returning customers
    if (lastIntent) {
      var lastBtn = wrap.querySelector('[data-intent="' + lastIntent + '"]');
      if (lastBtn) lastBtn.classList.add('selected');
    }

    var buttons = wrap.querySelectorAll('.ai-widget-intent-btn');
    buttons.forEach(function(b) {
      b.addEventListener('click', function() {
        currentIntent = b.getAttribute('data-intent');
        if (isReturning) {
          // Returning customer — save intent and go straight to chat (form already on file)
          localStorage.setItem(lastIntentKey, currentIntent);
          openChat();
        } else {
          // New visitor — show pre-chat form (intent saved only after form submit)
          showPreChatForm();
        }
      });
    });
  }

  // --- Escape HTML helper ---
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
      '<div class="ai-widget-form-inner">',
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
        '<button class="ai-widget-form-submit" id="ai-pcf-submit">Start Chat \u2192</button>',
      '</div>',
    ].join('');
    bodyEl.insertBefore(wrap, messagesEl);

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
        // Save email and last used intent only after successful form submit
        localStorage.setItem(emailKey, email);
        localStorage.setItem(lastIntentKey, currentIntent);
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
  fetch(API_BASE + '/api/widget/' + businessId + '/config')
    .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
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
      cfg.intent_title = config.intent_title || cfg.intent_title;
      cfg.intent_description = config.intent_description || cfg.intent_description;
      cfg.intent_color_1 = config.intent_color_1 || cfg.intent_color_1;
      cfg.intent_color_2 = config.intent_color_2 || cfg.intent_color_2;
      cfg.intent_color_3 = config.intent_color_3 || cfg.intent_color_3;
      cfg.intent_border_radius = config.intent_border_radius || cfg.intent_border_radius;
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

      // Inject tooltip if enabled and not dismissed
      var tooltipDismissed = sessionStorage.getItem(tooltipDismissedKey);
      if (cfg.tooltip_enabled && !tooltipDismissed) {
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

      // For 10-min resume: pre-load welcome message so chat is ready when popup opens
      if (storedEmail && canResumeSession()) {
        addMessage('bot', welcomeMessage);
        welcomeShown = true;
        showChatUI();
      } else {
        hideChatUI();
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
        intent: currentIntent || null,
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
                  var cleanToken = data.token.replace(/\s*\[END_CONVERSATION\]\s*/g, '');
                  if (cleanToken) {
                    botBubble.textContent += cleanToken;
                    scrollToBottom();
                  }
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

  function endSessionDueToInactivity() {
    // Mark session as expired in the DB immediately (fire-and-forget)
    fetch(API_BASE + '/api/widget/' + businessId + '/session/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        status: 'expired',
        feedback_rating: null,
        feedback_note: null
      })
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
        // Fire-and-forget session end
        fetch(API_BASE + '/api/widget/' + businessId + '/session/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            status: reason || 'ended',
            feedback_rating: null,
            feedback_note: null
          })
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
      var feedbackNote = noteField.value.trim();
      submitFeedbackBtn.disabled = true;
      submitFeedbackBtn.textContent = 'Submitting...';

      fetch(API_BASE + '/api/widget/' + businessId + '/session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          status: sessionEndReason || 'ended',
          feedback_rating: selectedRating > 0 ? selectedRating : null,
          feedback_note: feedbackNote || null
        })
      })
        .then(function() { showEndingMessage(sessionEndReason); })
        .catch(function() { showEndingMessage(sessionEndReason); });
    });

    var skipBtn = document.createElement('button');
    skipBtn.textContent = 'Skip';
    skipBtn.style.cssText = 'padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; color: #374151; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity 0.15s;';

    skipBtn.addEventListener('click', function() {
      fetch(API_BASE + '/api/widget/' + businessId + '/session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          status: sessionEndReason || 'ended',
          feedback_rating: null,
          feedback_note: null
        })
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
    currentIntent = null;
    welcomeShown = false;
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

    // Show intent selection (skip form — email already in localStorage)
    if (storedEmail) {
      showIntentSelection(true);
    } else {
      showIntentSelection(false);
    }
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
      if (sessionId && canResumeSession()) {
        // Within 10 minutes — continue conversation
        startInactivityTimer();
        inputEl.focus();
      } else if (sessionId && !canResumeSession()) {
        // After 10 minutes — session expired, clear it
        sessionId = null;
        localStorage.removeItem('ai-widget-session-' + businessId);
        localStorage.removeItem(lastMsgTimeKey);
        if (storedEmail) {
          showIntentSelection(true);
        } else {
          showIntentSelection(false);
        }
      } else if (storedEmail) {
        // Returning visitor without active session — show intent (form skipped)
        showIntentSelection(true);
      } else {
        // New visitor — show intent (form required)
        showIntentSelection(false);
      }
    } else {
      // Widget closing — stop inactivity timer
      stopInactivityTimer();
    }
  });

  closeBtn.addEventListener('click', function() {
    popup.style.display = 'none';
    stopInactivityTimer();
    // If no active session, discard incomplete intent/form flow so next open starts fresh
    if (!sessionId) {
      currentIntent = null;
      var intentEl = document.getElementById('ai-widget-intent');
      if (intentEl) intentEl.remove();
      var prechatEl = document.getElementById('ai-widget-prechat');
      if (prechatEl) prechatEl.remove();
    }
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
