const DEVICE_KEY = "deviceId";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  const current = window.localStorage.getItem(DEVICE_KEY);
  if (current) return current;
  const generated = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_KEY, generated);
  return generated;
}

export function persistDeviceId(value?: string | null): string {
  if (typeof window === "undefined") return value || "";
  const deviceId = value || getDeviceId();
  if (deviceId) window.localStorage.setItem(DEVICE_KEY, deviceId);
  return deviceId;
}
