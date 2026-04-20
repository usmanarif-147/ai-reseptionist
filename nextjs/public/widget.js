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
  var currentView = 'chat'; // 'chat' | 'recent' | 'history'
  var feedbackVisible = false; // true while the rating prompt is on-screen — drives closed_widget/closed_tab tracking
  var resumeFromSessionId = null; // set once on Continue click; attached to the first chat POST of the new session
  var businessName = ''; // populated from /config; rendered in Recent Chats rows
  // Booking poll (wimp-06): active while a Booking Card is on-screen and booking is pending.
  // Polls /session/<sid>/booking-status every 5s. Cleared on success, session end, or widget close.
  var bookingPollTimer = null;
  var bookingCardRendered = false; // guard against duplicate Booking Cards on repeat [BOOKING_LINK] emits
  var bookingConfirmed = false;    // true once booking-status returns booked:true; suppresses further poll work

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
  // 10-minute resume rule: if the same visitor returns within 10 minutes of their last message,
  // the existing session is resumed (see canResumeSession()). After 10 minutes, the old session
  // is reaped as 'expired' — either by the client-side inactivity timer below, or by the
  // server-side sweep in src/lib/reap-stale-sessions.ts (runs on widget-stats requests). The
  // 10-minute window in the resume check, the inactivity timer, and the server reaper are all
  // intentionally aligned so a session's state is consistent across client and server.
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
    '.ai-widget-session-end-btn:hover { opacity: 0.9; }',
    // Header action buttons (menu + back) reuse the close button's round chrome.
    '#ai-widget-header-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }',
    '.ai-widget-header-btn { background: rgba(255,255,255,0.15); border: none; color: #fff; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 14px; line-height: 1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s; padding: 0; font-family: inherit; }',
    '.ai-widget-header-btn:hover { background: rgba(255,255,255,0.25); }',
    // Overflow menu — positioned under the ⋯ button.
    '#ai-widget-menu { position: absolute; top: 44px; right: 14px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1); min-width: 140px; z-index: 10; overflow: hidden; }',
    '.ai-widget-menu-item { display: block; width: 100%; text-align: left; background: none; border: none; padding: 9px 12px; font-size: 12px; color: #374151; cursor: pointer; font-family: inherit; transition: background 0.15s; }',
    '.ai-widget-menu-item:hover { background: #f3f4f6; }',
    // Positioning anchor for the dropdown menu
    '#ai-widget-header { position: relative; }',
    // Recent Chats + History panels occupy the same space as #ai-widget-body.
    '#ai-widget-recent, #ai-widget-history-view { flex: 1; display: none; flex-direction: column; overflow: hidden; max-height: 260px; }',
    '.ai-widget-panel-header { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }',
    '.ai-widget-panel-back { background: none; border: none; color: #374151; cursor: pointer; font-size: 16px; line-height: 1; padding: 4px 6px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }',
    '.ai-widget-panel-back:hover { background: #f3f4f6; }',
    '.ai-widget-panel-title { flex: 1; font-size: 13px; font-weight: 700; color: #111827; }',
    '.ai-widget-panel-new { background: none; border: none; color: var(--ai-widget-primary, #2563eb); cursor: pointer; font-size: 20px; line-height: 1; padding: 2px 6px; border-radius: 6px; transition: background 0.15s; font-family: inherit; }',
    '.ai-widget-panel-new:hover { background: #f3f4f6; }',
    // Recent Chats list
    '#ai-widget-recent-list { flex: 1; overflow-y: auto; }',
    '.ai-widget-recent-empty { padding: 24px 16px; text-align: center; font-size: 12px; color: #6b7280; line-height: 1.5; }',
    '.ai-widget-recent-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background 0.15s; }',
    '.ai-widget-recent-row:hover { background: #f9fafb; }',
    '.ai-widget-recent-row:last-child { border-bottom: none; }',
    '.ai-widget-recent-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--ai-widget-primary, #2563eb); display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }',
    '.ai-widget-recent-main { flex: 1; min-width: 0; }',
    '.ai-widget-recent-preview { font-size: 12px; color: #1f2937; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }',
    '.ai-widget-recent-biz { font-size: 11px; color: #6b7280; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.ai-widget-recent-date { font-size: 11px; color: #6b7280; flex-shrink: 0; white-space: nowrap; padding-top: 2px; }',
    '.ai-widget-recent-loading { padding: 24px 16px; text-align: center; font-size: 12px; color: #6b7280; }',
    // History read-only view — transcript above, Continue footer below.
    '#ai-widget-history-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }',
    '#ai-widget-history-footer { padding: 10px 12px; border-top: 1px solid #f0f0f0; flex-shrink: 0; }',
    '.ai-widget-continue-btn { width: 100%; padding: 9px 14px; border: none; border-radius: 8px; background: var(--ai-widget-primary, #2563eb); color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity 0.15s; }',
    '.ai-widget-continue-btn:hover { opacity: 0.9; }',
    '.ai-widget-continue-btn:disabled { opacity: 0.5; cursor: not-allowed; }',
    // Inline booking card (rendered when AI emits [BOOKING_LINK])
    '.ai-widget-booking-card { margin: 4px 0 4px 32px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }',
    '.ai-widget-booking-title { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 4px; }',
    '.ai-widget-booking-subtitle { font-size: 11px; color: #6b7280; margin-bottom: 10px; }',
    '.ai-widget-booking-cta { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: var(--ai-widget-primary, #2563eb); color: #fff; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none; transition: opacity 0.15s; }',
    '.ai-widget-booking-cta:hover { opacity: 0.9; }',
    '.ai-widget-booking-cta-arrow { font-size: 14px; line-height: 1; }',
    // Inline booking confirmation card (rendered when polling returns booked:true). Does NOT end the session.
    '.ai-widget-confirm-card { margin: 4px 0 4px 32px; background: #fff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }',
    '.ai-widget-confirm-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }',
    '.ai-widget-confirm-check { width: 22px; height: 22px; border-radius: 50%; background: #10b981; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }',
    '.ai-widget-confirm-title { font-size: 13px; font-weight: 700; color: #111827; }',
    '.ai-widget-confirm-details { font-size: 12px; color: #374151; line-height: 1.5; margin-bottom: 10px; }',
    '.ai-widget-confirm-detail-row { display: flex; gap: 6px; }',
    '.ai-widget-confirm-detail-label { color: #6b7280; min-width: 56px; flex-shrink: 0; }',
    '.ai-widget-confirm-divider { height: 1px; background: #f0f0f0; margin: 10px 0; }',
    '.ai-widget-confirm-prompt { font-size: 12px; color: #4b5563; margin-bottom: 8px; }',
    '.ai-widget-confirm-stars { display: flex; gap: 6px; margin-bottom: 8px; }',
    '.ai-widget-confirm-star { background: none; border: none; font-size: 20px; cursor: pointer; color: #d1d5db; transition: color 0.15s; padding: 0; line-height: 1; font-family: inherit; }',
    '.ai-widget-confirm-note { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 10px; font-size: 12px; font-family: inherit; outline: none; resize: none; height: 56px; background: #f9fafb; box-sizing: border-box; margin-bottom: 8px; }',
    '.ai-widget-confirm-buttons { display: flex; gap: 8px; }',
    '.ai-widget-confirm-submit { flex: 1; padding: 7px 12px; border: none; border-radius: 8px; background: var(--ai-widget-primary, #2563eb); color: #fff; font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; transition: opacity 0.15s; }',
    '.ai-widget-confirm-submit:hover { opacity: 0.9; }',
    '.ai-widget-confirm-submit:disabled { opacity: 0.5; cursor: not-allowed; }',
    '.ai-widget-confirm-skip { padding: 7px 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; color: #4b5563; font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 0.15s; }',
    '.ai-widget-confirm-skip:hover { background: #f9fafb; }',
    '.ai-widget-confirm-thanks { font-size: 12px; color: #10b981; font-weight: 600; text-align: center; padding: 4px 0; }'
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
        '<div id="ai-widget-header-actions">',
          '<button id="ai-widget-menu-btn" class="ai-widget-header-btn" aria-label="Open menu" title="Menu" style="display:none">\u22EF</button>',
          '<button id="ai-widget-close" aria-label="Close chat">\u2715</button>',
        '</div>',
      '</div>',
      '<div id="ai-widget-body">',
        '<div id="ai-widget-messages"></div>',
        '<div id="ai-widget-input-row">',
          '<input id="ai-widget-input" type="text" placeholder="Type a message..." aria-label="Type your message" autocomplete="off"/>',
          '<button id="ai-widget-send" aria-label="Send message"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>',
        '</div>',
      '</div>',
      '<div id="ai-widget-recent">',
        '<div class="ai-widget-panel-header">',
          '<button class="ai-widget-panel-back" id="ai-widget-recent-back" aria-label="Back to chat">\u2190</button>',
          '<span class="ai-widget-panel-title">Recent chats</span>',
          '<button class="ai-widget-panel-new" id="ai-widget-recent-new" aria-label="Start new chat" title="New chat">+</button>',
        '</div>',
        '<div id="ai-widget-recent-list"></div>',
      '</div>',
      '<div id="ai-widget-history-view">',
        '<div class="ai-widget-panel-header">',
          '<button class="ai-widget-panel-back" id="ai-widget-history-back" aria-label="Back to recent chats">\u2190</button>',
          '<span class="ai-widget-panel-title" id="ai-widget-history-title">Conversation</span>',
        '</div>',
        '<div id="ai-widget-history-messages"></div>',
        '<div id="ai-widget-history-footer">',
          '<button class="ai-widget-continue-btn" id="ai-widget-continue-btn">Continue this conversation</button>',
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
  var menuBtn = document.getElementById('ai-widget-menu-btn');
  var recentEl = document.getElementById('ai-widget-recent');
  var recentListEl = document.getElementById('ai-widget-recent-list');
  var recentBackBtn = document.getElementById('ai-widget-recent-back');
  var recentNewBtn = document.getElementById('ai-widget-recent-new');
  var historyViewEl = document.getElementById('ai-widget-history-view');
  var historyMessagesEl = document.getElementById('ai-widget-history-messages');
  var historyBackBtn = document.getElementById('ai-widget-history-back');
  var historyTitleEl = document.getElementById('ai-widget-history-title');
  var continueBtn = document.getElementById('ai-widget-continue-btn');

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
    currentView = 'chat';
    bodyEl.style.display = 'flex';
    recentEl.style.display = 'none';
    historyViewEl.style.display = 'none';
    messagesEl.style.display = 'flex';
    document.getElementById('ai-widget-input-row').style.display = 'flex';
    updateMenuButtonVisibility();
  }

  // The ⋯ menu is only meaningful while the visitor has an active session to manage.
  // On the Session Ended / Session Expired / feedback screens it is hidden to avoid
  // conflicting with the "Start New Conversation" CTA. In preview mode it's suppressed
  // entirely since there is no real visitor or backend.
  function updateMenuButtonVisibility() {
    if (!menuBtn) return;
    var shouldShow = !isPreview && currentView === 'chat' && !sessionEnded && !feedbackVisible && popup.style.display !== 'none';
    menuBtn.style.display = shouldShow ? 'flex' : 'none';
    if (!shouldShow) hideMenu();
  }

  function hideMenu() {
    var existing = document.getElementById('ai-widget-menu');
    if (existing) existing.remove();
  }

  function toggleMenu() {
    var existing = document.getElementById('ai-widget-menu');
    if (existing) { existing.remove(); return; }
    var menu = document.createElement('div');
    menu.id = 'ai-widget-menu';
    menu.innerHTML = [
      '<button class="ai-widget-menu-item" id="ai-widget-menu-new">New chat</button>',
      '<button class="ai-widget-menu-item" id="ai-widget-menu-history">View history</button>'
    ].join('');
    document.getElementById('ai-widget-header').appendChild(menu);

    document.getElementById('ai-widget-menu-new').addEventListener('click', function() {
      hideMenu();
      startNewConversation();
    });
    document.getElementById('ai-widget-menu-history').addEventListener('click', function() {
      hideMenu();
      showRecentChats();
    });
  }

  // Dismiss the menu if the visitor clicks anywhere else inside the popup.
  popup.addEventListener('click', function(e) {
    var menu = document.getElementById('ai-widget-menu');
    if (!menu) return;
    if (menu.contains(e.target) || (menuBtn && menuBtn.contains(e.target))) return;
    hideMenu();
  });

  function formatHistoryDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
  }

  function showRecentChats() {
    if (isPreview) return; // preview iframe has no visitor history to fetch
    currentView = 'recent';
    bodyEl.style.display = 'none';
    historyViewEl.style.display = 'none';
    recentEl.style.display = 'flex';
    updateMenuButtonVisibility();

    recentListEl.innerHTML = '<div class="ai-widget-recent-loading">Loading\u2026</div>';

    fetch(API_BASE + '/api/widget/' + businessId + '/history?visitor_id=' + encodeURIComponent(visitorId))
      .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function(data) {
        renderRecentList(data && data.sessions ? data.sessions : []);
      })
      .catch(function() {
        recentListEl.innerHTML = '<div class="ai-widget-recent-empty">Could not load history. Try again later.</div>';
      });
  }

  function renderRecentList(sessions) {
    // Don't show the in-progress session — the visitor is already in it.
    var filtered = sessions.filter(function(s) { return s.session_id !== sessionId; });
    if (!filtered.length) {
      recentListEl.innerHTML = '<div class="ai-widget-recent-empty">No previous conversations yet.</div>';
      return;
    }
    recentListEl.innerHTML = '';
    var avatar = getAvatarEmoji();
    filtered.forEach(function(s) {
      var row = document.createElement('div');
      row.className = 'ai-widget-recent-row';
      row.setAttribute('data-session-id', s.session_id);

      var avatarEl = document.createElement('div');
      avatarEl.className = 'ai-widget-recent-avatar';
      avatarEl.textContent = avatar;

      var main = document.createElement('div');
      main.className = 'ai-widget-recent-main';
      var preview = document.createElement('div');
      preview.className = 'ai-widget-recent-preview';
      preview.textContent = s.last_message_preview || '(no messages)';
      var biz = document.createElement('div');
      biz.className = 'ai-widget-recent-biz';
      biz.textContent = businessName || cfg.header_title || '';
      main.appendChild(preview);
      if (biz.textContent) main.appendChild(biz);

      var date = document.createElement('div');
      date.className = 'ai-widget-recent-date';
      date.textContent = formatHistoryDate(s.last_message_at || s.ended_at);

      row.appendChild(avatarEl);
      row.appendChild(main);
      row.appendChild(date);
      row.addEventListener('click', function() { showHistoryView(s.session_id, s.last_message_at || s.ended_at); });
      recentListEl.appendChild(row);
    });
  }

  function showHistoryView(pastSessionId, dateHint) {
    currentView = 'history';
    bodyEl.style.display = 'none';
    recentEl.style.display = 'none';
    historyViewEl.style.display = 'flex';
    updateMenuButtonVisibility();

    historyTitleEl.textContent = formatHistoryDate(dateHint) || 'Conversation';
    historyMessagesEl.innerHTML = '<div class="ai-widget-recent-loading">Loading\u2026</div>';
    continueBtn.disabled = true;
    continueBtn.setAttribute('data-session-id', pastSessionId);

    fetch(API_BASE + '/api/widget/' + businessId + '/history/' + pastSessionId + '?visitor_id=' + encodeURIComponent(visitorId))
      .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function(data) {
        renderHistoryTranscript(data && data.messages ? data.messages : []);
        if (data && data.created_at) {
          historyTitleEl.textContent = formatHistoryDate(data.created_at) || historyTitleEl.textContent;
        }
        continueBtn.disabled = false;
      })
      .catch(function() {
        historyMessagesEl.innerHTML = '<div class="ai-widget-recent-empty">Could not load this conversation.</div>';
      });
  }

  function renderHistoryTranscript(messages) {
    historyMessagesEl.innerHTML = '';
    if (!messages.length) {
      historyMessagesEl.innerHTML = '<div class="ai-widget-recent-empty">No messages in this conversation.</div>';
      return;
    }
    messages.forEach(function(m) {
      var role = m.role === 'user' ? 'user' : 'bot';
      var row = document.createElement('div');
      row.className = 'ai-widget-msg-row ' + (role === 'user' ? 'user-row' : 'bot-row');
      var bubble = document.createElement('div');
      bubble.className = role === 'user' ? 'ai-widget-msg-user' : 'ai-widget-msg-bot';
      // Strip end/request markers from historical AI messages so read-only view is clean.
      var text = (m.content || '')
        .replace(/\s*\[END_CONVERSATION\]\s*/g, '')
        .replace(/\s*\[REQUEST_CONTACT\]\s*/g, '')
        .replace(/\s*\[BOOKING_LINK\]\s*/g, '')
        .trim();
      bubble.textContent = text;
      if (role === 'bot' && cfg.avatar_enabled) {
        var avatarEl = document.createElement('div');
        avatarEl.className = 'ai-widget-msg-avatar';
        avatarEl.textContent = getAvatarEmoji();
        row.appendChild(avatarEl);
      }
      row.appendChild(bubble);
      historyMessagesEl.appendChild(row);
    });
    historyMessagesEl.scrollTop = historyMessagesEl.scrollHeight;
  }

  // Continue: resume an old session by starting a fresh one and tagging the first chat
  // POST with `resume_from_session_id`. The backend prepends the old transcript to Gemini
  // context; the widget itself does not re-render the old messages in the new thread.
  function continuePastConversation() {
    var pastId = continueBtn.getAttribute('data-session-id');
    if (!pastId) return;
    resumeFromSessionId = pastId;

    // Reset session state and land in a fresh chat view — same flow as startNewConversation
    // but without firing /session/end (the old session is already closed).
    sessionId = null;
    sessionEnded = false;
    sessionEndReason = null;
    welcomeShown = false;
    contactCardDismissed = false;
    bookingCardRendered = false;
    bookingConfirmed = false;
    stopBookingPoll();
    localStorage.removeItem('ai-widget-session-' + businessId);
    localStorage.removeItem(lastMsgTimeKey);
    messagesEl.innerHTML = '';

    openChat();
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

  // --- Booking Card + polling (wimp-06) ---
  // Renders an inline booking card when the AI emits [BOOKING_LINK]. The link opens the real
  // booking wizard in a new tab, preserving the chat session + visitor ID so the appointment
  // row lands with `chat_session_id` populated. Polling starts the moment the card is shown.
  function showBookingCard() {
    if (isPreview) return;
    if (!sessionId) return;
    if (bookingCardRendered || bookingConfirmed) return;

    var origin;
    try {
      origin = new URL(API_BASE).origin;
    } catch (e) {
      origin = API_BASE;
    }
    var href = origin + '/book/' + encodeURIComponent(businessId)
      + '?session=' + encodeURIComponent(sessionId)
      + '&visitor=' + encodeURIComponent(visitorId);

    var card = document.createElement('div');
    card.id = 'ai-widget-booking-card';
    card.className = 'ai-widget-booking-card';
    card.innerHTML = [
      '<div class="ai-widget-booking-title">Ready to book?</div>',
      '<div class="ai-widget-booking-subtitle">Click below to choose a time.</div>',
      '<a class="ai-widget-booking-cta" id="ai-widget-booking-link" target="_blank" rel="noopener noreferrer" href="' + href + '">',
        'Book an Appointment <span class="ai-widget-booking-cta-arrow">\u2192</span>',
      '</a>',
    ].join('');

    messagesEl.appendChild(card);
    scrollToBottom();
    bookingCardRendered = true;
    startBookingPoll();
  }

  function startBookingPoll() {
    if (isPreview) return;
    if (!sessionId) return;
    if (bookingPollTimer) return;

    function tick() {
      // If session ended, widget closed, or we already rendered a confirmation, stop.
      if (bookingConfirmed || sessionEnded || popup.style.display === 'none') {
        stopBookingPoll();
        return;
      }
      fetch(API_BASE + '/api/widget/' + businessId + '/session/' + sessionId + '/booking-status')
        .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function(data) {
          if (data && data.booked && data.appointment) {
            bookingConfirmed = true;
            stopBookingPoll();
            showBookingConfirmationCard(data.appointment);
          }
        })
        .catch(function() { /* transient — next tick will retry */ });
    }

    // Kick off immediately so the visitor does not wait 5s on tab-return with a fast booking.
    tick();
    bookingPollTimer = setInterval(tick, 5000);
  }

  function stopBookingPoll() {
    if (bookingPollTimer) {
      clearInterval(bookingPollTimer);
      bookingPollTimer = null;
    }
  }

  function formatBookingDate(iso) {
    if (!iso) return '';
    // iso is 'YYYY-MM-DD' — build a local Date without TZ shift.
    var parts = iso.split('-');
    if (parts.length !== 3) return iso;
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatBookingTime(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return hhmm || '';
    var segs = hhmm.split(':');
    if (segs.length < 2) return hhmm;
    var h = parseInt(segs[0], 10);
    var m = parseInt(segs[1], 10);
    if (isNaN(h) || isNaN(m)) return hhmm;
    var period = h >= 12 ? 'PM' : 'AM';
    var hh = h % 12; if (hh === 0) hh = 12;
    var mm = m < 10 ? '0' + m : String(m);
    return hh + ':' + mm + ' ' + period;
  }

  // Renders the Booking Confirmation Card inline with an optional star rating + note.
  // Submit/Skip close the rating block but leave the session active — the visitor can
  // ask follow-up questions below. We POST to /session/<sid>/rating (lightweight) so the
  // session's status/ended_at are NOT touched.
  function showBookingConfirmationCard(appt) {
    // Remove the booking CTA card — it's been replaced by the confirmation.
    var cta = document.getElementById('ai-widget-booking-card');
    if (cta) cta.remove();

    var card = document.createElement('div');
    card.id = 'ai-widget-confirm-card';
    card.className = 'ai-widget-confirm-card';

    var serviceName = appt && appt.service_name ? appt.service_name : 'Your service';
    var staffName = appt && appt.staff_name ? appt.staff_name : null;
    var dateStr = appt && appt.appointment_date ? formatBookingDate(appt.appointment_date) : '';
    var timeStr = '';
    if (appt && appt.slot_start) {
      timeStr = formatBookingTime(appt.slot_start);
      if (appt.slot_end) timeStr += ' \u2013 ' + formatBookingTime(appt.slot_end);
    }

    var detailsHtml = '';
    detailsHtml += '<div class="ai-widget-confirm-detail-row"><span class="ai-widget-confirm-detail-label">Service</span><span>' + escapeHtml(serviceName) + '</span></div>';
    if (staffName) {
      detailsHtml += '<div class="ai-widget-confirm-detail-row"><span class="ai-widget-confirm-detail-label">With</span><span>' + escapeHtml(staffName) + '</span></div>';
    }
    if (dateStr) {
      detailsHtml += '<div class="ai-widget-confirm-detail-row"><span class="ai-widget-confirm-detail-label">When</span><span>' + escapeHtml(dateStr) + (timeStr ? ' \u00B7 ' + escapeHtml(timeStr) : '') + '</span></div>';
    }

    card.innerHTML = [
      '<div class="ai-widget-confirm-header">',
        '<span class="ai-widget-confirm-check">\u2713</span>',
        '<span class="ai-widget-confirm-title">Your appointment is booked.</span>',
      '</div>',
      '<div class="ai-widget-confirm-details">' + detailsHtml + '</div>',
      '<div class="ai-widget-confirm-divider"></div>',
      '<div class="ai-widget-confirm-prompt">Would you like to leave a quick review?</div>',
      '<div class="ai-widget-confirm-stars" id="ai-widget-confirm-stars"></div>',
      '<textarea class="ai-widget-confirm-note" id="ai-widget-confirm-note" placeholder="Leave a note (optional)"></textarea>',
      '<div class="ai-widget-confirm-buttons">',
        '<button class="ai-widget-confirm-submit" id="ai-widget-confirm-submit">Submit</button>',
        '<button class="ai-widget-confirm-skip" id="ai-widget-confirm-skip">Skip</button>',
      '</div>',
    ].join('');

    messagesEl.appendChild(card);

    // Star selector — same interaction model as the end-of-conversation feedback prompt.
    var starsContainer = document.getElementById('ai-widget-confirm-stars');
    var selectedRating = 0;
    for (var i = 1; i <= 5; i++) {
      (function(star) {
        var starBtn = document.createElement('button');
        starBtn.className = 'ai-widget-confirm-star';
        starBtn.textContent = '\u2605';
        starBtn.setAttribute('data-star', star);
        starBtn.addEventListener('mouseover', function() {
          var all = starsContainer.querySelectorAll('button');
          all.forEach(function(s) {
            s.style.color = parseInt(s.getAttribute('data-star'), 10) <= star ? primaryColor : '#d1d5db';
          });
        });
        starBtn.addEventListener('mouseout', function() {
          var all = starsContainer.querySelectorAll('button');
          all.forEach(function(s) {
            s.style.color = parseInt(s.getAttribute('data-star'), 10) <= selectedRating ? primaryColor : '#d1d5db';
          });
        });
        starBtn.addEventListener('click', function() {
          selectedRating = star;
          var all = starsContainer.querySelectorAll('button');
          all.forEach(function(s) {
            s.style.color = parseInt(s.getAttribute('data-star'), 10) <= selectedRating ? primaryColor : '#d1d5db';
          });
        });
        starsContainer.appendChild(starBtn);
      })(i);
    }

    var submitBtn = document.getElementById('ai-widget-confirm-submit');
    var skipBtn = document.getElementById('ai-widget-confirm-skip');
    var noteEl = document.getElementById('ai-widget-confirm-note');

    submitBtn.addEventListener('click', function() {
      if (selectedRating <= 0) {
        // Treat "Submit" without a rating as a no-op so the visitor isn't forced to rate blindly.
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      var note = (noteEl.value || '').trim();
      postBookingRating(selectedRating, note || null)
        .then(function() { collapseConfirmCardToThanks(card); })
        .catch(function() { collapseConfirmCardToThanks(card); });
    });

    skipBtn.addEventListener('click', function() {
      card.remove();
    });

    scrollToBottom();
  }

  function collapseConfirmCardToThanks(card) {
    card.innerHTML = '<div class="ai-widget-confirm-thanks">Thanks for your feedback!</div>';
    setTimeout(function() {
      if (card && card.parentNode) card.remove();
    }, 2500);
    scrollToBottom();
  }

  // Mid-session rating — writes feedback_rating/note without terminating the session.
  // The dedicated endpoint leaves chat_sessions.status untouched so the conversation can continue.
  function postBookingRating(rating, note) {
    if (isPreview || !sessionId) return Promise.resolve();
    return fetch(API_BASE + '/api/widget/' + businessId + '/session/' + sessionId + '/rating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedback_rating: rating,
        feedback_note: note || null,
      })
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
      businessName = config.business_name || config.name || '';

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

    var chatBody = {
      session_id: sessionId,
      message: userMsg,
      customer_id: sessionStorage.getItem('ai-widget-customer-id-' + businessId) || null,
      known_customer: !!localStorage.getItem(emailKey),
      visitor_id: visitorId,
    };
    // resume_from_session_id is a one-shot hint for the very first message of a new session
    // created via "Continue this conversation" — the backend uses it to prepend the old
    // transcript into Gemini's context, then it's no longer relevant.
    if (resumeFromSessionId) {
      chatBody.resume_from_session_id = resumeFromSessionId;
      resumeFromSessionId = null;
    }

    fetch(API_BASE + '/api/widget/' + businessId + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatBody)
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
                    .replace(/\s*\[REQUEST_CONTACT\]\s*/g, '')
                    .replace(/\s*\[BOOKING_LINK\]\s*/g, '');
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
                } else if (data.type === 'booking_link') {
                  // Scrub any stray marker that slipped into the bubble, then render the Booking Card.
                  if (botBubble) {
                    botBubble.textContent = botBubble.textContent.replace(/\s*\[BOOKING_LINK\]\s*/g, '').trim();
                  }
                  showBookingCard();
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

  // Inactivity path: POST /session/end with end_reason='inactivity_timeout', then render the
  // Session Expired screen directly (bypassing transitionToEndingState so the feedback prompt
  // is never shown — by definition the visitor has walked away). If the business has disabled
  // the Session Expired screen, fall back to an inline "closed" message + Start New Conversation.
  function endSessionDueToInactivity() {
    postSessionEnd({
      session_id: sessionId,
      status: 'expired',
      end_reason: 'inactivity_timeout',
      feedback_rating: null,
      feedback_note: null
    }).catch(function() {});

    sessionEnded = true;
    sessionEndReason = 'expired';
    stopInactivityTimer();
    stopBookingPoll();
    setInputDisabled(true);
    document.getElementById('ai-widget-input-row').style.display = 'none';

    if (cfg.session_expired_enabled) {
      setTimeout(function() { showSessionEndScreen('expired'); }, 1000);
    } else {
      addMessage('bot', 'This conversation has been automatically closed due to inactivity.');
      showNewConversationButton();
    }
  }

  // --- Session ending state ---
  // Natural-end path only: the AI emitted [END_CONVERSATION]. The visitor is present, so this
  // is the only moment the feedback prompt can reach a real person (the inactivity path has its
  // own dedicated handler that skips feedback). See plan 04 for the full rationale.
  function transitionToEndingState(reason) {
    sessionEnded = true;
    sessionEndReason = reason;
    stopInactivityTimer();
    stopBookingPoll();
    setInputDisabled(true);
    document.getElementById('ai-widget-input-row').style.display = 'none';

    var delay = 500;

    if (cfg.feedback_enabled) {
      setTimeout(function() {
        showFeedbackPrompt(reason);
      }, delay);
    } else {
      // Feedback disabled by the business — POST /session/end ourselves, then show the screen.
      setTimeout(function() {
        postSessionEnd({
          session_id: sessionId,
          status: reason || 'ended',
          end_reason: 'natural',
          feedback_rating: null,
          feedback_note: null
        }).catch(function() {});
        showEndingMessage(reason);
      }, delay);
    }
  }

  function showFeedbackPrompt(reason) {
    feedbackVisible = true;
    updateMenuButtonVisibility();
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

      feedbackVisible = false;
      postSessionEnd({
        session_id: sessionId,
        status: sessionEndReason || 'ended',
        end_reason: 'natural',
        feedback_rating: selectedRating > 0 ? selectedRating : null,
        feedback_note: feedbackNote || null,
        review_action: 'given'
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

      feedbackVisible = false;
      postSessionEnd({
        session_id: sessionId,
        status: sessionEndReason || 'ended',
        end_reason: 'natural',
        feedback_rating: null,
        feedback_note: null,
        review_action: 'skipped'
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
    feedbackVisible = false;
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
    feedbackVisible = false;
    updateMenuButtonVisibility();
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
    // If the visitor clicks "Start New Conversation" on an active session (i.e. they hit the
    // button without the session having already been ended server-side), fire /session/end with
    // end_reason='user_ended' so session accounting stays complete. When the button shows after
    // an expired-/ended-screen, /session/end has already been POSTed on that path, so we skip
    // here (sessionEnded is true in that case) to avoid a duplicate call.
    if (sessionId && !sessionEnded) {
      postSessionEnd({
        session_id: sessionId,
        status: 'ended',
        end_reason: 'user_ended',
        feedback_rating: null,
        feedback_note: null
      }).catch(function() {});
    }

    // Clear session data (keep email and visitor ID)
    sessionId = null;
    sessionEnded = false;
    sessionEndReason = null;
    welcomeShown = false;
    contactCardDismissed = false;
    bookingCardRendered = false;
    bookingConfirmed = false;
    stopBookingPoll();
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
      // Closing via the launcher while the feedback prompt is visible counts as
      // abandoning the review. Record it before the popup hides.
      if (feedbackVisible) {
        postReviewActionBeacon('closed_widget');
        feedbackVisible = false;
      }
      hideMenu();
      updateMenuButtonVisibility();
      stopInactivityTimer();
      stopBookingPoll();
    }
  });

  closeBtn.addEventListener('click', function() {
    if (feedbackVisible) {
      postReviewActionBeacon('closed_widget');
      feedbackVisible = false;
    }
    hideMenu();
    popup.style.display = 'none';
    updateMenuButtonVisibility();
    stopInactivityTimer();
    stopBookingPoll();
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

  // --- History UI wiring ---
  menuBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleMenu();
  });
  recentBackBtn.addEventListener('click', function() { showChatUI(); });
  recentNewBtn.addEventListener('click', function() { startNewConversation(); });
  historyBackBtn.addEventListener('click', function() { showRecentChats(); });
  continueBtn.addEventListener('click', function() { continuePastConversation(); });

  // --- Review action tracking ---
  // When the visitor is looking at the feedback prompt and the widget is closed or the tab
  // is navigated away from, record what happened so the business can tell a genuine "skip"
  // (they saw the prompt and dismissed it) from a ghost close (they walked off).
  function postReviewActionBeacon(action) {
    if (isPreview || !sessionId) return;
    var payload = JSON.stringify({
      session_id: sessionId,
      status: sessionEndReason || 'ended',
      end_reason: 'natural',
      feedback_rating: null,
      feedback_note: null,
      review_action: action
    });
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(API_BASE + '/api/widget/' + businessId + '/session/end', blob);
        return;
      }
    } catch (e) { /* fall through to fetch */ }
    fetch(API_BASE + '/api/widget/' + businessId + '/session/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(function() {});
  }

  window.addEventListener('beforeunload', function() {
    if (feedbackVisible) postReviewActionBeacon('closed_tab');
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
