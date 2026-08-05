export type ActiveSource = {
  sourceId: string;
  label: string;
  updatedAt: number;
};

export type SourceKind = "pdf" | "url";

export type RecentSource = ActiveSource & {
  kind: SourceKind;
};

export const ACTIVE_SOURCE_STORAGE_KEY = "docchat.active-source";
export const RECENT_SOURCES_STORAGE_KEY = "docchat.recent-sources";
export const SOURCE_CHANGE_EVENT = "docchat-source-change";
const MAX_RECENT_SOURCES = 8;

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const emitSourceChange = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SOURCE_CHANGE_EVENT));
};

export const loadActiveSource = (): ActiveSource | null => {
  if (!canUseStorage()) return null;

  const raw = window.localStorage.getItem(ACTIVE_SOURCE_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ActiveSource>;
    if (
      typeof parsed.sourceId !== "string" ||
      !parsed.sourceId.trim() ||
      typeof parsed.label !== "string" ||
      !parsed.label.trim()
    ) {
      return null;
    }

    return {
      sourceId: parsed.sourceId,
      label: parsed.label,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
};

export const saveActiveSource = (sourceId: string, label: string): void => {
  if (!canUseStorage()) return;

  const trimmedSourceId = sourceId.trim();
  const trimmedLabel = label.trim();

  if (!trimmedSourceId || !trimmedLabel) return;

  const payload: ActiveSource = {
    sourceId: trimmedSourceId,
    label: trimmedLabel,
    updatedAt: Date.now(),
  };

  window.localStorage.setItem(ACTIVE_SOURCE_STORAGE_KEY, JSON.stringify(payload));
  emitSourceChange();
};

export const clearActiveSource = (): void => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ACTIVE_SOURCE_STORAGE_KEY);
  emitSourceChange();
};

export const loadRecentSources = (): RecentSource[] => {
  if (!canUseStorage()) return [];

  const raw = window.localStorage.getItem(RECENT_SOURCES_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const candidate = item as Partial<RecentSource>;
        if (
          typeof candidate.sourceId !== "string" ||
          !candidate.sourceId.trim() ||
          typeof candidate.label !== "string" ||
          !candidate.label.trim() ||
          typeof candidate.updatedAt !== "number" ||
          (candidate.kind !== "pdf" && candidate.kind !== "url")
        ) {
          return null;
        }

        return {
          sourceId: candidate.sourceId,
          label: candidate.label,
          updatedAt: candidate.updatedAt,
          kind: candidate.kind,
        };
      })
      .filter((item): item is RecentSource => item != null)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_RECENT_SOURCES);
  } catch {
    return [];
  }
};

export const rememberSource = (source: RecentSource): void => {
  if (!canUseStorage()) return;

  const trimmedSourceId = source.sourceId.trim();
  const trimmedLabel = source.label.trim();
  if (!trimmedSourceId || !trimmedLabel) return;

  const next: RecentSource = {
    sourceId: trimmedSourceId,
    label: trimmedLabel,
    updatedAt: source.updatedAt || Date.now(),
    kind: source.kind,
  };

  const current = loadRecentSources().filter((item) => item.sourceId !== trimmedSourceId);
  const updated = [next, ...current].slice(0, MAX_RECENT_SOURCES);
  window.localStorage.setItem(RECENT_SOURCES_STORAGE_KEY, JSON.stringify(updated));
  emitSourceChange();
};

export const forgetSource = (sourceId: string): void => {
  if (!canUseStorage()) return;

  const trimmedSourceId = sourceId.trim();
  if (!trimmedSourceId) return;

  const updated = loadRecentSources().filter((item) => item.sourceId !== trimmedSourceId);
  window.localStorage.setItem(RECENT_SOURCES_STORAGE_KEY, JSON.stringify(updated));
  emitSourceChange();
};

export const clearRecentSources = (): void => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(RECENT_SOURCES_STORAGE_KEY);
  emitSourceChange();
};

/**
 * useSyncExternalStore-friendly snapshot cache.
 *
 * localStorage can only be read on the client, so hydrating React state from
 * it normally means "read in an effect, setState after mount" — but that
 * causes an extra render pass and trips the set-state-in-effect lint rule.
 * useSyncExternalStore is the built-in tool for exactly this: it swaps in
 * the real value on the client without a hydration-mismatch flash, and its
 * getSnapshot must return a stable cached reference (not recompute/parse on
 * every call), so we refresh the cache only when a change event fires.
 */
const EMPTY_RECENT_SOURCES: RecentSource[] = [];

let cachedActiveSource: ActiveSource | null = null;
let cachedRecentSources: RecentSource[] = EMPTY_RECENT_SOURCES;
let cacheReady = false;

const refreshCache = (): void => {
  cachedActiveSource = loadActiveSource();
  cachedRecentSources = loadRecentSources();
  cacheReady = true;
};

export const getActiveSourceSnapshot = (): ActiveSource | null => {
  if (!cacheReady) refreshCache();
  return cachedActiveSource;
};

export const getRecentSourcesSnapshot = (): RecentSource[] => {
  if (!cacheReady) refreshCache();
  return cachedRecentSources;
};

export const getServerActiveSourceSnapshot = (): ActiveSource | null => null;

export const getServerRecentSourcesSnapshot = (): RecentSource[] => EMPTY_RECENT_SOURCES;

export const subscribeToSourceChanges = (onChange: () => void): (() => void) => {
  if (typeof window === "undefined") return () => {};

  const handleChange = () => {
    refreshCache();
    onChange();
  };

  window.addEventListener("storage", handleChange);
  window.addEventListener(SOURCE_CHANGE_EVENT, handleChange);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(SOURCE_CHANGE_EVENT, handleChange);
  };
};
