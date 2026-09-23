import type { ToastProps } from "@nuxt/ui"

export function useAppToast() {
  const toast = useToast()

  function showToast(title: string, icon: string, description?: string, color?: ToastProps['color']) {
    toast.add({ title, icon, description, color })
  }

  return { showToast }
}