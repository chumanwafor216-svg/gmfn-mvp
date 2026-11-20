const RECOGNISED_RETURNING_MEMBER_KEY = 'gsn_recognised_returning_member';

function canUseStorage(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined'
  );
}

export function markRecognisedReturningMember(): void {
  try {
    if (!canUseStorage()) return;
    window.localStorage.setItem(RECOGNISED_RETURNING_MEMBER_KEY, 'yes');
  } catch {
    // Recognition is a convenience only; entry must still work without storage.
  }
}

export function isRecognisedReturningMember(): boolean {
  try {
    if (!canUseStorage()) return false;
    return (
      String(
        window.localStorage.getItem(RECOGNISED_RETURNING_MEMBER_KEY) || ''
      )
        .trim()
        .toLowerCase() === 'yes'
    );
  } catch {
    return false;
  }
}
