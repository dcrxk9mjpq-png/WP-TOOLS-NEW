import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;
export const TOKEN_KEY = "wp_token";

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401 && !String(error?.config?.url || "").includes("/auth/login")) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith("/sign-in")) {
        window.location.href = "/sign-in";
      }
    }
    return Promise.reject(error);
  }
);

export const errorMessage = (error, fallback = "Something went wrong") => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return error?.message || fallback;
};

/** Canonical symbol image URL. Screens NEVER choose artwork - only a conceptKey. */
export const symbolUrl = (conceptKey) =>
  conceptKey ? `${API_BASE}/symbols/${encodeURIComponent(conceptKey)}/image` : null;

export const pupilPhotoUrl = (pupilId) => `${API_BASE}/pupils/${pupilId}/photo`;

export const TINTS = {
  teal: "hsl(var(--wp-primary-soft))",
  mint: "hsl(var(--wp-tint-mint))",
  peach: "hsl(var(--wp-tint-peach))",
  lilac: "hsl(var(--wp-tint-lilac))",
  butter: "hsl(var(--wp-tint-butter))",
  amber: "hsl(var(--wp-tint-butter))",
  blush: "hsl(var(--wp-tint-blush))",
  rose: "hsl(var(--wp-tint-rose))",
  sage: "hsl(var(--wp-tint-sage))",
  sky: "hsl(var(--wp-tint-sky))",
  coral: "hsl(var(--wp-tint-peach))",
};

export const tint = (name) => TINTS[name] || TINTS.teal;

export const ZONE_TINTS = {
  blue: "hsl(205 70% 90%)",
  green: "hsl(140 45% 88%)",
  yellow: "hsl(48 90% 86%)",
  red: "hsl(6 70% 90%)",
};

export const ZONE_INK = {
  blue: "hsl(205 60% 28%)",
  green: "hsl(150 45% 24%)",
  yellow: "hsl(35 70% 28%)",
  red: "hsl(6 60% 34%)",
};

export const formatLongDate = (iso) => {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (e) {
    return iso;
  }
};

/**
 * Today, as the classroom experiences it.
 *
 * The device could be set to any timezone and `toISOString()` is UTC, which
 * silently shows yesterday's date to anyone using the platform late in the
 * evening during British Summer Time. The server works in Europe/London, so
 * the browser must too or the two disagree about what day it is.
 */
export const SCHOOL_TIME_ZONE = "Europe/London";

export const todayIso = () => {
  try {
    // en-CA formats as YYYY-MM-DD
    return new Date().toLocaleDateString("en-CA", { timeZone: SCHOOL_TIME_ZONE });
  } catch (e) {
    return new Date().toISOString().slice(0, 10);
  }
};

/** Minutes since midnight in the school's timezone. */
export const schoolMinutesNow = () => {
  try {
    const parts = new Date().toLocaleTimeString("en-GB", {
      timeZone: SCHOOL_TIME_ZONE,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
    const [h, m] = parts.split(":").map(Number);
    return h * 60 + m;
  } catch (e) {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }
};

export const formatTimeAgo = (iso) => {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (Number.isNaN(mins)) return "";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

export const DAY_CONCEPTS = [
  "day.sunday",
  "day.monday",
  "day.tuesday",
  "day.wednesday",
  "day.thursday",
  "day.friday",
  "day.saturday",
];

export const MONTH_CONCEPTS = [
  "month.january",
  "month.february",
  "month.march",
  "month.april",
  "month.may",
  "month.june",
  "month.july",
  "month.august",
  "month.september",
  "month.october",
  "month.november",
  "month.december",
];
