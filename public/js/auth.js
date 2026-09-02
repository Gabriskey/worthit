import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  auth,
  googleProvider
} from "./firebase.js";

const WORTHIT_PRIVATE_KEYS = [
  // EarnIt
  "salary-growth-tracker-v1",
  "salary-growth-tracker-companies-v1",
  "salary-growth-tracker-ui-v1",
  "salary-growth-tracker-active-page",

  // SpendIt
  "expensepath-accounts-v1",
  "expensepath-records-v1",
  "expensepath-ui-v1",
  "showAmounts",

  // PlanIt
  "financePlanner",
  "collapsedMonths",
  "wishlistItems",
  "wishlistCollections",
  "wishlistSortState",
  "wishlistFilterState",
  "wishlistViewState",
  "worthitPayoffs",
  "worthitPurchasedItems",

  // SaveIt
  "savingsGoals"
];

function clearWorthItPrivateCache() {
  WORTHIT_PRIVATE_KEYS.forEach(
    key => localStorage.removeItem(key)
  );
}

async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(
      auth,
      googleProvider
    );

    return result.user;
  } catch (error) {
    console.error(
      "Google sign-in failed:",
      error
    );

    throw error;
  }
}

async function signOutUser() {
  try {
    clearWorthItPrivateCache();

    await signOut(auth);
  } catch (error) {
    console.error(
      "Sign-out failed:",
      error
    );

    throw error;
  }
}

function watchAuthState(callback) {
  return onAuthStateChanged(
    auth,
    callback
  );
}

export {
  signInWithGoogle,
  signOutUser,
  watchAuthState
};