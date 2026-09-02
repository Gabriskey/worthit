/* ========================================
   WORTHIT SHARED APP SHELL
   Global navigation, subnavigation and theme
   ======================================== */

(() => {
  const THEME_KEY = "worthit-theme"
const APP_CONFIG = {
  home: {
    name: "Home",
    pages: []
  },

  earnit: {
    name: "EarnIt",
    pages: [
      {
        label: "Home",
        pageId: "homePage"
      },
      {
        label: "Graph",
        pageId: "graphPage"
      },
      {
        label: "Insights",
        pageId: "insightsPage"
      }
    ]
  },

  spendit: {
    name: "SpendIt",
    pages: [
      {
        label: "Home",
        pageId: "dashboardPage"
      },
      {
        label: "Accounts",
        pageId: "accountsPage"
      },
      {
        label: "Graph",
        pageId: "graphPage"
      }
    ]
  },

  planit: {
    name: "PlanIt",
    pages: []
  },

  saveit: {
    name: "SaveIt",
    pages: []
  },

  ownit: {
    name: "OwnIt",
    pages: []
  }
}

  const MAIN_NAV = [
    {
      key: "home",
      label: "Home",
      path: "index.html"
    },
    {
      key: "earnit",
      label: "EarnIt",
      path: "earnit/index.html"
    },
    {
      key: "spendit",
      label: "SpendIt",
      path: "spendit/index.html"
    },
    {
      key: "planit",
      label: "PlanIt",
      path: "planner.html"
    },
    {
      key: "saveit",
      label: "SaveIt",
      path: "savings.html"
    },
    {
      key: "ownit",
      label: "OwnIt",
      path: "networth.html"
    }
  ]

  function normalizeRootPath(value) {
    const root = String(value || "").trim()

    if (!root) return ""

    return root.endsWith("/")
      ? root
      : `${root}/`
  }

  function getStoredTheme() {
    const storedTheme = localStorage.getItem(THEME_KEY)

    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme
    }

    const htmlTheme =
      document.documentElement.getAttribute("data-theme")

    if (htmlTheme === "light") {
      return "light"
    }

    if (document.body?.classList.contains("light-mode")) {
      return "light"
    }

    return "dark"
  }

  function updateThemeButtons(theme) {
    document
      .querySelectorAll("[data-worthit-theme-toggle]")
      .forEach(button => {
        button.textContent = theme === "dark"
          ? "☀️"
          : "🌙"

        button.setAttribute(
          "aria-label",
          theme === "dark"
            ? "Switch to light mode"
            : "Switch to dark mode"
        )

        button.setAttribute(
          "title",
          theme === "dark"
            ? "Switch to light mode"
            : "Switch to dark mode"
        )
      })
  }

  function applyWorthItTheme(theme, save = true) {
    const nextTheme = theme === "light"
      ? "light"
      : "dark"

    document.documentElement.setAttribute(
      "data-theme",
      nextTheme
    )

    document.body?.classList.toggle(
      "light-mode",
      nextTheme === "light"
    )

    if (save) {
      localStorage.setItem(THEME_KEY, nextTheme)
    }

    updateThemeButtons(nextTheme)

    window.dispatchEvent(
      new CustomEvent("worthit:themechange", {
        detail: {
          theme: nextTheme
        }
      })
    )
  }

  function toggleWorthItTheme() {
    const currentTheme = getStoredTheme()

    applyWorthItTheme(
      currentTheme === "dark"
        ? "light"
        : "dark"
    )
  }

  function buildMainNavigation(activeApp, rootPath) {
    return MAIN_NAV.map((item, index) => {
      const activeClass =
        item.key === activeApp
          ? " active"
          : ""

      const divider =
        index === 0
          ? ""
          : `<span class="worthit-shell__divider">|</span>`

      return `
        ${divider}

        <a
          class="worthit-shell__link${activeClass}"
          href="${rootPath}${item.path}"
        >
          ${item.label}
        </a>
      `
    }).join("")
  }

  function buildSubNavigation(appConfig) {
    return appConfig.pages.map((page, index) => {
      const activeClass =
        index === 0
          ? " active"
          : ""

      return `
        <button
          class="worthit-shell__sub-link${activeClass}"
          type="button"
          data-page="${page.pageId}"
          data-worthit-sub-page="${page.pageId}"
        >
          ${page.label}
        </button>
      `
    }).join("")
  }

  function updateSubNavigation(pageId) {
    document
      .querySelectorAll("[data-worthit-sub-page]")
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.worthitSubPage === pageId
        )
      })
  }

  function activatePageFallback(pageId) {
    document
      .querySelectorAll(".page")
      .forEach(page => {
        page.classList.toggle(
          "active",
          page.id === pageId
        )
      })
  }

  function openAppPage(pageId) {
    updateSubNavigation(pageId)

    if (typeof window.setPage === "function") {
      window.setPage(pageId)
      return
    }

    activatePageFallback(pageId)
  }

  function getCurrentPageId(appConfig) {
    const activePage =
      document.querySelector(".page.active")

    if (activePage?.id) {
      return activePage.id
    }

    return appConfig.pages[0]?.pageId || ""
  }

  function initializeWorthItShell() {
    const shell =
      document.getElementById("worthitShell")

    if (!shell) return

    const activeApp =
      String(shell.dataset.app || "")
        .trim()
        .toLowerCase()

    const appConfig = APP_CONFIG[activeApp]

    if (!appConfig) {
      console.error(
        `Unknown WorthIt app: ${activeApp}`
      )

      return
    }

    const rootPath = normalizeRootPath(
      shell.dataset.root
    )

    const hasSubNavigation =
  Array.isArray(appConfig.pages) &&
  appConfig.pages.length > 0

    shell.classList.add("worthit-shell")

    

    shell.innerHTML = `
      <div class="worthit-shell__top">
        <div class="worthit-shell__inner">
          <div class="worthit-shell__main">
            <a
              class="worthit-shell__brand"
              href="${rootPath}index.html"
            >
              💸 WORTHIT
            </a>

            <nav
              class="worthit-shell__nav"
              aria-label="WorthIt applications"
            >
              ${buildMainNavigation(
                activeApp,
                rootPath
              )}
            </nav>
          </div>

          <button
            class="worthit-shell__theme"
            type="button"
            data-worthit-theme-toggle
            aria-label="Toggle theme"
          >
            ☀️
          </button>
        </div>
      </div>

${hasSubNavigation
  ? `
    <div class="worthit-shell__subnav">
      <div class="worthit-shell__subnav-inner">
        <div class="worthit-shell__app-name">
          ${appConfig.name}
        </div>

        <nav
          class="worthit-shell__subnav-links"
          aria-label="${appConfig.name} pages"
        >
          ${buildSubNavigation(appConfig)}
        </nav>
      </div>
    </div>
  `
  : ""
}
    `

    const theme = getStoredTheme()
    applyWorthItTheme(theme, false)

    shell
      .querySelector("[data-worthit-theme-toggle]")
      ?.addEventListener(
        "click",
        toggleWorthItTheme
      )

    shell
      .querySelectorAll("[data-worthit-sub-page]")
      .forEach(button => {
        button.addEventListener("click", () => {
          openAppPage(
            button.dataset.worthitSubPage
          )
        })
      })
if (hasSubNavigation) {
  updateSubNavigation(
    getCurrentPageId(appConfig)
  )
}
  }

  window.applyWorthItTheme = applyWorthItTheme
  window.updateWorthItSubNavigation =
    updateSubNavigation

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeWorthItShell
    )
  } else {
    initializeWorthItShell()
  }
})()