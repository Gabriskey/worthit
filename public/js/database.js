import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
  FieldPath
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  app
} from "./firebase.js";

const db = getFirestore(app);

async function saveUserAppState(
  userId,
  appName,
  data
) {
  if (!userId) {
    throw new Error(
      "Cannot save data without a user ID."
    );
  }

  if (!appName) {
    throw new Error(
      "Cannot save data without an app name."
    );
  }

  const appRef = doc(
    db,
    "users",
    userId,
    "apps",
    appName
  );

  await setDoc(
    appRef,
    {
      data,
      updatedAt: serverTimestamp()
    },
    {
      merge: true
    }
  );
}

async function loadUserAppState(
  userId,
  appName
) {
  if (!userId) {
    throw new Error(
      "Cannot load data without a user ID."
    );
  }

  if (!appName) {
    throw new Error(
      "Cannot load data without an app name."
    );
  }

  const appRef = doc(
    db,
    "users",
    userId,
    "apps",
    appName
  );

  const snapshot =
    await getDoc(appRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data().data ?? null;
}

async function saveUserStorageKey(
  userId,
  appName,
  storageKey,
  value
) {
  if (!userId) {
    throw new Error(
      "Cannot save data without a user ID."
    );
  }

  if (!appName) {
    throw new Error(
      "Cannot save data without an app name."
    );
  }

  if (!storageKey) {
    throw new Error(
      "Cannot save data without a storage key."
    );
  }

  const appRef = doc(
    db,
    "users",
    userId,
    "apps",
    appName
  );

  const storageField =
    new FieldPath(
      "data",
      "storage",
      storageKey
    );

window.dispatchEvent(
  new CustomEvent(
    "worthit:cloud-saving"
  )
);

try {

  await setDoc(
    appRef,
    {
      data: {
        storage: {
          [storageKey]: value
        }
      },

      updatedAt:
        serverTimestamp()
    },
    {
      mergeFields: [
        storageField,
        "updatedAt"
      ]
    }
  );

  window.dispatchEvent(
    new CustomEvent(
      "worthit:cloud-saved"
    )
  );

} catch (error) {

  window.dispatchEvent(
    new CustomEvent(
      "worthit:cloud-error"
    )
  );

  throw error;

}
}

async function loadUserStorageKey(
  userId,
  appName,
  storageKey
) {
  const state =
    await loadUserAppState(
      userId,
      appName
    );

  const storage =
    state?.storage;

  if (
    !storage ||
    typeof storage !== "object"
  ) {
    return null;
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      storage,
      storageKey
    )
  ) {
    return null;
  }

  return storage[storageKey];
}

// Restore uses one transaction so selected app documents change together.
async function runUserStorageRestoreTransaction(
  userId,
  appNames,
  buildRestore
) {
  if (!userId) {
    throw new Error(
      "Cannot restore data without a user ID."
    );
  }

  if (!Array.isArray(appNames) || !appNames.length) {
    throw new Error(
      "Cannot restore data without app documents."
    );
  }

  if (typeof buildRestore !== "function") {
    throw new Error(
      "Cannot restore data without a restore plan."
    );
  }

  const uniqueAppNames = [...new Set(appNames)];

  return runTransaction(db, async transaction => {
    const appRefs = new Map(
      uniqueAppNames.map(appName => [
        appName,
        doc(db, "users", userId, "apps", appName)
      ])
    );
    const snapshots = await Promise.all(
      [...appRefs.entries()].map(async ([appName, appRef]) => [
        appName,
        await transaction.get(appRef)
      ])
    );
    const currentStates = new Map(
      snapshots.map(([appName, snapshot]) => [
        appName,
        snapshot.exists() ? snapshot.data().data ?? null : null
      ])
    );
    const result = await buildRestore(currentStates);
    const storageUpdates = result?.storageUpdates

    if (!storageUpdates || typeof storageUpdates !== "object") {
      throw new Error("The restore plan is invalid.");
    }

    Object.entries(storageUpdates).forEach(([appName, storage]) => {
      if (!appRefs.has(appName)) {
        throw new Error("The restore plan includes an unknown app document.");
      }

      if (!storage || typeof storage !== "object") {
        throw new Error("The restore plan has invalid storage updates.");
      }

      const storageKeys = Object.keys(storage);
      if (!storageKeys.length) return;

      transaction.set(
        appRefs.get(appName),
        {
          data: { storage },
          updatedAt: serverTimestamp()
        },
        {
          mergeFields: [
            ...storageKeys.map(storageKey => new FieldPath(
              "data", "storage", storageKey
            )),
            "updatedAt"
          ]
        }
      );
    });

    return result;
  });
}

export {
  db,
  saveUserAppState,
  loadUserAppState,
  saveUserStorageKey,
  loadUserStorageKey,
  runUserStorageRestoreTransaction
};
