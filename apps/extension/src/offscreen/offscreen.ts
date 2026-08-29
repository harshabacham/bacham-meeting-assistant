import { createCaptureService } from '../features/capture/captureService';


// A mock storage service just for captureService since it only uses storage.set
const mockStorage: any = {
  get: async () => ({}),
  set: async () => {},
};

// A mock logger to avoid pulling in full logger dependencies in offscreen context if not needed,
// but we can just use console
const mockLogger: any = {
  debug: (...args: any[]) => console.debug(...args),
  info: (...args: any[]) => console.info(...args),
  warn: (...args: any[]) => console.warn(...args),
  error: (...args: any[]) => console.error(...args),
};

const captureService = createCaptureService(
  mockStorage,
  mockLogger
);

// Listen for commands from the background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'offscreen') return false;

  console.log('Offscreen received command:', message.type);

  if (message.type === 'PING') {
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'START_CAPTURE') {
    const { streamId, config, sessionId } = message.payload;
    captureService.startCapture(streamId, config, sessionId)
      .then(() => sendResponse({ success: true }))
      .catch(error => {
        console.error('Failed to start capture:', error);
        sendResponse({ success: false, error: String(error) });
      });
    return true; // async response
  }

  if (message.type === 'STOP_CAPTURE') {
    captureService.stopCapture()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: String(error) }));
    return true;
  }

  if (message.type === 'PAUSE_CAPTURE') {
    captureService.pauseCapture();
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'RESUME_CAPTURE') {
    captureService.resumeCapture();
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'TAKE_SCREENSHOT') {
    captureService.takeScreenshot()
      .then(base64 => sendResponse({ success: true, base64 }))
      .catch(error => sendResponse({ success: false, error: String(error) }));
    return true; // async response
  }

  return false;
});
