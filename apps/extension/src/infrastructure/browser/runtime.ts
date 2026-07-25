/**
 * Typed wrapper over chrome.runtime API.
 *
 * No other file in the codebase may call chrome.runtime directly.
 */
import type { InternalMessage, InternalResponse } from '@/shared/types';

/**
 * Send a typed message to the background service worker.
 * Returns the response or throws if the runtime reports an error.
 */
export async function sendToBackground<TPayload, TResponse>(
  message: InternalMessage<TPayload>,
): Promise<InternalResponse<TResponse>> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: InternalResponse<TResponse>) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

/**
 * Listen for messages from the background service worker.
 * Returns a cleanup function to remove the listener.
 */
export function onMessageFromBackground(
  handler: (message: InternalMessage, sendResponse: (response: InternalResponse) => void) => void,
): () => void {
  const listener = (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ): boolean => {
    handler(
      message as InternalMessage,
      sendResponse as (response: InternalResponse) => void,
    );
    // Return true to keep the message channel open for async response
    return true;
  };

  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}

/**
 * Get the current extension version from the manifest.
 */
export function getExtensionVersion(): string {
  return chrome.runtime.getManifest().version;
}

/**
 * Get the extension ID.
 */
export function getExtensionId(): string {
  return chrome.runtime.id;
}
