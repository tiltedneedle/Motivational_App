/**
 * Where the account's session lives on a phone.
 *
 * The session's refresh token is the one credential-shaped thing the app
 * holds: it unlocks the account's copy of the Book from any device until the
 * person signs out everywhere. Kept in plain AsyncStorage it sat in an
 * unencrypted file in the app's sandbox (an Android backup, an iTunes
 * backup). This keeps it encrypted: an AES key of the device's own, made
 * once and held in the keychain / keystore (expo-secure-store), and the
 * session as ciphertext in AsyncStorage — the shape Supabase's own Expo
 * guide uses, because the secure store caps a value at about two kilobytes
 * and a session with its user is bigger.
 *
 * On the web the store is the browser's, as before. On a phone whose build
 * lacks the native modules (an old build, Expo Go without the plugin) it
 * falls back to plain storage rather than refusing to sign in; the fallback
 * is noted once in the console so a build that meant to be secure is not
 * quietly the other kind.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

// SecureStore accepts only [A-Za-z0-9._-] in a key. The auth client's own
// key is `sb-<ref>-auth-token` (and `-code-verifier` for PKCE), which is
// fine; the prefix used to end in a colon, which is not, so every keychain
// read and write threw and no sign-in could complete on a phone.
const KEY_PREFIX = 'morrow-session-key.';
const keyId = (name: string): string => KEY_PREFIX + name.replace(/[^A-Za-z0-9._-]/g, '_');

let modules: Promise<{ secure: any; crypto: any; aes: any } | null> | null = null;

/** The three native modules, loaded once; null when any is missing. */
function load(): Promise<{ secure: any; crypto: any; aes: any } | null> {
  if (modules) return modules;
  modules = (async () => {
    try {
      const [secure, crypto, aes] = await Promise.all([import('expo-secure-store'), import('expo-crypto'), import('aes-js')]);
      if (!secure?.getItemAsync || !crypto?.getRandomBytesAsync) return null;
      return { secure, crypto, aes: (aes as { default?: unknown }).default ?? aes };
    } catch {
      return null;
    }
  })();
  return modules;
}

class LargeSecureStore implements Storage {
  private warned = false;

  private async keyFor(name: string, make: boolean): Promise<Uint8Array | null> {
    const m = await load();
    if (!m) return null;
    const id = keyId(name);
    try {
      const held: string | null = await m.secure.getItemAsync(id);
      if (held) return m.aes.utils.hex.toBytes(held);
      if (!make) return null;
      const fresh: Uint8Array = await m.crypto.getRandomBytesAsync(32);
      await m.secure.setItemAsync(id, m.aes.utils.hex.fromBytes(fresh), {
        keychainAccessible: m.secure.AFTER_FIRST_UNLOCK,
      });
      return fresh;
    } catch {
      // A keychain that refuses (a locked device at the wrong moment, an
      // entitlement missing): plain storage rather than a sign-in that
      // cannot complete.
      return null;
    }
  }

  private fallback(): Storage {
    if (!this.warned) {
      this.warned = true;
      console.warn('[morrow] the secure store is not in this build; the session is kept in plain storage');
    }
    return AsyncStorage;
  }

  async getItem(key: string): Promise<string | null> {
    const m = await load();
    if (!m) return this.fallback().getItem(key);
    const sealed = await AsyncStorage.getItem(key);
    if (sealed == null) return null;
    // A value written before this store existed is plain JSON: read it, and
    // the next write seals it.
    if (sealed.startsWith('{')) return sealed;
    const k = await this.keyFor(key, false);
    if (!k) return null;
    try {
      const bytes = m.aes.utils.hex.toBytes(sealed);
      const iv = bytes.slice(0, 16);
      const body = bytes.slice(16);
      const ctr = new m.aes.ModeOfOperation.ctr(k, new m.aes.Counter(iv));
      return m.aes.utils.utf8.fromBytes(ctr.decrypt(body));
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const m = await load();
    if (!m) return this.fallback().setItem(key, value);
    const k = await this.keyFor(key, true);
    if (!k) return this.fallback().setItem(key, value);
    const iv: Uint8Array = await m.crypto.getRandomBytesAsync(16);
    const ctr = new m.aes.ModeOfOperation.ctr(k, new m.aes.Counter(iv));
    const body = ctr.encrypt(m.aes.utils.utf8.toBytes(value));
    const out = new Uint8Array(iv.length + body.length);
    out.set(iv, 0);
    out.set(body, iv.length);
    await AsyncStorage.setItem(key, m.aes.utils.hex.fromBytes(out));
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    const m = await load();
    if (m) {
      try {
        await m.secure.deleteItemAsync(keyId(key));
      } catch {
        // no key to remove
      }
    }
  }
}

/** The storage the auth client keeps its session in. */
export function authStorage(): Storage {
  return Platform.OS === 'web' ? AsyncStorage : new LargeSecureStore();
}
