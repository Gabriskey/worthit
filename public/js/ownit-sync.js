import {
  watchAuthState
} from "./auth.js";

import {
  loadUserStorageKey
} from "./database.js";


const CLOUD_KEYS = [
  {
    appName: "spendit",
    storageKey:
      "expensepath-accounts-v1"
  },

  {
    appName: "spendit",
    storageKey:
      "expensepath-records-v1"
  },

  {
    appName: "saveit",
    storageKey:
      "savingsGoals"
  },

  {
    appName: "planit",
    storageKey:
      "financePlanner"
  },

  {
    appName: "planit",
    storageKey:
      "wishlistItems"
  },

  {
    appName: "planit",
    storageKey:
      "worthitPayoffs"
  }
];


let currentUser = null;


function normalizeCloudValue(value) {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}


function refreshOwnIt() {
  if (
    typeof window.renderNetWorthPage ===
    "function"
  ) {
    window.renderNetWorthPage();
  }
}


async function loadOwnItForUser(user) {
  const userId =
    user.uid;


  const entries =
    await Promise.all(
      CLOUD_KEYS.map(
        async ({
          appName,
          storageKey
        }) => {

          const value =
            await loadUserStorageKey(
              userId,
              appName,
              storageKey
            );

          return {
            storageKey,
            value
          };
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
    ({
      storageKey,
      value
    }) => {

      const normalizedValue =
        normalizeCloudValue(value);


      if (
        normalizedValue === null
      ) {
        localStorage.removeItem(
          storageKey
        );

        return;
      }


      localStorage.setItem(
        storageKey,
        normalizedValue
      );
    }
  );


  refreshOwnIt();
}


watchAuthState(async user => {
  currentUser = user;


  if (!user) {

    CLOUD_KEYS.forEach(
      ({ storageKey }) => {
        localStorage.removeItem(
          storageKey
        );
      }
    );


    refreshOwnIt();

    window
      .finishWorthItCloudLoading
      ?.();

    return;
  }


  window
    .showWorthItCloudLoading
    ?.();


  try {

    await loadOwnItForUser(
      user
    );


    console.log(
      `OwnIt loaded for ${user.email}`
    );

  } catch (error) {

    console.error(
      "OwnIt cloud load failed:",
      error
    );
  } finally {
    window
      .finishWorthItCloudLoading
      ?.();
  }
});
