export type ToastType = "success" | "error";

export function showToast(message: string, type: ToastType = "success"): void {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.className = `toast-message toast-${type}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => document.body.removeChild(toast), 500);
  }, 4000);
}
