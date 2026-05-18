/**
 * VEO Automation Utility Engine
 * Shared logic for DOM interaction and task orchestration.
 */

export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function waitForSelector(selector: string, timeout = 10000): Promise<HTMLElement | null> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const el = document.querySelector(selector) as HTMLElement;
    if (el) return el;
    await delay(500);
  }
  return null;
}

export async function clickElement(selector: string) {
  const el = await waitForSelector(selector);
  if (el) {
    el.click();
    return true;
  }
  return false;
}

export async function typeText(selector: string, text: string) {
  const el = await waitForSelector(selector) as HTMLTextAreaElement | HTMLInputElement;
  if (el) {
    el.focus();
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}

export async function checkStatus(selector: string, targetText: string) {
  const el = document.querySelector(selector);
  if (el && el.textContent?.toLowerCase().includes(targetText.toLowerCase())) {
    return true;
  }
  return false;
}
