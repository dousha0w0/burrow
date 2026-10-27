export type ViewId = "overview" | "space" | "clean" | "history" | "apps" | "settings";

export type TerminalCommand = "clean" | "purge" | "uninstall" | "optimize";

export interface Toast {
  id: number;
  message: string;
  kind: "info" | "success" | "error";
}

export interface MenuItem {
  label: string;
  icon?: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  action?: () => void;
}

export interface MenuState {
  x: number;
  y: number;
  items: MenuItem[];
}
