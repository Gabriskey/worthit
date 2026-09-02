import {
  watchAuthState
} from "./auth.js";

import {
  loadUserStorageKey,
  saveUserStorageKey
} from "./database.js";


const APP_NAME =
  "earnit";


const STORAGE_KEYS = [
  "salary-growth-tracker-v1",
  "salary-growth-tracker-companies-v1",
  "salary-growth-tracker-ui-v1",
  "salary-growth-tracker-active-page"
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


async function loadEarnItForUser(user) {
  cloudReady = false;

  const userId =
    user.uid;


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


  window
    .reloadEarnItFromStorage
    ?.();


  cloudReady = true;
}


async function saveEarnItKeyToCloud(
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
      `EarnIt synced: ${storageKey}`
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
      "EarnIt cloud save failed:",
      error
    );
  }
}


window.saveEarnItKeyToCloud =
  saveEarnItKeyToCloud;


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
      .reloadEarnItFromStorage
      ?.();


    return;
  }


  try {

    await loadEarnItForUser(
      user
    );


    console.log(
      `EarnIt loaded for ${user.email}`
    );

    window
  .finishWorthItCloudLoading
  ?.();

  } catch (error) {

    console.error(
      "EarnIt cloud load failed:",
      error
    );

  }
});