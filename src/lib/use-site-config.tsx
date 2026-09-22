import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { DEFAULT_CONFIG, type SiteConfig } from "@/config/site-config";
import {
  exportConfigFile,
  loadCloudConfig,
  loadConfig,
  parseImportedConfig,
  resetConfig,
  saveConfig,
} from "@/services/dataAdapter";
import { decrementCountdownWithServiceRole } from "@/services/config.functions";

interface SiteConfigContextValue {
  config: SiteConfig;
  /** Cập nhật trong bộ nhớ (chưa lưu) — dùng cho form Admin. */
  update: (patch: (draft: SiteConfig) => void) => void;
  /** Ghi xuống storage (localStorage / Supabase). */
  save: () => Promise<boolean>;
  decrementCountdown: (leadId: string) => Promise<boolean>;
  /** Nạp lại cấu hình gốc từ src/config. */
  reset: () => void;
  resetLanding: () => void;
  /** Xuất file config để dán đè vào mã nguồn. */
  exportFile: () => void;
  /** Nạp cấu hình từ nội dung file đã tải lên; trả về false nếu file không hợp lệ. */
  importConfig: (raw: string) => boolean;
  dirty: boolean;
  ready: boolean;
}

const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [dirty, setDirty] = useState(false);
  const [ready, setReady] = useState(false);
  const configRef = useRef(DEFAULT_CONFIG);
  const dirtyRef = useRef(false);
  const configVersionRef = useRef(0);
  const handledCountdownLeads = useRef(new Set<string>());

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // Hydrate từ storage sau khi mount (tránh mismatch SSR).
  useEffect(() => {
    const localConfig = loadConfig();
    setConfig(localConfig);
    configRef.current = localConfig;
    const loadVersion = configVersionRef.current;
    void loadCloudConfig(localConfig)
      .then((cloudConfig) => {
        if (
          cloudConfig &&
          !dirtyRef.current &&
          configVersionRef.current === loadVersion
        ) {
          configRef.current = cloudConfig;
          setConfig(cloudConfig);
        }
      })
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((patch: (draft: SiteConfig) => void) => {
    configVersionRef.current += 1;
    dirtyRef.current = true;
    setConfig((prev) => {
      const draft = structuredClone(prev);
      patch(draft);
      return draft;
    });
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    const saved = await saveConfig(config);
    if (saved) {
      dirtyRef.current = false;
      setDirty(false);
    }
    return saved;
  }, [config]);

  const decrementCountdown = useCallback(async (leadId: string) => {
    if (handledCountdownLeads.current.has(leadId)) return true;
    const current = configRef.current;
    if (
      !current.countdown.enabled ||
      current.countdown.autoDecrement === false ||
      current.countdown.slotsLeft <= 0
    )
      return true;
    handledCountdownLeads.current.add(leadId);
    const nextConfig = structuredClone(current);
    nextConfig.countdown.slotsLeft = Math.max(
      0,
      nextConfig.countdown.slotsLeft - 1,
    );
    configRef.current = nextConfig;
    setConfig(nextConfig);
    if (nextConfig.admin.storageMode !== "database") {
      const saved = await saveConfig(nextConfig);
      if (saved) setDirty(false);
      return saved;
    }

    // Prefer the public, narrowly-scoped RPC. It updates only slotsLeft and
    // remains usable when the Vercel server-function route is unavailable.
    try {
      const response = await fetch(
        `${nextConfig.admin.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/decrement_countdown_slot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: nextConfig.admin.supabaseAnonKey,
            Authorization: `Bearer ${nextConfig.admin.supabaseAnonKey}`,
          },
          body: "{}",
        },
      );
      if (response.ok) {
        const result = (await response.json()) as {
          ok?: boolean;
          slotsLeft?: number;
        };
        if (result.ok !== true || typeof result.slotsLeft !== "number") {
          throw new Error("Countdown RPC returned an invalid result");
        }
        nextConfig.countdown.slotsLeft = Math.max(0, result.slotsLeft);
        configRef.current = nextConfig;
        setConfig(nextConfig);
        // Persist the exact server value locally/cloud without decrementing it
        // a second time through the config PATCH path.
        const saved = await saveConfig(nextConfig);
        if (saved) setDirty(false);
        return saved;
      }
    } catch {
      // Try the service-role server function below as a compatibility fallback.
    }

    // Public form submissions are anonymous, so the Supabase REST update may
    // be rejected by RLS even though saveConfig keeps the local copy. The
    // service-role function is the authoritative cloud update in database
    // mode and must run before the form can redirect.
    const serverSaved = await decrementCountdownWithServiceRole({
      data: { url: nextConfig.admin.supabaseUrl },
    });
    if (!serverSaved.ok) {
      handledCountdownLeads.current.delete(leadId);
      return false;
    }
    setDirty(false);
    return true;
  }, []);

  const reset = useCallback(() => {
    configVersionRef.current += 1;
    dirtyRef.current = false;
    setConfig(resetConfig());
    setDirty(false);
  }, []);

  const resetLanding = useCallback(() => {
    configVersionRef.current += 1;
    dirtyRef.current = true;
    setConfig((current) => ({
      ...current,
      landing: structuredClone(DEFAULT_CONFIG.landing),
    }));
    setDirty(true);
  }, []);

  const exportFile = useCallback(() => {
    setConfig((current) => {
      exportConfigFile(current);
      return current;
    });
  }, []);

  const importConfig = useCallback((raw: string) => {
    const parsed = parseImportedConfig(raw);
    if (!parsed) return false;
    configVersionRef.current += 1;
    dirtyRef.current = true;
    setConfig(parsed);
    void saveConfig(parsed).then((saved) => {
      if (saved) {
        dirtyRef.current = false;
        setDirty(false);
      }
    });
    return true;
  }, []);

  const value = useMemo(
    () => ({
      config,
      update,
      save,
      decrementCountdown,
      reset,
      resetLanding,
      exportFile,
      importConfig,
      dirty,
      ready,
    }),
    [
      config,
      update,
      save,
      decrementCountdown,
      reset,
      resetLanding,
      exportFile,
      importConfig,
      dirty,
      ready,
    ],
  );

  return (
    <SiteConfigContext.Provider value={value}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig(): SiteConfigContextValue {
  const ctx = useContext(SiteConfigContext);
  if (!ctx)
    throw new Error("useSiteConfig must be used within SiteConfigProvider");
  return ctx;
}
