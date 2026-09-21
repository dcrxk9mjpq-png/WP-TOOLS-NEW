import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, TOKEN_KEY, errorMessage } from "@/lib/api";
import { say, setServerSpeechEnabled, stopSpeaking } from "@/lib/speech";

const AppContext = createContext(null);

const DEFAULT_APPEARANCE = {
  density: "comfortable",
  animation: "subtle",
  show_photos: true,
  high_contrast: false,
  font_scale: 1,
  show_symbol_labels: true,
  pupil_theme: "pastel",
};

const DENSITIES = ["compact", "comfortable", "spacious"];
const ANIMATIONS = ["subtle", "none"];
const PUPIL_THEMES = ["pastel", "bold"];

/** Keep whatever is in the database from producing an attribute the CSS
 *  does not know about. Older prototypes stored animation: "full". */
const normaliseAppearance = (raw) => {
  const merged = { ...DEFAULT_APPEARANCE, ...(raw || {}) };
  return {
    ...merged,
    density: DENSITIES.includes(merged.density) ? merged.density : "comfortable",
    animation: ANIMATIONS.includes(merged.animation) ? merged.animation : "subtle",
    pupil_theme: PUPIL_THEMES.includes(merged.pupil_theme) ? merged.pupil_theme : "pastel",
    font_scale: Math.min(1.6, Math.max(0.85, Number(merged.font_scale) || 1)),
  };
};

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [voice, setVoice] = useState(null);
  const [booting, setBooting] = useState(true);
  const [pupilMode, setPupilMode] = useState(() => localStorage.getItem("wp_pupil_mode") === "1");

  const appearance = useMemo(() => normaliseAppearance(settings?.appearance), [settings]);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await api.get("/settings");
      setSettings(data);
    } catch (e) {
      /* settings are optional for rendering */
    }
  }, []);

  const loadVoice = useCallback(async () => {
    try {
      const { data } = await api.get("/tts/status");
      setVoice(data);
      setServerSpeechEnabled(data.enabled);
      return data;
    } catch (e) {
      setServerSpeechEnabled(false);
      return null;
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
      await Promise.all([loadSettings(), loadVoice()]);
      return data;
    } catch (e) {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      return null;
    } finally {
      setBooting(false);
    }
  }, [loadSettings, loadVoice]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Apply appearance to the document so the settings genuinely take effect on
  // every screen, including ones rendered by shadcn portals.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-density", appearance.density);
    root.setAttribute("data-animation", appearance.animation);
    root.setAttribute("data-contrast", appearance.high_contrast ? "high" : "normal");
    root.setAttribute("data-pupil-theme", appearance.pupil_theme);
    root.style.fontSize = `${16 * appearance.font_scale}px`;
  }, [appearance]);

  // Pupil mode swaps the whole token set (pastel + clay + Fredoka).
  useEffect(() => {
    document.documentElement.setAttribute("data-mode", pupilMode ? "pupil" : "staff");
  }, [pupilMode]);

  const signIn = useCallback(
    async (email, password) => {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
      await Promise.all([loadSettings(), loadVoice()]);
      const isDisplay =
        data.user?.role?.permissions?.includes("pupil_facing.mode") &&
        !data.user?.role?.permissions?.includes("timetable.edit");
      setPupilMode(Boolean(isDisplay));
      localStorage.setItem("wp_pupil_mode", isDisplay ? "1" : "0");
      return data.user;
    },
    [loadSettings, loadVoice]
  );

  const signOut = useCallback(() => {
    stopSpeaking();
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

  const updateSettings = useCallback(
    async (patch) => {
      const { data } = await api.patch("/settings", patch);
      setSettings(data);
      if (patch.tts) await loadVoice();
      return data;
    },
    [loadVoice]
  );

  const togglePupilMode = useCallback((value) => {
    stopSpeaking();
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
      // speech
      voice,
      loadVoice,
      pupilVoice: settings?.tts?.voice,
      speechEnabled: Boolean(voice?.enabled),
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
      voice,
      loadVoice,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

/**
 * Fire-and-forget speech for the handful of places that just need a word said
 * and do not render a button (keyboard shortcuts, auto-narrated steps).
 * Prefer `SpeakButton` / `useSpeaker` so the user can see it working.
 */
export function speak(text, options) {
  say(text, options);
  return true;
}
