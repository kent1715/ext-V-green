/**
 * Mock Chrome extension APIs for the browser preview.
 * This allows the UI to run without crashing when chrome.storage/runtime aren't available.
 */

const STORAGE_KEY = 'veo_automation_settings';
const QUEUE_KEY = 'veo_automation_queue';

export const chromeMock = {
  storage: {
    local: {
      get: (keys: string | string[] | null) => {
        return new Promise((resolve) => {
          const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
          if (!keys) return resolve(data);
          if (typeof keys === 'string') return resolve({ [keys]: data[keys] });
          const result: any = {};
          keys.forEach(k => result[k] = data[k]);
          resolve(result);
        });
      },
      set: (items: any) => {
        return new Promise((resolve) => {
          const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
          const updated = { ...current, ...items };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          resolve(true);
        });
      }
    },
    sync: {
      get: (keys: any) => chromeMock.storage.local.get(keys),
      set: (items: any) => chromeMock.storage.local.set(items)
    }
  },
  runtime: {
    sendMessage: (message: any) => {
      console.log('[Mock Chrome Runtime] Message Sent:', message);
      return new Promise((resolve) => setTimeout(() => resolve({ status: 'ok' }), 500));
    },
    onMessage: {
      addListener: (callback: any) => {
        // In a real extension, we'd add the listener.
        // For the mockup, we can manually trigger events if needed.
      }
    }
  },
  tabs: {
    query: (queryInfo: any) => {
      return new Promise((resolve) => resolve([{ id: 1, url: 'https://labs.google/flow' }]));
    }
  },
  downloads: {
    download: (options: any) => {
      console.log('[Mock Chrome Downloads] Downloading:', options.url);
      return new Promise((resolve) => resolve(Math.floor(Math.random() * 1000)));
    }
  }
};

// Use the real chrome object if available, otherwise use our mock.
export const chromeAPI = typeof chrome !== 'undefined' && chrome.runtime ? chrome : chromeMock;
