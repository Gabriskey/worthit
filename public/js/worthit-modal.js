/* Shared lightweight dialogs for notices and confirmations. */

(() => {
  let activeDialog = null

  function ensureDialog() {
    let dialog = document.getElementById("worthitUniversalDialog")

    if (dialog) return dialog

    dialog = document.createElement("div")
    dialog.id = "worthitUniversalDialog"
    dialog.className = "worthit-dialog"
    dialog.hidden = true
    dialog.setAttribute("aria-hidden", "true")
    dialog.innerHTML = `
      <div class="worthit-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="worthitDialogTitle" aria-describedby="worthitDialogMessage">
        <h2 class="worthit-dialog__title" id="worthitDialogTitle"></h2>
        <p class="worthit-dialog__message" id="worthitDialogMessage"></p>
        <div class="worthit-dialog__actions">
          <button class="btn btn-secondary worthit-dialog__cancel" type="button"></button>
          <button class="btn btn-primary worthit-dialog__confirm" type="button"></button>
        </div>
      </div>
    `

    document.body.appendChild(dialog)
    return dialog
  }

  function openDialog(options) {
    if (activeDialog) {
      activeDialog.close(false)
    }

    const dialog = ensureDialog()
    const title = dialog.querySelector(".worthit-dialog__title")
    const message = dialog.querySelector(".worthit-dialog__message")
    const cancelButton = dialog.querySelector(".worthit-dialog__cancel")
    const confirmButton = dialog.querySelector(".worthit-dialog__confirm")
    const trigger = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null

    title.textContent = options.title
    message.textContent = options.message
    cancelButton.textContent = options.cancelLabel
    confirmButton.textContent = options.confirmLabel
    cancelButton.hidden = !options.isConfirmation
    confirmButton.classList.toggle("worthit-dialog__confirm--danger", options.destructive)
    dialog.dataset.variant = options.variant
    dialog.hidden = false
    dialog.setAttribute("aria-hidden", "false")
    document.body.classList.add("worthit-dialog-open")

    return new Promise(resolve => {
      let settled = false

      function close(result) {
        if (settled) return
        settled = true
        activeDialog = null
        dialog.hidden = true
        dialog.setAttribute("aria-hidden", "true")
        document.body.classList.remove("worthit-dialog-open")
        document.removeEventListener("keydown", handleKeydown)

        if (trigger?.isConnected) {
          trigger.focus()
        }

        resolve(result)
      }

      function handleKeydown(event) {
        if (event.key === "Escape") {
          event.preventDefault()
          close(options.isConfirmation ? false : true)
          return
        }

        if (event.key !== "Tab") return

        const focusable = [cancelButton, confirmButton]
          .filter(button => !button.hidden && !button.disabled)

        if (!focusable.length) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }

      dialog.onclick = event => {
        if (event.target === dialog) {
          close(options.isConfirmation ? false : true)
        }
      }

      cancelButton.onclick = () => close(false)
      confirmButton.onclick = () => close(true)
      document.addEventListener("keydown", handleKeydown)

      activeDialog = { close }

      requestAnimationFrame(() => {
        ;(options.isConfirmation ? cancelButton : confirmButton).focus()
      })
    })
  }

  function notice(message, options = {}) {
    return openDialog({
      title: options.title || "Notice",
      message: String(message || ""),
      confirmLabel: options.confirmLabel || "OK",
      cancelLabel: "",
      destructive: false,
      isConfirmation: false,
      variant: options.variant || "info"
    })
  }

  function confirm(message, options = {}) {
    return openDialog({
      title: options.title || "Please confirm",
      message: String(message || ""),
      confirmLabel: options.confirmLabel || "Confirm",
      cancelLabel: options.cancelLabel || "Cancel",
      destructive: Boolean(options.destructive),
      isConfirmation: true,
      variant: options.variant || "warning"
    })
  }

  window.WorthItModal = { notice, confirm }
})()
