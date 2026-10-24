export function isPlatformPush(data: Record<string, unknown> | undefined, role?: string, userId?: string) {
  return role === 'SuperAdmin' && !!userId && data?.kind === 'platform_notification' &&
    data.user_key === userId && typeof data.id === 'string' && /^\d{1,20}$/.test(data.id);
}

export function pushTarget(data: Record<string, unknown> | undefined, storeKey: string) {
  if (
    !data ||
    data.store_key !== storeKey ||
    typeof data.id !== 'string' ||
    !/^[A-Za-z0-9-]{1,100}$/.test(data.id)
  )
    return null;
  if (data.kind !== 'alert' && data.kind !== 'cheque') return null;
  return { module: data.kind === 'cheque' ? 'cheques' : 'alerts', id: data.id };
}
