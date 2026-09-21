/**
 * Speech.
 *
 * One function, used by every screen that says something out loud.
 *
 * 1. Ask the server for a natural British voice (ElevenLabs). The server caches
 *    every clip on disk, so the second time a child taps "I need the toilet"
 *    the audio comes back instantly and costs nothing.
 * 2. Cache the resulting blob in this tab too, so a third tap does not even
 *    make a request.
 * 3. If the server cannot help - no key, no network, quota gone, voices turned
 *    off in Settings - fall back to the device's own speech synthesis so the
 *    button still works in front of the child. Speech never dead-ends.
 */
import { API_BASE, TOKEN_KEY } from "@/lib/api";

const MAX_CACHED_CLIPS = 120;

/** key -> object URL for audio we have already fetched in this tab */
const clips = new Map();

let serverSpeech = { enabled: true, checked: false };
let currentAudio = null;

export const setServerSpeechEnabled = (enabled) => {
  serverSpeech = { enabled: Boolean(enabled), checked: true };
};

export const isServerSpeechEnabled = () => serverSpeech.enabled;

const cacheKey = (text, voice, pupilId) =>
  `${voice || "default"}|${pupilId || "class"}|${String(text).trim().toLowerCase()}`;

const remember = (key, url) => {
  clips.set(key, url);
  if (clips.size > MAX_CACHED_CLIPS) {
    const oldest = clips.keys().next().value;
    const stale = clips.get(oldest);
    clips.delete(oldest);
    if (stale) URL.revokeObjectURL(stale);
  }
};

/** Stop anything currently being said. */
export const stopSpeaking = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  try {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  } catch (e) {
    /* nothing we can do, and nothing the classroom needs to know */
  }
};

/** The device's own voice. Free, offline, robotic - the safety net. */
export const speakOnDevice = (text) =>
  new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(String(text));
      utterance.lang = "en-GB";
      utterance.rate = 0.9;
      utterance.pitch = 1;
      const british = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang === "en-GB");
      if (british) utterance.voice = british;
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      resolve(false);
    }
  });

const playUrl = (url) =>
  new Promise((resolve, reject) => {
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
      resolve(true);
    };
    audio.onerror = () => reject(new Error("playback failed"));
    audio.play().catch(reject);
  });

/**
 * Say something.
 *
 * @returns {Promise<{ok: boolean, source: "server"|"device"|"none"}>}
 */
export const say = async (text, { voice, pupilId, interrupt = true } = {}) => {
  const phrase = String(text || "").trim();
  if (!phrase) return { ok: false, source: "none" };
  if (interrupt) stopSpeaking();

  const key = cacheKey(phrase, voice, pupilId);
  const cached = clips.get(key);
  if (cached) {
    try {
      await playUrl(cached);
      return { ok: true, source: "server" };
    } catch (e) {
      clips.delete(key);
      URL.revokeObjectURL(cached);
    }
  }

  if (serverSpeech.enabled) {
    try {
      const response = await fetch(`${API_BASE}/tts/speak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}`,
        },
        body: JSON.stringify({ text: phrase, voice, pupil_id: pupilId }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        remember(key, url);
        await playUrl(url);
        return { ok: true, source: "server" };
      }
      if (response.status === 503) {
        // The server has told us it cannot do this. Stop asking it this session.
        setServerSpeechEnabled(false);
      }
    } catch (e) {
      /* offline or blocked - fall through to the device voice */
    }
  }

  const spoke = await speakOnDevice(phrase);
  return { ok: spoke, source: spoke ? "device" : "none" };
};

/** Say several lines one after another, stopping if `shouldContinue` says so. */
export const sayInSequence = async (lines, options = {}) => {
  for (const line of lines) {
    if (options.shouldContinue && !options.shouldContinue()) return;
    await say(line, { ...options, interrupt: false });
  }
};
