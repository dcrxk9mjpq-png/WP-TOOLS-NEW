import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, TOKEN_KEY, errorMessage } from "@/lib/api";

const AppContext = createContext(null);

const DEFAULT_APPEARANCE = {
  density: "comfortable",
  animation: "subtle",
  show_photos: true,
  high_contrast: false,
  font_scale: 1,
  show_symbol_labels: true,
};

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [booting, setBooting] = useState(true);
  const [pupilMode, setPupilMode] = useState(() => localStorage.getItem("wp_pupil_mode") === "1");

  const appearance = useMemo(
    () => ({ ...DEFAULT_APPEARANCE, ...(settings?.appearance || {}) }),
    [settings]
  );

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await api.get("/settings");
      setSettings(data);
    } catch (e) {
      /* settings are optional for rendering */
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setBooting(false);
      return null;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      await loadSettings();
      return data;
    } catch (e) {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      return null;
    } finally {
      setBooting(false);
    }
  }, [loadSettings]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Apply appearance settings to the document so they genuinely take effect.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-density", appearance.density || "comfortable");
    root.setAttribute("data-animation", appearance.animation || "subtle");
    root.setAttribute("data-contrast", appearance.high_contrast ? "high" : "normal");
    root.style.fontSize = `${16 * (Number(appearance.font_scale) || 1)}px`;
  }, [appearance]);

  const signIn = useCallback(
    async (email, password) => {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
      await loadSettings();
      const isDisplay = data.user?.role?.permissions?.includes("pupil_facing.mode") &&
        !data.user?.role?.permissions?.includes("timetable.edit");
      setPupilMode(Boolean(isDisplay));
      localStorage.setItem("wp_pupil_mode", isDisplay ? "1" : "0");
      return data.user;
    },
    [loadSettings]
  );

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.setItem("wp_pupil_mode", "0");
    setUser(null);
    setPupilMode(false);
  }, []);

  const can = useCallback(
    (permission) => {
      const perms = user?.role?.permissions || [];
      return perms.includes("*") || perms.includes(permission);
    },
    [user]
  );

  const updateSettings = useCallback(async (patch) => {
    const { data } = await api.patch("/settings", patch);
    setSettings(data);
    return data;
  }, []);

  const togglePupilMode = useCallback((value) => {
    setPupilMode(value);
    localStorage.setItem("wp_pupil_mode", value ? "1" : "0");
  }, []);

  const value = useMemo(
    () => ({
      user,
      settings,
      appearance,
      booting,
      signIn,
      signOut,
      can,
      refreshUser,
      loadSettings,
      updateSettings,
      pupilMode,
      togglePupilMode,
      errorMessage,
      motion: appearance.animation !== "none",
      features: settings?.features || {},
    }),
    [
      user,
      settings,
      appearance,
      booting,
      signIn,
      signOut,
      can,
      refreshUser,
      loadSettings,
      updateSettings,
      pupilMode,
      togglePupilMode,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

/** Browser speech synthesis - free, offline, works on classroom tablets. */
export function speak(text) {
  if (!text) return false;
  try {
    if (!("speechSynthesis" in window)) return false;
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(String(text));
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.lang = "en-GB";
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (e) {
    return false;
  }
}
