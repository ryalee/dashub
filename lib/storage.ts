import type { ReportData, Settings } from "./types";

const REPORTS_KEY  = "dashboard_reports";
const SETTINGS_KEY = "dashboard_settings";

const DEFAULT_SETTINGS: Settings = {
  groqApiKey: "",
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function saveReport(report: ReportData): void {
  if (!isBrowser()) return;

  const all = getReports();
  const idx = all.findIndex((existingReport) => existingReport.id === report.id);
  if (idx >= 0) all[idx] = report;
  else all.unshift(report);

  localStorage.setItem(REPORTS_KEY, JSON.stringify(all));
}

export function getReports(): ReportData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getReportById(id: string): ReportData | null {
  return getReports().find((report) => report.id === id) ?? null;
}

export function deleteReport(id: string): void {
  if (!isBrowser()) return;

  localStorage.setItem(REPORTS_KEY, JSON.stringify(getReports().filter((report) => report.id !== id)));
}

export function renameReport(id: string, name: string): void {
  if (!isBrowser()) return;

  const all = getReports();
  const idx = all.findIndex((report) => report.id === id);
  if (idx >= 0) { all[idx].name = name; localStorage.setItem(REPORTS_KEY, JSON.stringify(all)); }
}

export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

export function saveSettings(settings: Settings): void {
  if (!isBrowser()) return;

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
