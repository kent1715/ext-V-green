import { GenerationMode, type ExtensionSettings } from './types';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  defaultMode: GenerationMode.TEXT_TO_VIDEO,
  defaultAspectRatio: '16:9',
  outputsPerPrompt: 1,
  concurrentPrompts: 3,
  promptDelay: 30,
  videoModel: 'Veo 3.1 Fast',
  imageModel: 'Imagen 3',
  autoDownloadVideo: '1080p',
  autoDownloadImage: '4k',
  maxRetries: 5,
  language: 'en',
};

export const SELECTORS = {
  // These are best-guess placeholders for Google Flow VEO3
  // The user can update these if Google changes the DOM.
  PROMPT_TEXTAREA: 'textarea[data-testid="prompt-input"]',
  GENERATE_BUTTON: 'button[aria-label="Generate"]',
  DOWNLOAD_BUTTON: 'button[aria-label="Download"]',
  RENDER_STATUS: '.rendering-status',
  ASPECT_RATIO_DROPDOWN: '[data-testid="aspect-ratio-selector"]',
  MODEL_SELECTOR: '[data-testid="model-selector"]',
  CHAR_IMAGE_UPLOAD: 'input[type="file"][accept="image/*"]',
};
