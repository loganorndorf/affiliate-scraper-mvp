// Quick utility to clear session storage for debugging
export function clearAllSessionData() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('onboarding_session');
    console.log('✅ Cleared session storage');
  }
}

// Call this in browser console: clearAllSessionData()
if (typeof window !== 'undefined') {
  (window as any).clearAllSessionData = clearAllSessionData;
}