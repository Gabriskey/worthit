const CLOUD_LOADING_APPS =
  new Set([
    "home",
    "earnit",
    "spendit",
    "planit",
    "saveit",
    "ownit"
  ]);


function shouldShowCloudLoading() {
  const shell =
    document.getElementById(
      "worthitShell"
    );

  const appName =
    String(
      shell?.dataset.app || ""
    )
      .trim()
      .toLowerCase();

  return CLOUD_LOADING_APPS.has(
    appName
  );
}

function createCloudLoadingScreen() {
  if (
    document.querySelector(
      "[data-worthit-cloud-loading]"
    )
  ) {
    return;
  }

  const loadingScreen =
    document.createElement("div");

  loadingScreen.className =
    "worthit-cloud-loading";

  loadingScreen.dataset
    .worthitCloudLoading = "";

  loadingScreen.innerHTML = `
    <div class="worthit-cloud-loading__inner">
      <div class="worthit-cloud-loading__mark">
        💸
      </div>

      <div class="worthit-cloud-loading__text">
        Loading WorthIt...
      </div>
    </div>
  `;

  document.body.appendChild(
    loadingScreen
  );
}


function showCloudLoading() {
  if (!shouldShowCloudLoading()) {
    return;
  }

  createCloudLoadingScreen();

  document.documentElement.classList.add(
    "worthit-cloud-is-loading"
  );
}


function hideCloudLoading() {
  document.documentElement.classList.remove(
    "worthit-cloud-is-loading"
  );
}


window.showWorthItCloudLoading =
  showCloudLoading;

window.hideWorthItCloudLoading =
  hideCloudLoading;

  window.finishWorthItCloudLoading =
  hideCloudLoading;


if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    showCloudLoading,
    { once: true }
  );
} else {
  showCloudLoading();
}
