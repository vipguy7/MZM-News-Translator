const CACHE_PREFIX = 'mzm-news-cache-';

/**
 * Creates a SHA-256 hash of a string input.
 * @param input The string to hash.
 * @returns A promise that resolves to the hex string of the hash.
 */
async function createSHA256Hash(input: string): Promise<string> {
  try {
    const textAsBuffer = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', textAsBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error("Hashing failed, returning plain input (not recommended for large inputs):", error);
    // Fallback for environments where crypto.subtle might not be available (e.g., insecure contexts)
    return input;
  }
}

/**
 * Generates a consistent, unique cache key for a given object.
 * It sorts the object keys before stringifying to ensure consistency.
 * @param data The object to generate a key for.
 * @returns A promise that resolves to the generated cache key string.
 */
export const generateCacheKey = async (data: object): Promise<string> => {
    // Sorting keys ensures that {a: 1, b: 2} and {b: 2, a: 1} produce the same key
    const stableString = JSON.stringify(data, Object.keys(data).sort());
    const hash = await createSHA256Hash(stableString);
    return `${CACHE_PREFIX}${hash}`;
};

/**
 * Retrieves and parses an item from sessionStorage.
 * @param key The key of the item to retrieve.
 * @returns The parsed item, or null if not found or if parsing fails.
 */
export const getFromCache = <T>(key: string): T | null => {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) as T : null;
  } catch (error) {
    console.error(`Error reading from cache for key ${key}:`, error);
    // If there's a parsing error, remove the corrupted item
    sessionStorage.removeItem(key);
    return null;
  }
};

/**
 * Stringifies and stores an item in sessionStorage.
 * @param key The key to store the item under.
 * @param value The value to store.
 */
export const setInCache = <T>(key: string, value: T): void => {
  try {
    const item = JSON.stringify(value);
    sessionStorage.setItem(key, item);
  } catch (error) {
    console.error(`Error setting cache for key ${key}. It might be due to storage limits.`, error);
  }
};

/**
 * Clears all cache entries created by this application from sessionStorage.
 */
export const clearAppCache = (): void => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    console.log(`Cleared ${keysToRemove.length} application cache entries.`);
  } catch (error) {
    console.error('Failed to clear application cache:', error);
  }
};
