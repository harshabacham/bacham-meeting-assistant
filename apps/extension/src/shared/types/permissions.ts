/**
 * Names of Chrome permissions the extension may need.
 * Only permissions declared in the manifest appear here.
 */
export type PermissionName =
  | 'storage'
  | 'tabCapture'
  | 'activeTab'
  | 'tabs'
  | 'alarms'
  | 'nativeMessaging';

/** Grant state of a single permission. */
export type PermissionGrantState = 'granted' | 'denied' | 'prompt';

/**
 * Aggregated permission status covering all extension-required permissions.
 */
export interface PermissionStatus {
  readonly tabCapture: PermissionGrantState;
  readonly storage: PermissionGrantState;
  /** True if ALL required permissions are granted. */
  readonly allGranted: boolean;
}
