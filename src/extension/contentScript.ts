import { GenerationMode, type GenerationTask } from '../types';
import { SELECTORS } from '../constants';
import * as auto from './automation';

/**
 * Content Script for VEO Automation
 * Injected into labs.google/flow
 */

console.log('[VEO Automation] Content script initialized');

let isProcessing = false;

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROCESS_TASK') {
    processTask(message.task).then(result => {
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  }
});

async function processTask(task: GenerationTask) {
  if (isProcessing) return { status: 'busy' };
  isProcessing = true;

  try {
    console.log('[VEO Automation] Starting task:', task.prompt);

    // 1. Enter prompt
    await auto.typeText(SELECTORS.PROMPT_TEXTAREA, task.prompt);
    await auto.delay(1000);

    // 2. Click Generate
    const success = await auto.clickElement(SELECTORS.GENERATE_BUTTON);
    if (!success) throw new Error('Could not find generate button');

    // 3. Wait for rendering to start
    console.log('[VEO Automation] Generation triggered, waiting for completion...');
    
    // We poll for the download button or a specific status message
    let completed = false;
    let attempts = 0;
    const maxAttempts = 120; // 60 seconds (0.5s interval)

    while (!completed && attempts < maxAttempts) {
      // Check for download button
      const downloadBtn = document.querySelector(SELECTORS.DOWNLOAD_BUTTON);
      if (downloadBtn) {
        completed = true;
        break;
      }

      // Check for errors
      const hasError = await auto.checkStatus('.error-message', 'error');
      if (hasError) throw new Error('Google Flow reported an error');

      await auto.delay(500);
      attempts++;
    }

    if (!completed) throw new Error('Generation timed out');

    // 4. Auto Download if configured
    if (task.config.quality !== 'none') {
       await auto.clickElement(SELECTORS.DOWNLOAD_BUTTON);
       console.log('[VEO Automation] Prompting download...');
    }

    isProcessing = false;
    return { status: 'completed', taskId: task.id };

  } catch (error: any) {
    console.error('[VEO Automation] Task failed:', error.message);
    isProcessing = false;
    return { status: 'failed', taskId: task.id, error: error.message };
  }
}
