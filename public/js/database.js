import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  runTransaction,
  serverTimestamp,
  FieldPath
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  app
} from "./firebase.js";

const db = getFirestore(app);

function emitCloudStorageSaved(
  userId,
  appName,
  storageKey
) {
  window.dispatchEvent(
    new CustomEvent(
      "worthit:cloud-storage-saved",
      {
        detail: {
          userId,
          appName,
          storageKey
        }
      }
    )
  );
}

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

  emitCloudStorageSaved(
    userId,
    appName,
    storageKey
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

async function loadUserNetWorthSnapshots(
  userId
) {
  if (!userId) {
    throw new Error(
      "Cannot load Net Worth history without a user ID."
    );
  }

  const snapshotsRef = collection(
    db,
    "users",
    userId,
    "netWorthSnapshots"
  );
  const snapshots = await getDocs(snapshotsRef);

  return snapshots.docs.map(snapshot => snapshot.data());
}

// Today's eligible snapshot is the only history document the client can refresh.
async function refreshUserNetWorthSnapshot(
  userId,
  snapshotDate,
  buildSnapshot
) {
  if (!userId) {
    throw new Error(
      "Cannot refresh a Net Worth snapshot without a user ID."
    );
  }

  if (!snapshotDate) {
    throw new Error(
      "Cannot refresh a Net Worth snapshot without a date."
    );
  }

  if (typeof buildSnapshot !== "function") {
    throw new Error(
      "Cannot refresh a Net Worth snapshot without a calculation."
    );
  }

  const spendItRef = doc(
    db,
    "users",
    userId,
    "apps",
    "spendit"
  );
  const planItRef = doc(
    db,
    "users",
    userId,
    "apps",
    "planit"
  );

  const snapshotRef = doc(
    db,
    "users",
    userId,
    "netWorthSnapshots",
    snapshotDate
  );

  return runTransaction(db, async transaction => {
    const [spendItState, planItState, existing] = await Promise.all([
      transaction.get(spendItRef),
      transaction.get(planItRef),
      transaction.get(snapshotRef)
    ]);
    const outcome = await buildSnapshot(
      spendItState.exists() ? spendItState.data().data ?? null : null,
      planItState.exists() ? planItState.data().data ?? null : null
    );

    if (!outcome) {
      return { status: "skipped" };
    }

    const snapshot = outcome.snapshot;

    if (existing.exists()) {
      transaction.update(snapshotRef, {
        netWorth: snapshot.netWorth,
        totalAccountBalances: snapshot.totalAccountBalances,
        remainingLiabilities: snapshot.remainingLiabilities,
        updatedAt: serverTimestamp()
      });

      return {
        status: "updated",
        ...outcome
      };
    }

    transaction.set(snapshotRef, {
      date: snapshot.date,
      netWorth: snapshot.netWorth,
      totalAccountBalances: snapshot.totalAccountBalances,
      remainingLiabilities: snapshot.remainingLiabilities,
      capturedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      timezone: snapshot.timezone,
      calculationVersion: snapshot.calculationVersion
    });

    return {
      status: "created",
      ...outcome
    };
  });
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
  loadUserNetWorthSnapshots,
  refreshUserNetWorthSnapshot,
  runUserStorageRestoreTransaction
};
