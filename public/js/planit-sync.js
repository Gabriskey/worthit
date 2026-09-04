import {
  watchAuthState
} from "./auth.js";

import {
  loadUserStorageKey,
  saveUserStorageKey
} from "./database.js";

const APP_NAME = "planit";

const STORAGE_KEYS = [
  "financePlanner",
  "collapsedMonths",

  "wishlistItems",
  "wishlistCollections",
  "wishlistSortState",
  "wishlistFilterState",
  "wishlistViewState",

  "worthitPayoffs",
  "worthitPurchasedItems"
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

async function loadPlanItForUser(user) {
  cloudReady = false;

  const userId = user.uid;

  const entries =
    await Promise.all(
      STORAGE_KEYS.map(
        async storageKey => {
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
        }
      )
    );

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

      if (
        normalizedValue === null
      ) {
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

  /*
    Re-read the variables that the
    Planner/Wishlist scripts created
    before Firestore finished loading.
  */

  window
    .reloadPlanItPlannerFromStorage
    ?.();

  window
    .reloadPlanItWishlistFromStorage
    ?.();

  cloudReady = true;
}

async function savePlanItKeyToCloud(
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
    !STORAGE_KEYS.includes(
      storageKey
    )
  ) {
    return;
  }

  if (
    lastKnownValues.get(
      storageKey
    ) === rawValue
  ) {
    return;
  }

  const previousValue =
    lastKnownValues.get(
      storageKey
    );

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
      `PlanIt synced: ${storageKey}`
    );
  } catch (error) {
    if (
      lastKnownValues.get(
        storageKey
      ) === rawValue
    ) {
      lastKnownValues.set(
        storageKey,
        previousValue
      );
    }

    console.error(
      "PlanIt cloud save failed:",
      error
    );
  }
}

window.savePlanItKeyToCloud =
  savePlanItKeyToCloud;

watchAuthState(async user => {
  currentUser = user;
  cloudReady = false;

  if (!user) {
    lastKnownValues.clear();

    STORAGE_KEYS.forEach(
      storageKey => {
        localStorage.removeItem(
          storageKey
        );
      }
    );

    window
      .reloadPlanItPlannerFromStorage
      ?.();

    window
      .reloadPlanItWishlistFromStorage
      ?.();

    window
      .finishWorthItCloudLoading
      ?.();

    return;
  }

  window
    .showWorthItCloudLoading
    ?.();

  try {
    await loadPlanItForUser(user);

    console.log(
      `PlanIt loaded for ${user.email}`
    );

  } catch (error) {
    console.error(
      "PlanIt cloud load failed:",
      error
    );
  } finally {
    window
      .finishWorthItCloudLoading
      ?.();
  }
});
