/**
 * Application-level constants.
 */

/** Native messaging host identifier — must match the Desktop App's native messaging manifest. */
export const NATIVE_HOST_NAME = 'com.bacham.host' as const;

/** Native messaging protocol version — bump when breaking changes are made to the protocol. */
export const NATIVE_MESSAGING_PROTOCOL_VERSION = '1.0' as const;

/** Chrome alarm name for native messaging heartbeat. */
export const HEARTBEAT_ALARM_NAME = 'bacham.heartbeat' as const;

/** Chrome alarm name for screenshot interval. */
export const SCREENSHOT_ALARM_NAME = 'bacham.screenshot' as const;

/** Maximum number of messages in the native messaging outbound queue. */
export const MESSAGE_QUEUE_MAX_CAPACITY = 100 as const;

/** Extension display name. */
export const APP_NAME = 'BACHAM' as const;
