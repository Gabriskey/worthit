import {
  watchAuthState
} from "./auth.js";

import {
  loadUserStorageKey,
  saveUserStorageKey
} from "./database.js";

const APP_NAME = "saveit";
const STORAGE_KEY = "savingsGoals";

let currentUser = null;
let cloudReady = false;

function refreshSaveIt() {
  if (
    typeof window.renderSavingsPage === "function"
  ) {
    window.renderSavingsPage();
  }
}

function normalizeCloudValue(value) {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      throw new Error(
        "Cloud savingsGoals is not an array."
      );
    }

    return value;
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  throw new Error(
    "Cloud savingsGoals has an invalid format."
  );
}

async function loadSaveItForUser(user) {
  cloudReady = false;

  const userId = user.uid;

  const cloudValue =
    await loadUserStorageKey(
      userId,
      APP_NAME,
      STORAGE_KEY
    );

  // Account changed while Firestore was loading.
  if (
    !currentUser ||
    currentUser.uid !== userId
  ) {
    return;
  }

  const normalizedValue =
    normalizeCloudValue(cloudValue);

  if (normalizedValue === null) {
    localStorage.removeItem(
      STORAGE_KEY
    );
  } else {
    localStorage.setItem(
      STORAGE_KEY,
      normalizedValue
    );
  }

  cloudReady = true;

  refreshSaveIt();
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
window
  .hideWorthItCloudLoading
  ?.();
    return;
  }

  window
    .showWorthItCloudLoading
    ?.();

  try {
    await loadSaveItForUser(user);

    console.log(
      `SaveIt loaded for ${user.email}`
    );

  } catch (error) {
    console.error(
      "SaveIt cloud load failed:",
      error
    );
  } finally {
    window
      .hideWorthItCloudLoading
      ?.();
  }
});
