# WorthIt Development Instructions

WorthIt is a personal finance web app hosted on Firebase.

The developer using this repository is still learning web development, so changes should be small, understandable, and easy to review.

---

## Project Structure

Firebase Hosting deploys only the `/public` directory.

Main apps:

- EarnIt — income and earnings tracking
- SpendIt — accounts, income, expenses, and transaction records
- PlanIt — financial planning and wishlist tools
- SaveIt — savings goals
- OwnIt — net worth calculations derived from other WorthIt data

Shared code lives primarily in:

- `/public/js`
- `/public/css`

Do not create duplicate root copies of files that already belong inside `/public`.

---

## Firebase

WorthIt uses:

- Firebase Hosting
- Firebase Authentication
- Cloud Firestore
- localStorage as a local browser cache

Firestore data is user-specific.

Existing Firebase configuration and user data must be treated as production data.

### Never do these unless explicitly requested

- Do not run `firebase deploy`.
- Do not deploy Firestore rules.
- Do not change the Firebase project ID.
- Do not change Firebase configuration.
- Do not delete Firestore documents.
- Do not perform database migrations.
- Do not modify authentication configuration.
- Do not reset or clear user data.

The human developer performs deployment manually after testing.

---

## Data Safety

Preserving existing user data is a top priority.

Do not rename, remove, or change the meaning of existing localStorage keys or Firestore storage keys unless explicitly requested.

Important existing storage includes data for:

- EarnIt
- SpendIt
- PlanIt
- SaveIt
- shared WorthIt settings

Do not assume an empty localStorage value means the user's cloud data is empty.

Do not add automatic destructive migrations.

When changing synchronization logic:

1. Inspect the existing Firebase and localStorage behavior first.
2. Preserve backwards compatibility.
3. Avoid overwriting sibling data.
4. Never delete unrelated records.
5. Prefer stable IDs when linking records between apps.

---

## EarnIt and SpendIt

EarnIt and SpendIt have an existing linked-record system.

An EarnIt income can create a corresponding SpendIt income.

Linked SpendIt records may contain fields such as:

- `source: "earnit"`
- `earnItEntryId`
- a stable linked SpendIt record ID

Existing behavior includes:

- creating a SpendIt income from EarnIt
- editing the linked record
- moving it to another SpendIt account
- optionally deleting the linked SpendIt record
- optionally deleting linked SpendIt records when clearing EarnIt entries

Never delete manually created SpendIt transactions when modifying EarnIt-linked records.

Before changing this bridge, inspect:

- `/public/earnit/index.html`
- `/public/js/earnit-spendit-bridge.js`
- `/public/js/earnit-sync.js`
- `/public/js/spendit-sync.js`
- `/public/spendit/index.html`

---

## Editing Rules

Before editing:

1. Inspect the relevant existing implementation.
2. Search for related functions and storage keys.
3. Understand how the feature currently saves and loads data.
4. Prefer extending existing code over creating duplicate systems.

While editing:

- Make the smallest reasonable change.
- Do not refactor unrelated code.
- Do not rename files unnecessarily.
- Preserve current UI and behavior unless the request requires changing them.
- Keep existing coding style where practical.
- Do not replace working systems just because another architecture may be cleaner.
- Do not silently remove features.
- Do not introduce new frameworks unless explicitly requested.

---

## Git Rules

Git is used as the project's safety/checkpoint system.

Do not:

- run `git commit`
- run `git push`
- create branches
- rewrite Git history
- reset commits

unless explicitly requested.

The human developer reviews and commits changes manually.

Before making significant changes, check the current repository state when appropriate.

After making changes, report which files were modified.

---

## Codex Task Workflow

For each coding task:

### Before making changes

Briefly explain:

- what files appear relevant
- what existing behavior you found
- what you plan to change

Then make the requested changes.

### After making changes

Report:

1. Files changed
2. What changed in each file
3. Why the change was needed
4. Any important data-safety considerations
5. Exact manual testing steps

Keep explanations beginner-friendly.

Do not deploy after completing a task.

---

## Testing

Prefer safe, reversible tests.

For features involving money or linked records:

- use tiny temporary values when possible
- verify record counts before and after
- verify balances
- verify edits do not create duplicates
- verify manual SpendIt records remain untouched

When testing deletion behavior, never use real production data unnecessarily.

---

## Scope Discipline

Only change what the task requires.

For example, if asked to modify EarnIt:

Do not also redesign SpendIt, OwnIt, authentication, Firebase configuration, or unrelated UI unless required for the requested behavior.

If a requested change appears to require a risky migration or destructive data operation, stop and explain the risk before performing it.

---

## Developer Preference

The developer prefers:

- incremental changes
- simple explanations
- minimal code edits
- preservation of existing functionality
- explicit testing instructions

Avoid unnecessary abstractions or large rewrites.

When possible, explain new concepts in plain language.