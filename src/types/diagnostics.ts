export interface DiagnosticCheck {
  id: string;
  ok: boolean;
  detail: string | null;
}

export interface InstallReport {
  appPath: string;
  inApplications: boolean;
  quarantined: boolean;
}

export interface EngineReport {
  ok: boolean;
  source: "bundled" | "system";
  version: string;
  root: string;
  entry: string;
  checks: DiagnosticCheck[];
}

export interface PermissionProbe {
  path: string;
  readable: boolean;
}

export interface PermissionReport {
  fullDiskAccess: boolean;
  probes: PermissionProbe[];
}

export interface EnvironmentReport {
  install: InstallReport;
  engine: EngineReport;
  permissions: PermissionReport;
}

export interface ReleaseStatus {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  url: string | null;
  error: string | null;
}

export interface UpdateReport {
  engine: ReleaseStatus;
  app: ReleaseStatus;
  checkedAt: number;
}
