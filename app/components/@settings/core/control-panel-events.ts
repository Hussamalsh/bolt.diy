import type { TabType } from './types';

export const OPEN_CONTROL_PANEL_EVENT = 'open-control-panel';

export interface OpenControlPanelEventDetail {
  tab?: TabType;
}

export function openControlPanel(tab?: TabType) {
  if (typeof document === 'undefined') {
    return;
  }

  document.dispatchEvent(
    new CustomEvent<OpenControlPanelEventDetail>(OPEN_CONTROL_PANEL_EVENT, {
      detail: tab ? { tab } : undefined,
    }),
  );
}
