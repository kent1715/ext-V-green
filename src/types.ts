export enum GenerationMode {
  TEXT_TO_VIDEO = 'text-to-video',
  IMAGE_TO_VIDEO = 'frame-to-video',
  COMPONENTS_TO_VIDEO = 'ingredients-to-video',
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
  aspectRatio: string;
  outputsPerPrompt: number;
  concurrentPrompts: number;
  delayMin: number;
  delayMax: number;
  quality: string;
  maxRetries: number;
  projectName: string;
  autoVoice?: boolean;
  autoRename?: boolean;
}

export interface ExtensionSettings {
  defaultMode: GenerationMode;
  defaultAspectRatio: string;
  outputsPerPrompt: number;
  concurrentPrompts: number;
  delayMin: number;
  delayMax: number;
  videoModel: string;
  imageModel: string;
  autoDownloadVideo: string;
  autoDownloadImage: string;
  maxRetries: number;
  language: 'en' | 'vi' | 'zh';
  autoVoice: boolean;
  autoRename: boolean;
}
