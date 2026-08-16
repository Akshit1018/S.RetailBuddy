export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`stockscan-pin:${pin}`);
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback
  let h = 0;
  for (let i = 0; i < pin.length; i++) h = (h * 33 + pin.charCodeAt(i)) >>> 0;
  return `fb_${h.toString(16)}`;
}

export function sessionUnlockKey() {
  return "stockscan-unlocked";
}

export function isSessionUnlocked() {
  try {
    return sessionStorage.getItem(sessionUnlockKey()) === "1";
  } catch {
    return true;
  }
}

export function markSessionUnlocked() {
  try {
    sessionStorage.setItem(sessionUnlockKey(), "1");
  } catch {
    /* ignore */
  }
}

export function lockSession() {
  try {
    sessionStorage.removeItem(sessionUnlockKey());
  } catch {
    /* ignore */
  }
}
