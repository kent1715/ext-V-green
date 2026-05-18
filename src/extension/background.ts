import { type GenerationTask } from '../types';

/**
 * Background Service Worker for VEO Automation
 * Manages the global queue and orchestration across tabs.
 */

let activeQueue: GenerationTask[] = [];
let currentIndex = 0;
let isRunning = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_QUEUE') {
    startQueueProcessing();
  }
  if (message.type === 'STOP_QUEUE') {
    isRunning = false;
  }
});

async function startQueueProcessing() {
  if (isRunning) return;
  isRunning = true;

  const data = await chrome.storage.local.get(['queue', 'settings']);
  activeQueue = data.queue || [];
  const settings = data.settings;

  while (isRunning && currentIndex < activeQueue.length) {
    const task = activeQueue[currentIndex];
    
    if (task.status === 'completed') {
      currentIndex++;
      continue;
    }

    // Update status to processing
    task.status = 'processing';
    await updateStorageQueue();

    // Find a tab with the target URL
    const tabs = await chrome.tabs.query({ url: 'https://labs.google/flow*' });
    if (tabs.length === 0) {
      isRunning = false;
      console.error('[VEO Automation] No Google Flow tab found. Stopping queue.');
      break;
    }

    const targetTabId = tabs[0].id!;

    // Send task to content script
    try {
      const response = await chrome.tabs.sendMessage(targetTabId, { 
        type: 'PROCESS_TASK', 
        task 
      });

      if (response && response.status === 'completed') {
        task.status = 'completed';
        task.progress = 100;
      } else {
        task.status = 'failed';
        task.error = response?.error || 'Unknown error';
      }
    } catch (e) {
      task.status = 'failed';
      task.error = 'Communication failed';
    }

    await updateStorageQueue();
    currentIndex++;

    // Respect delay
    if (isRunning && currentIndex < activeQueue.length) {
      await new Promise(res => setTimeout(res, (settings?.promptDelay || 30) * 1000));
    }
  }

  isRunning = false;
  currentIndex = 0;
}

async function updateStorageQueue() {
  await chrome.storage.local.set({ queue: activeQueue });
}
