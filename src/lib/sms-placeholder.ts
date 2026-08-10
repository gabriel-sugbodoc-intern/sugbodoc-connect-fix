export type SmsPlaceholderRequest = {
  recipient: string;
  message: string;
  timestamp: string;
};

export type SmsPlaceholderResult = {
  sent: true;
  demo: true;
  request: SmsPlaceholderRequest;
};

/**
 * Frontend-only SMS seam for demo flows.
 * Replace the implementation here with an API call when SMS messaging is
 * enabled for patients. It deliberately never contacts a carrier.
 */
export async function sendSmsPlaceholder(request: SmsPlaceholderRequest): Promise<SmsPlaceholderResult> {
  console.info('[SMS Demo Mode]', request);
  await new Promise(resolve => window.setTimeout(resolve, 450));
  return { sent: true, demo: true, request };
}