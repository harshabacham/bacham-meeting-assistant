/**
 * Permission-related constants.
 */

/** Chrome permissions required for the extension to function. */
export const REQUIRED_PERMISSIONS: chrome.permissions.Permissions = {
  permissions: ['storage', 'tabCapture', 'activeTab', 'tabs', 'alarms', 'nativeMessaging'],
};
