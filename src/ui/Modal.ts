export function setupModalDismiss(
  modal: HTMLElement,
  trigger: HTMLElement,
  hiddenClass = "hidden",
): void {
  document.addEventListener("click", (e) => {
    if (
      !modal.contains(e.target as Node) &&
      !trigger.contains(e.target as Node) &&
      !modal.classList.contains(hiddenClass)
    ) {
      modal.classList.add(hiddenClass);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains(hiddenClass)) {
      modal.classList.add(hiddenClass);
    }
  });
}
