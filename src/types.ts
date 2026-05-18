export enum GenerationMode {
  TEXT_TO_VIDEO = 'text-to-video',
  IMAGE_TO_VIDEO = 'image-to-video',
  COMPONENTS_TO_VIDEO = 'components-to-video',
  TEXT_TO_IMAGE = 'text-to-image',
  IMAGE_TO_IMAGE = 'image-to-image',
}

export interface GenerationTask {
  id: string;
  mode: GenerationMode;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  progress: number;
  error?: string;
  retries: number;
  timestamp: number;
  config: TaskConfig;
  assets?: string[]; // URLs or local references
}

export interface TaskConfig {
  model: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  outputsPerPrompt: number;
  concurrentPrompts: number;
  delay: number;
  quality: string;
  maxRetries: number;
  projectName?: string;
}

export interface ExtensionSettings {
  defaultMode: GenerationMode;
  defaultAspectRatio: '16:9' | '9:16';
  outputsPerPrompt: number;
  concurrentPrompts: number;
  promptDelay: number;
  videoModel: string;
  imageModel: string;
  autoDownloadVideo: '720p' | '1080p' | 'none';
  autoDownloadImage: '1k' | '2k' | '4k' | 'none';
  maxRetries: number;
  language: 'en' | 'vi' | 'zh';
}
