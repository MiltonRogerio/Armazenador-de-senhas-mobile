import { encrypt, decrypt } from "./crypto-mobile.js";

const KEY = "vaults_data";
const ATTEMPTS_KEY = "attempts";

function getPrefs() {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences) {
    return window.Capacitor.Plugins.Preferences;
  }
  return {
    get: async ({ key }) => ({ value: localStorage.getItem(key) }),
    set: async ({ key, value }) => { localStorage.setItem(key, value); },
    remove: async ({ key }) => { localStorage.removeItem(key); },
  };
}

async function load() {
  try {
    const Prefs = getPrefs();
    const { value } = await Prefs.get({ key: KEY });
    return value ? JSON.parse(value) : {};
  } catch (e) {
    console.error("load fail", e);
    return {};
  }
}

async function save(obj) {
  try {
    const Prefs = getPrefs();
    await Prefs.set({ key: KEY, value: JSON.stringify(obj) });
  } catch (e) {
    console.error("save fail", e);
    throw e;
  }
}

export async function getVaults() {
  const data = await load();
  return Object.keys(data).map(name => ({ name }));
}

export async function createVault(name, masterPass) {
  if (!name || !masterPass) throw new Error("Nome e senha obrigatórios");
  const data = await load();
  if (data[name]) throw new Error("Cofre já existe");
  const verifier = await encrypt("VERIFIED", masterPass);
  const emptyList = await encrypt(JSON.stringify([]), masterPass);
  data[name] = { verifier, passwords: emptyList };
  await save(data);
  return true;
}

export async function loginVault(name, masterPass) {
  const data = await load();
  if (!data[name]) throw new Error("Cofre não existe");
  const ok = await decrypt(data[name].verifier, masterPass);
  if (ok !== "VERIFIED") throw new Error("Senha incorreta");
  return true;
}

export async function getPasswords(name, masterPass) {
  const data = await load();
  if (!data[name]) return [];
  const raw = await decrypt(data[name].passwords, masterPass);
  return JSON.parse(raw || "[]");
}

export async function addPassword(name, masterPass, entry) {
  const data = await load();
  const list = await getPasswords(name, masterPass);
  list.push(entry);
  data[name].passwords = await encrypt(JSON.stringify(list), masterPass);
  await save(data);
}

export async function deletePassword(name, masterPass, index) {
  const data = await load();
  const list = await getPasswords(name, masterPass);
  list.splice(index, 1);
  data[name].passwords = await encrypt(JSON.stringify(list), masterPass);
  await save(data);
}

export async function deleteVault(name) {
  const data = await load();
  delete data[name];
  await save(data);
}

export async function checkBlock() {
  const Prefs = getPrefs();
  const { value } = await Prefs.get({ key: ATTEMPTS_KEY });
  if (!value) return { blocked: false, count: 0 };
  const obj = JSON.parse(value);
  if (obj.count >= 3 && obj.until && Date.now() < obj.until) {
    return { blocked: true, until: obj.until, count: obj.count };
  }
  if (obj.until && Date.now() >= obj.until) {
    await Prefs.remove({ key: ATTEMPTS_KEY });
    return { blocked: false, count: 0 };
  }
  return { blocked: false, count: obj.count };
}

export async function registerFail() {
  const Prefs = getPrefs();
  const { value } = await Prefs.get({ key: ATTEMPTS_KEY });
  let obj = value ? JSON.parse(value) : { count: 0, until: 0 };
  if (obj.until && Date.now() >= obj.until) obj = { count: 0, until: 0 };
  obj.count++;
  if (obj.count >= 3) {
    obj.until = Date.now() + 60 * 1000;
  }
  await Prefs.set({ key: ATTEMPTS_KEY, value: JSON.stringify(obj) });
  return obj;
}

export async function clearFails() {
  const Prefs = getPrefs();
  await Prefs.remove({ key: ATTEMPTS_KEY });
}