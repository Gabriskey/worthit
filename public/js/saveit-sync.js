import {
  watchAuthState
} from "./auth.js";

import {
  loadUserStorageKey,
  saveUserStorageKey
} from "./database.js";

const APP_NAME = "saveit";
const STORAGE_KEY = "savingsGoals";
const CLOUD_KEYS = [
  {
    appName: APP_NAME,
    storageKey: STORAGE_KEY
  },
  {
    appName: "spendit",
    storageKey: "expensepath-accounts-v1"
  },
  {
    appName: "spendit",
    storageKey: "expensepath-records-v1"
  }
];

let currentUser = null;
let cloudReady = false;

function refreshSaveIt() {
  if (
    typeof window.renderSavingsPage === "function"
  ) {
    window.renderSavingsPage();
  }
}

function finishSaveItCloudLoading(user) {
  if (
    !user ||
    currentUser?.uid === user.uid
  ) {
    window
      .finishWorthItCloudLoading
      ?.();
  }
}

function normalizeCloudValue(value, storageKey) {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      throw new Error(
        `Cloud ${storageKey} is not an array.`
      );
    }

    return value;
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  throw new Error(
    `Cloud ${storageKey} has an invalid format.`
  );
}

async function loadSaveItForUser(user) {
  cloudReady = false;

  const userId = user.uid;

  const entries = await Promise.all(
    CLOUD_KEYS.map(
      async ({
        appName,
        storageKey
      }) => ({
        storageKey,
        value: await loadUserStorageKey(
          userId,
          appName,
          storageKey
        )
      })
    )
  );

  // Account changed while Firestore was loading.
  if (
    !currentUser ||
    currentUser.uid !== userId
  ) {
    return false;
  }

  const normalizedEntries = entries.map(
    ({
      storageKey,
      value
    }) => ({
      storageKey,
      value: normalizeCloudValue(
        value,
        storageKey
      )
    })
  );

  normalizedEntries.forEach(
    ({
      storageKey,
      value
    }) => {
      if (value === null) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, value);
      }
    }
  );

  cloudReady = true;

  refreshSaveIt();

  return true;
}

async function saveSaveItToCloud(rawValue) {
  if (
    !currentUser ||
    !cloudReady
  ) {
    return;
  }

  try {
    await saveUserStorageKey(
      currentUser.uid,
      APP_NAME,
      STORAGE_KEY,
      rawValue
    );

    console.log(
      "SaveIt synced to Firestore."
    );
  } catch (error) {
    console.error(
      "SaveIt cloud save failed:",
      error
    );
  }
}

window.saveSaveItToCloud =
  saveSaveItToCloud;

watchAuthState(async user => {
  currentUser = user;
  cloudReady = false;

  if (!user) {
    localStorage.removeItem(
      STORAGE_KEY
    );

    refreshSaveIt();
    finishSaveItCloudLoading();
    return;
  }

  window
    .showWorthItCloudLoading
    ?.();

  try {
    const loaded =
      await loadSaveItForUser(user);

    if (loaded) {
      console.log(
        `SaveIt loaded for ${user.email}`
      );
    }

  } catch (error) {
    console.error(
      "SaveIt cloud load failed:",
      error
    );
  } finally {
    finishSaveItCloudLoading(user);
  }
});
