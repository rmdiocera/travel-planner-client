export function useVerificationToast() {
  const { showToast } = useAppToast()

  function showVerified(hint?: string) {
    showToast('Your email is verified.', 'i-lucide-circle-check', hint)
  }

  function showInvalidLink(hint?: string) {
    showToast('This verification link is invalid or has expired.', 'i-lucide-circle-x', hint, 'error')
  }

  return { showVerified, showInvalidLink }
}
