const _crypto = (typeof window !== 'undefined' && window.crypto) ? window.crypto : self.crypto;

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function getKeyFromPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await _crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return _crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}

export async function encrypt(text, password) {
  const enc = new TextEncoder();
  const salt = _crypto.getRandomValues(new Uint8Array(16));
  const iv = _crypto.getRandomValues(new Uint8Array(12));
  const key = await getKeyFromPassword(password, salt);
  const ctBuffer = await _crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  return `${bytesToBase64(salt)}:${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(ctBuffer))}`;
}

export async function decrypt(payload, password) {
  try {
    if (!payload || !payload.includes(":")) return null;
    const [sB64, ivB64, ctB64] = payload.split(":");
    const salt = base64ToBytes(sB64);
    const iv = base64ToBytes(ivB64);
    const ct = base64ToBytes(ctB64);
    const key = await getKeyFromPassword(password, salt);
    const pt = await _crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch (e) {
    console.log("Decrypt fail", e);
    return null;
  }
}