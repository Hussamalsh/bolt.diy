export const CHAT_HISTORY_MENU_PANEL_ID = 'chat-history-sidebar';
export const OPEN_CHAT_HISTORY_MENU_EVENT = 'open-chat-history-menu';
export const TOGGLE_CHAT_HISTORY_MENU_EVENT = 'toggle-chat-history-menu';

export function openChatHistoryMenu() {
  if (typeof document === 'undefined') {
    return;
  }

  document.dispatchEvent(new CustomEvent(OPEN_CHAT_HISTORY_MENU_EVENT));
}

export function toggleChatHistoryMenu() {
  if (typeof document === 'undefined') {
    return;
  }

  document.dispatchEvent(new CustomEvent(TOGGLE_CHAT_HISTORY_MENU_EVENT));
}
