import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
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

export {
  db,
  saveUserAppState,
  loadUserAppState,
  saveUserStorageKey,
  loadUserStorageKey
};