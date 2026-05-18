import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Settings as SettingsIcon, 
  List, 
  Play, 
  Video, 
  Image as ImageIcon, 
  Zap, 
  Layers,
  StopCircle,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Terminal,
  Upload,
  FileText,
  Mic,
  ChevronDown,
  Repeat,
  Search,
  Settings2,
  CloudUpload,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { GenerationMode, type GenerationTask, type ExtensionSettings } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { chromeAPI } from './lib/chrome';

export default function App() {
  const [activeTab, setActiveTab] = useState<'control' | 'settings' | 'debug'>('control');
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [queue, setQueue] = useState<GenerationTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    chromeAPI.storage.local.get(['settings', 'queue']).then((data: any) => {
      if (data.settings) setSettings(data.settings);
      if (data.queue) setQueue(data.queue);
    });
  }, []);

  const saveSettings = (newSettings: Partial<ExtensionSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    chromeAPI.storage.local.set({ settings: updated });
  };

  const addToQueue = (tasks: GenerationTask[]) => {
    const updatedQueue = [...queue, ...tasks];
    setQueue(updatedQueue);
    chromeAPI.storage.local.set({ queue: updatedQueue });
  };

  const toggleProcessing = () => {
    const nextState = !isProcessing;
    setIsProcessing(nextState);
    chromeAPI.runtime.sendMessage({ type: nextState ? 'START_QUEUE' : 'STOP_QUEUE' });
  };

  return (
    <div className="flex flex-col w-[650px] min-h-[600px] bg-black text-neutral-200 overflow-hidden">
      {/* Top Navbar */}
      <nav className="border-b border-neutral-800 px-6 py-1 flex items-center justify-between bg-neutral-900/20 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <TabItem 
            active={activeTab === 'control'} 
            onClick={() => setActiveTab('control')} 
            icon={<Settings2 className="w-5 h-5" />} 
            label="Control" 
          />
          <TabItem 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<SettingsIcon className="w-5 h-5" />} 
            label="Setting" 
          />
          <TabItem 
            active={activeTab === 'debug'} 
            onClick={() => setActiveTab('debug')} 
            icon={<Search className="w-5 h-5" />} 
            label="Debug Logs" 
          />
        </div>

        <button 
          onClick={toggleProcessing}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all",
            isProcessing 
              ? "bg-red-500/10 text-red-500 border border-red-500/20" 
              : "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
          )}
        >
          {isProcessing ? <StopCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isProcessing ? "STOP PROCESS" : "RUN PROCESS"}
        </button>
      </nav>

      {/* Main Area */}
      <main className="flex-1 p-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'control' && (
            <ControlTab 
              key="control"
              settings={settings}
              onSettingsChange={saveSettings}
              onAdd={addToQueue}
              queueLength={queue.length}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab
              key="settings"
              settings={settings}
              onSave={saveSettings}
            />
          )}
          {activeTab === 'debug' && <DebugTab key="debug" />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function TabItem({ active, label, icon, onClick }: { active: boolean, label: string, icon: React.ReactNode, onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-2 py-3 transition-all relative px-1", active ? "text-emerald-500 font-bold" : "text-neutral-500 hover:text-neutral-300")}>
      <span className={cn("transition-colors", active ? "text-emerald-500" : "text-neutral-600")}>{icon}</span>
      <span className="text-sm">{label}</span>
      {active && <motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />}
    </button>
  );
}

// --- TAB COMPONENTS ---

function ControlTab({ settings, onSettingsChange, onAdd, queueLength }: any) {
  const [mode, setMode] = useState<GenerationMode>(GenerationMode.TEXT_TO_VIDEO);
  const [prompts, setPrompts] = useState("");
  const [folderName, setFolderName] = useState("veo-folder-1");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedImages(Array.from(e.target.files));
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleAddTasks = () => {
    const list = prompts.split('\n\n').filter(p => p.trim());
    if (list.length === 0) return;
    onAdd(list.map(p => ({
      id: Math.random().toString(36).substring(7),
      mode,
      prompt: p.trim(),
      status: 'pending',
      progress: 0,
      retries: 0,
      timestamp: Date.now(),
      config: { ...settings, projectName: folderName }
    })));
    setPrompts("");
    setSelectedImages([]);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Modes Grid */}
      <div className="grid grid-cols-3 gap-2">
        <ModeBtn active={mode === GenerationMode.TEXT_TO_VIDEO} onClick={() => setMode(GenerationMode.TEXT_TO_VIDEO)} icon={<FileText className="w-4 h-4" />} label="Text to Video" />
        <ModeBtn active={mode === GenerationMode.IMAGE_TO_VIDEO} onClick={() => setMode(GenerationMode.IMAGE_TO_VIDEO)} icon={<ImageIcon className="w-4 h-4" />} label="Frame to Video" />
        <ModeBtn active={mode === GenerationMode.COMPONENTS_TO_VIDEO} onClick={() => setMode(GenerationMode.COMPONENTS_TO_VIDEO)} icon={<Layers className="w-4 h-4" />} label="Ingredients to Video" />
        <ModeBtn active={mode === GenerationMode.TEXT_TO_IMAGE} onClick={() => setMode(GenerationMode.TEXT_TO_IMAGE)} icon={<Star className="w-4 h-4" />} label="Text to Image" />
        <ModeBtn active={mode === GenerationMode.IMAGE_TO_IMAGE} onClick={() => setMode(GenerationMode.IMAGE_TO_IMAGE)} icon={<ImageIcon className="w-4 h-4" />} label="Image to Image" />
      </div>

      {/* Concurrent & Delay Row */}
      <div className="grid grid-cols-2 gap-4">
        <FormSection icon={<Zap className="w-4 h-4" />} title="Concurrent Prompts" description="Number of prompts to process simultaneously.">
          <div className="relative">
            <select className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2.5 rounded-lg text-sm appearance-none outline-none focus:border-neutral-700">
              <option>1 prompt</option>
              <option>2 prompts</option>
              <option>3 prompts</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
          </div>
        </FormSection>

        <FormSection icon={<Clock className="w-4 h-4" />} title="Random Delay" description="Random wait time before handling the next prompt.">
          <div className="flex items-center gap-3">
            <input type="number" defaultValue={20} className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2.5 rounded-lg text-sm outline-none" />
            <Repeat className="w-4 h-4 text-neutral-500 shrink-0" />
            <input type="number" defaultValue={30} className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2.5 rounded-lg text-sm outline-none" />
          </div>
        </FormSection>
      </div>

      {/* Image to Image Specific UI */}
      {mode === GenerationMode.IMAGE_TO_IMAGE && (
        <div className="space-y-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
          <div 
            onClick={triggerUpload}
            className="border border-dashed border-neutral-800 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-neutral-900/10 cursor-pointer hover:bg-neutral-900/20 transition-all"
          >
            <CloudUpload className={cn("w-8 h-8", selectedImages.length > 0 ? "text-emerald-500" : "text-neutral-400")} />
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold">
                {selectedImages.length > 0 
                  ? `${selectedImages.length} images selected` 
                  : "Click to upload or drag & drop"}
              </span>
              <span className="text-[11px] text-neutral-500">
                {selectedImages.length > 0 
                  ? selectedImages.map(f => f.name).join(", ").substring(0, 50) + "..."
                  : "PNG, JPG, GIF up to 10MB each"}
              </span>
            </div>
          </div>

          <FormSection icon={<ImageIcon className="w-4 h-4" />} title="Max Input Images per Prompt" description="Maximum images allowed per prompt.">
            <div className="relative">
              <select className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2.5 rounded-lg text-sm appearance-none outline-none focus:border-neutral-700">
                <option>3 images</option>
                <option>1 image</option>
                <option>2 images</option>
                <option>5 images</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            </div>
          </FormSection>
        </div>
      )}

      {/* Prompts Section */}
      <div className="bg-neutral-900/20 border border-neutral-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <FileText className="w-4 h-4 text-neutral-400" /> Prompts
          </div>
          <div className="flex items-center gap-4 text-[11px] font-bold text-neutral-400">
            <button className="hover:text-white flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Upload .txt file</button>
            <button className="hover:text-white flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Upload .xlsx / .csv</button>
          </div>
        </div>
        <textarea 
          placeholder="Example: First long prompt... Separate each prompt with a blank line." 
          className="w-full bg-[#050505] border border-neutral-800 rounded-lg p-3 text-sm text-neutral-300 h-28 focus:outline-none focus:border-neutral-700" 
          value={prompts}
          onChange={(e) => setPrompts(e.target.value)}
        />
        <div className="text-[10px] text-neutral-600 mt-2 italic">Separate each prompt with a blank line.</div>
      </div>

      {/* Auto Voice Banner */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mic className="w-5 h-5 text-neutral-400" />
          <div>
            <div className="text-sm font-bold">Auto-add voice by speaker (Requires Ultra plan)</div>
            <div className="text-[11px] text-neutral-500">Automatically select a speaker voice when name is mentioned.</div>
          </div>
        </div>
        <div className="w-10 h-5 bg-neutral-800 rounded-full cursor-not-allowed opacity-50 relative">
          <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-neutral-600 rounded-full" />
        </div>
      </div>

      <div className="text-[11px] text-neutral-500 px-1 italic">Default speaker</div>
      <div className="relative">
        <select className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2.5 rounded-lg text-sm appearance-none outline-none">
          <option>No voice configured</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
      </div>

      {/* Outputs & Save section */}
      <div className="grid grid-cols-2 gap-4">
        <FormSection icon={<List className="w-4 h-4" />} title="Outputs per Prompt" description="Number of images/videos to create per prompt.">
          <div className="relative">
            <select className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2.5 rounded-lg text-sm appearance-none cursor-pointer">
              <option>2</option>
              <option>1</option>
              <option>3</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
          </div>
        </FormSection>
        <FormSection icon={<Plus className="w-4 h-4" />} title="Save to folder" description="Subfolder for downloaded files.">
          <input type="text" value={folderName} onChange={(e) => setFolderName(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2.5 rounded-lg text-sm outline-none" />
        </FormSection>
      </div>

      <div className="flex items-center justify-between text-[11px] text-neutral-500 bg-neutral-900/10 p-3 rounded-lg border border-neutral-800/40">
        <div>Customize aspect ratio, duration & quantity in Settings...</div>
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-neutral-400">Auto change file name</div>
        <div className="w-10 h-5 bg-emerald-500 rounded-full relative cursor-pointer">
          <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full" />
        </div>
      </div>

      {/* Prompt Queue Area */}
      <div className="bg-[#050505] border border-neutral-800 rounded-xl overflow-hidden mt-6">
        <div className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/20">
          <div className="flex items-center gap-2 font-black text-[10px] tracking-widest text-neutral-400"><List className="w-4 h-4" /> PROMPT QUEUE</div>
          <div className="text-[10px] text-neutral-500">{queueLength} active</div>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {queueLength === 0 ? (
            <div className="h-24 flex items-center justify-center text-neutral-700 text-xs italic">
              No active prompts in queue
            </div>
          ) : (
            <div className="divide-y divide-neutral-900">
              {/* This is a simplified preview of the queue in the control tab */}
              <div className="p-3 text-[11px] text-neutral-500 italic">
                Check "Debug Logs" or the full Queue for detailed status.
              </div>
            </div>
          )}
        </div>
      </div>

      <button onClick={handleAddTasks} className="fixed bottom-6 right-8 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-all">
        <Plus className="w-7 h-7" />
      </button>
    </motion.div>
  );
}

function SettingsTab({ settings, onSave }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <SettingBox title="Default Mode" description="Default mode when creating new videos.">
        <Select value={settings.defaultMode} options={Object.values(GenerationMode)} onChange={(v:any) => onSave({defaultMode:v})} />
      </SettingBox>
      <SettingBox title="Model" description="Select the video generation model to use.">
        <Select value={settings.videoModel} options={['Veo 3.1 Fast', 'Veo 3.1 Quality']} onChange={(v:any) => onSave({videoModel:v})} />
      </SettingBox>
      <SettingBox title="Image Model" description="Select the AI model to use for text-to-image.">
        <Select value={settings.imageModel} options={['Nano Banana 2', 'Imagen 3']} onChange={(v:any) => onSave({imageModel:v})} />
      </SettingBox>
      <SettingBox title="Default Aspect Ratio" description="Video frame ratio (16:9 or 9:16).">
        <Select value={settings.defaultAspectRatio} options={['16:9 (YouTube)', '9:16 (TikTok)']} onChange={(v:any) => onSave({defaultAspectRatio:v})} />
      </SettingBox>
      <SettingBox title="Auto Download Quality (Video)" description="Select quality for automatic downloads.">
        <Select value={settings.autoDownloadVideo} options={['720p', '1080p', 'none']} onChange={(v:any) => onSave({autoDownloadVideo:v})} />
      </SettingBox>

      <div className="flex items-center justify-end gap-3 mt-8">
        <button className="px-4 py-2 border border-neutral-800 rounded-lg text-sm text-neutral-400 hover:text-white flex items-center gap-2"><Repeat className="w-4 h-4" /> Reset Defaults</button>
        <button className="px-6 py-2 bg-emerald-500 text-black font-bold rounded-lg text-sm hover:bg-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Save Settings</button>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-neutral-600 mt-4 italic">
        <AlertCircle className="w-3.5 h-3.5" /> Settings are automatically synced across browser tabs.
      </div>
    </motion.div>
  );
}

function DebugTab() {
  return (
    <div className="font-mono text-[11px] text-neutral-500 p-2 space-y-1">
      <div className="text-neutral-700">[04:01:22] - Automation environment active.</div>
      <div className="text-emerald-500/60">[04:01:23] - Extension version 1.0.4 loaded.</div>
    </div>
  );
}

// UI Components
function FormSection({ title, description, icon, children }: any) {
  return (
    <div className="bg-neutral-900/10 border border-neutral-800 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 font-bold text-xs"><span className="text-neutral-400">{icon}</span> {title}</div>
      {children}
      <div className="text-[10px] text-neutral-600 mt-1">{description}</div>
    </div>
  );
}

function ModeBtn({ active, label, icon, onClick }: { active: boolean, label: string, icon: React.ReactNode, onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all text-left", active ? "bg-emerald-500 text-black border-emerald-400 font-bold" : "bg-black border-neutral-800 text-neutral-500 hover:border-neutral-700")}>
      <span className={active ? "text-black" : "text-neutral-600"}>{icon}</span>
      <span className="text-[11px] tracking-tight">{label}</span>
    </button>
  );
}

function SettingBox({ title, description, children }: any) {
  return (
    <div className="bg-neutral-900/10 border border-neutral-800 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-bold text-neutral-300">
        <SettingsIcon className="w-3.5 h-3.5" /> {title}
      </div>
      {children}
      <div className="text-[10px] text-neutral-600">{description}</div>
    </div>
  );
}

function Select({ value, options, onChange }: any) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg text-sm appearance-none outline-none">
        {options.map((o:any) => <option key={o} value={o}>{o.replace(/-/g, ' ')}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
    </div>
  );
}
