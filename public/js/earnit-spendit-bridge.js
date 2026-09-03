import {
  watchAuthState
} from "./auth.js";

import {
  loadUserStorageKey,
  saveUserStorageKey
} from "./database.js";

const SPENDIT_APP =
  "spendit";

const SPENDIT_ACCOUNT_KEY =
  "expensepath-accounts-v1";

const SPENDIT_RECORD_KEY =
  "expensepath-records-v1";

let currentUser = null;


let spendItAccounts = [];


function parseStorageArray(value) {
  if (value === null) {
    return [];
  }

  try {
    const parsed =
      typeof value === "string"
        ? JSON.parse(value)
        : value;

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.error(
      "Could not read SpendIt accounts:",
      error
    );

    return [];
  }
}


function setDefaultPaidTime() {
  const input =
    document.getElementById(
      "paidTimeInput"
    );

  if (
    !input ||
    input.value
  ) {
    return;
  }

  const now =
    new Date();

  const hours =
    String(
      now.getHours()
    ).padStart(2, "0");

  const minutes =
    String(
      now.getMinutes()
    ).padStart(2, "0");

  input.value =
    `${hours}:${minutes}`;
}


function renderSpendItAccounts() {
  const select =
    document.getElementById(
      "spendItAccountSelect"
    );

  if (!select) return;


  const previousValue =
    select.value;


  select.innerHTML = "";


  const placeholder =
    document.createElement(
      "option"
    );

  placeholder.value = "";


  if (!spendItAccounts.length) {
    placeholder.textContent =
      "No SpendIt accounts found";

    select.appendChild(
      placeholder
    );

    select.disabled = true;

    return;
  }


  placeholder.textContent =
    "Choose SpendIt account";

  select.appendChild(
    placeholder
  );


  spendItAccounts.forEach(
    account => {
      if (
        !account ||
        !account.id
      ) {
        return;
      }

      const option =
        document.createElement(
          "option"
        );

      option.value =
        String(account.id);

      option.textContent =
        String(
          account.name ||
          "Unnamed account"
        );

      select.appendChild(
        option
      );
    }
  );


  select.disabled = false;


  const previousStillExists =
    spendItAccounts.some(
      account =>
        String(account.id) ===
        previousValue
    );


  if (previousStillExists) {
    select.value =
      previousValue;
  }
}


async function loadSpendItAccounts(
  user
) {
  const value =
    await loadUserStorageKey(
      user.uid,
      SPENDIT_APP,
      SPENDIT_ACCOUNT_KEY
    );

  spendItAccounts =
    parseStorageArray(value);

  renderSpendItAccounts();

  setDefaultPaidTime();
}

async function syncEarnItEntryToSpendIt(
  entry
) {
  if (!currentUser) {
    throw new Error(
      "No signed-in user."
    );
  }

  if (!entry?.id) {
    throw new Error(
      "EarnIt entry has no ID."
    );
  }

  if (!entry.spendItAccountId) {
    throw new Error(
      "No SpendIt account selected."
    );
  }

  const rawRecords =
    await loadUserStorageKey(
      currentUser.uid,
      SPENDIT_APP,
      SPENDIT_RECORD_KEY
    );

  let records =
    parseStorageArray(
      rawRecords
    );

  const recordId =
    entry.spendItRecordId ||
    `earnit_${entry.id}`;

  const existingIndex =
    records.findIndex(
      record =>
        String(record.id) ===
          String(recordId) ||
        (
          record.source === "earnit" &&
          String(
            record.earnItEntryId
          ) === String(entry.id)
        )
    );

  const existingRecord =
    existingIndex >= 0
      ? records[existingIndex]
      : null;

  const now =
    Date.now();

  const spendItRecord = {
    ...(existingRecord || {}),

    id: recordId,

    type: "income",

    amount:
      Number(entry.salary || 0),

    accountId:
      String(
        entry.spendItAccountId
      ),

    category: "Income",
    subcategory: "",

    description:
      String(
        entry.job || ""
      ).trim(),

    date:
      String(
        entry.date || ""
      ),

    time:
      String(
        entry.paidTime || ""
      ),

    source: "earnit",

    earnItEntryId:
      String(entry.id),

    createdAt:
      existingRecord?.createdAt ||
      now,

    updatedAt:
      now
  };

  if (existingIndex >= 0) {
    records[existingIndex] =
      spendItRecord;
  } else {
    records.unshift(
      spendItRecord
    );
  }

  await saveUserStorageKey(
    currentUser.uid,
    SPENDIT_APP,
    SPENDIT_RECORD_KEY,
    JSON.stringify(records)
  );

  return spendItRecord;
}

async function renameEarnItCompanyInSpendIt(
  earnItEntries,
  companyName
) {
  if (!currentUser) {
    throw new Error(
      "No signed-in user."
    );
  }

  const safeEntries =
    Array.isArray(earnItEntries)
      ? earnItEntries.filter(
          entry => entry?.id
        )
      : [];

  if (!safeEntries.length) {
    return 0;
  }

  const entryIds =
    new Set(
      safeEntries.map(
        entry => String(entry.id)
      )
    );

  const recordIds =
    new Set(
      safeEntries.map(
        entry => String(
          entry.spendItRecordId ||
          `earnit_${entry.id}`
        )
      )
    );

  const rawRecords =
    await loadUserStorageKey(
      currentUser.uid,
      SPENDIT_APP,
      SPENDIT_RECORD_KEY
    );

  const records =
    parseStorageArray(
      rawRecords
    );

  let updatedCount = 0;

  const nextRecords =
    records.map(record => {
      /*
        Only EarnIt-created records can be
        changed by a company rename.
      */
      if (
        record?.source !== "earnit"
      ) {
        return record;
      }

      const matchesRecordId =
        recordIds.has(
          String(record.id || "")
        );

      const matchesEntryId =
        entryIds.has(
          String(
            record.earnItEntryId ||
            ""
          )
        );

      if (
        !matchesRecordId &&
        !matchesEntryId
      ) {
        return record;
      }

      if (
        record.description === companyName
      ) {
        return record;
      }

      updatedCount += 1;

      return {
        ...record,
        description: companyName
      };
    });

  if (!updatedCount) {
    return 0;
  }

  await saveUserStorageKey(
    currentUser.uid,
    SPENDIT_APP,
    SPENDIT_RECORD_KEY,
    JSON.stringify(nextRecords)
  );

  return updatedCount;
}

async function deleteEarnItEntryFromSpendIt(
  entry
) {
  if (!currentUser) {
    throw new Error(
      "No signed-in user."
    );
  }

  if (!entry?.id) {
    throw new Error(
      "EarnIt entry has no ID."
    );
  }

  const rawRecords =
    await loadUserStorageKey(
      currentUser.uid,
      SPENDIT_APP,
      SPENDIT_RECORD_KEY
    );

  const records =
    parseStorageArray(
      rawRecords
    );

  const recordId =
    entry.spendItRecordId ||
    `earnit_${entry.id}`;

  const nextRecords =
    records.filter(
      record =>
        !(
          String(record.id) ===
            String(recordId) ||
          (
            record.source === "earnit" &&
            String(
              record.earnItEntryId
            ) === String(entry.id)
          )
        )
    );

  /*
    Nothing linked was found.
    That is safe — there is simply
    nothing in SpendIt to delete.
  */
  if (
    nextRecords.length ===
    records.length
  ) {
    return false;
  }

  await saveUserStorageKey(
    currentUser.uid,
    SPENDIT_APP,
    SPENDIT_RECORD_KEY,
    JSON.stringify(nextRecords)
  );

  return true;
}

async function deleteAllEarnItEntriesFromSpendIt(
  earnItEntries
) {
  if (!currentUser) {
    throw new Error(
      "No signed-in user."
    );
  }

  const safeEntries =
    Array.isArray(earnItEntries)
      ? earnItEntries
      : [];

  if (!safeEntries.length) {
    return 0;
  }

  const entryIds =
    new Set(
      safeEntries
        .map(entry =>
          String(
            entry?.id || ""
          )
        )
        .filter(Boolean)
    );

  const recordIds =
    new Set(
      safeEntries
        .map(entry => {
          if (!entry?.id) {
            return "";
          }

          return String(
            entry.spendItRecordId ||
            `earnit_${entry.id}`
          );
        })
        .filter(Boolean)
    );

  const rawRecords =
    await loadUserStorageKey(
      currentUser.uid,
      SPENDIT_APP,
      SPENDIT_RECORD_KEY
    );

  const records =
    parseStorageArray(
      rawRecords
    );

  const nextRecords =
    records.filter(record => {

      /*
        Never touch manually created
        SpendIt records.
      */
      if (
        record.source !== "earnit"
      ) {
        return true;
      }

      const matchesEntryId =
        entryIds.has(
          String(
            record.earnItEntryId ||
            ""
          )
        );

      const matchesRecordId =
        recordIds.has(
          String(
            record.id || ""
          )
        );

      return !(
        matchesEntryId ||
        matchesRecordId
      );
    });

  const deletedCount =
    records.length -
    nextRecords.length;

  if (!deletedCount) {
    return 0;
  }

  await saveUserStorageKey(
    currentUser.uid,
    SPENDIT_APP,
    SPENDIT_RECORD_KEY,
    JSON.stringify(nextRecords)
  );

  return deletedCount;
}

watchAuthState(async user => {

  currentUser = user;

  spendItAccounts = [];


  if (!user) {
    renderSpendItAccounts();

    return;
  }


  try {
    await loadSpendItAccounts(
      user
    );
  } catch (error) {
    console.error(
      "Could not load SpendIt accounts into EarnIt:",
      error
    );

    renderSpendItAccounts();
  }

});


window.getSpendItAccountsForEarnIt =
  function() {
    return spendItAccounts.map(
      account => ({
        ...account
      })
    );
  };

  window.syncEarnItEntryToSpendIt =
  syncEarnItEntryToSpendIt;

  window.renameEarnItCompanyInSpendIt =
  renameEarnItCompanyInSpendIt;

  window.deleteEarnItEntryFromSpendIt =
  deleteEarnItEntryFromSpendIt;

  window.deleteAllEarnItEntriesFromSpendIt =
  deleteAllEarnItEntriesFromSpendIt;
