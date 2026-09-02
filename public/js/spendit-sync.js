import {
  watchAuthState
} from "./auth.js";

import {
  loadUserStorageKey,
  saveUserStorageKey
} from "./database.js";

const APP_NAME = "spendit";

const STORAGE_KEYS = [
  "expensepath-accounts-v1",
  "expensepath-records-v1",
  "expensepath-ui-v1"
];

let currentUser = null;
let cloudReady = false;
const lastKnownValues =
  new Map();

function normalizeCloudValue(value) {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

async function loadSpendItForUser(user) {
  cloudReady = false;

  const userId = user.uid;

  const entries = await Promise.all(
    STORAGE_KEYS.map(async storageKey => {
      const value =
        await loadUserStorageKey(
          userId,
          APP_NAME,
          storageKey
        );

      return [
        storageKey,
        value
      ];
    })
  );

  // Account changed while Firestore was loading.
  if (
    !currentUser ||
    currentUser.uid !== userId
  ) {
    return;
  }

  entries.forEach(
    ([storageKey, value]) => {
      const normalizedValue =
        normalizeCloudValue(value);

if (normalizedValue === null) {
  localStorage.removeItem(
    storageKey
  );
} else {
  localStorage.setItem(
    storageKey,
    normalizedValue
  );
}

lastKnownValues.set(
  storageKey,
  normalizedValue
);

    }
  );

  if (
    typeof window.reloadSpendItFromStorage ===
    "function"
  ) {
    window.reloadSpendItFromStorage();
  }

  cloudReady = true;
}

async function saveSpendItKeyToCloud(
  storageKey,
  rawValue
) {
  if (
    !currentUser ||
    !cloudReady
  ) {
    return;
  }

  if (
    !STORAGE_KEYS.includes(storageKey)
  ) {
    return;
  }

  if (
  lastKnownValues.get(storageKey) ===
  rawValue
) {
  return;
}

const previousValue =
  lastKnownValues.get(storageKey);

lastKnownValues.set(
  storageKey,
  rawValue
);

  try {
    await saveUserStorageKey(
      currentUser.uid,
      APP_NAME,
      storageKey,
      rawValue
    );

    console.log(
      `SpendIt synced: ${storageKey}`
    );
} catch (error) {
  if (
    lastKnownValues.get(storageKey) ===
    rawValue
  ) {
    lastKnownValues.set(
      storageKey,
      previousValue
    );
  }

  console.error(
    "SpendIt cloud save failed:",
    error
  );
}
}

window.saveSpendItKeyToCloud =
  saveSpendItKeyToCloud;

watchAuthState(async user => {
  currentUser = user;
  cloudReady = false;

  window
  .finishWorthItCloudLoading
  ?.();

  if (!user) {
    lastKnownValues.clear();
    
    STORAGE_KEYS.forEach(
      storageKey => {
        localStorage.removeItem(
          storageKey
        );
      }
    );

    window.reloadSpendItFromStorage?.();

    return;
  }

  try {
    await loadSpendItForUser(user);

    console.log(
  `SpendIt loaded for ${user.email}`
);

  } catch (error) {
    console.error(
      "SpendIt cloud load failed:",
      error
    );
    window
  .finishWorthItCloudLoading
  ?.();
  }
});