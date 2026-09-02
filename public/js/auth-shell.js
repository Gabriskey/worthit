import {
  signInWithGoogle,
  signOutUser,
  watchAuthState
} from "./auth.js";

import "./cloud-loading.js";


function getUserLabel(user) {
  const displayName =
    String(user?.displayName || "").trim();

  if (displayName) {
    return displayName.split(/\s+/)[0];
  }

  return (
    user?.email?.split("@")[0] ||
    "Account"
  );
}


function initializeAuthShell() {
  const shell =
    document.getElementById("worthitShell");

  if (!shell) return;


  const themeButton =
    shell.querySelector(
      "[data-worthit-theme-toggle]"
    );

  if (!themeButton) return;


  const actions =
    document.createElement("div");

  actions.className =
    "worthit-shell__actions";

  actions.dataset.worthitAccountActions =
    "";


  const accountWrap =
    document.createElement("div");

  accountWrap.className =
    "worthit-shell__account-wrap";


  const accountButton =
    document.createElement("button");

  accountButton.type = "button";

  accountButton.className =
    "worthit-shell__account";

  accountButton.dataset.worthitAccountButton =
    "";

  accountButton.textContent =
    "Sign in";

  accountButton.setAttribute(
    "aria-expanded",
    "false"
  );


  const accountMenu =
    document.createElement("div");

  accountMenu.className =
    "worthit-shell__account-menu";

  accountMenu.dataset.worthitAccountMenu =
    "";


  accountWrap.append(
    accountButton,
    accountMenu
  );

  function setCloudStatus(
  text,
  state = "saved"
) {
  const status =
    accountMenu.querySelector(
      "[data-worthit-cloud-status]"
    );

  if (!status) return;

  status.dataset.state =
    state;

  status.querySelector(
    "[data-worthit-cloud-status-text]"
  ).textContent =
    text;
}

  themeButton.before(actions);

  actions.append(
    accountWrap,
    themeButton
  );


  function closeMenu() {
    accountWrap.classList.remove(
      "is-open"
    );

    accountButton.setAttribute(
      "aria-expanded",
      "false"
    );
  }


  function toggleMenu() {
    const isOpen =
      accountWrap.classList.toggle(
        "is-open"
      );

    accountButton.setAttribute(
      "aria-expanded",
      String(isOpen)
    );
  }


  watchAuthState(user => {
    closeMenu();


    if (!user) {
      accountButton.textContent =
        "Sign in";

      accountMenu.innerHTML =
        "";

      accountButton.onclick =
        async event => {
          event.stopPropagation();

          try {
            await signInWithGoogle();
          } catch (error) {
            console.error(
              "Could not sign in:",
              error
            );
          }
        };

      return;
    }


    const label =
      getUserLabel(user);


    accountButton.innerHTML =
      `
        <span>${label}</span>

        <span
          class="worthit-shell__account-chevron"
          aria-hidden="true"
        >
          ▾
        </span>
      `;


accountMenu.innerHTML =
  `
    <div
      class="worthit-shell__account-info"
    >
      <strong>${label}</strong>
      <span>${user.email || ""}</span>
    </div>

    <div
      class="worthit-shell__cloud-status"
      data-worthit-cloud-status
      data-state="saved"
    >
      <span
        class="worthit-shell__cloud-dot"
        aria-hidden="true"
      ></span>

      <span
        data-worthit-cloud-status-text
      >
        Saved to cloud
      </span>
    </div>

    <div
      class="worthit-shell__account-divider"
    ></div>

    <button
      class="worthit-shell__signout"
      type="button"
      data-worthit-signout
    >
      Sign out
    </button>
  `;


    accountButton.onclick =
      event => {
        event.stopPropagation();
        toggleMenu();
      };


    const signOutButton =
      accountMenu.querySelector(
        "[data-worthit-signout]"
      );


    signOutButton.onclick =
      async event => {
        event.stopPropagation();

        closeMenu();

        const confirmed =
          confirm(
            `Sign out of WorthIt?\n\n${user.email}`
          );

        if (!confirmed) return;

        try {
          await signOutUser();
        } catch (error) {
          console.error(
            "Could not sign out:",
            error
          );
        }
      };
  });

  window.addEventListener(
  "worthit:cloud-saving",
  () => {
    setCloudStatus(
      "Saving...",
      "saving"
    );
  }
);


window.addEventListener(
  "worthit:cloud-saved",
  () => {
    setCloudStatus(
      "Saved to cloud",
      "saved"
    );
  }
);


window.addEventListener(
  "worthit:cloud-error",
  () => {
    setCloudStatus(
      "Sync problem",
      "error"
    );
  }
);

  document.addEventListener(
    "click",
    event => {
      if (
        !accountWrap.contains(
          event.target
        )
      ) {
        closeMenu();
      }
    }
  );


  document.addEventListener(
    "keydown",
    event => {
      if (event.key === "Escape") {
        closeMenu();
      }
    }
  );
}


if (
  document.readyState === "complete"
) {
  initializeAuthShell();
} else {
  document.addEventListener(
    "DOMContentLoaded",
    initializeAuthShell,
    { once: true }
  );
}