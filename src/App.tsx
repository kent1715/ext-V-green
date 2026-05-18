import { useState, useEffect } from 'react';
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
  ExternalLink,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { cn } from './lib/utils';
import { GenerationMode, type GenerationTask, type ExtensionSettings } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { chromeAPI } from './lib/chrome';

export default function App() {
  const [activeTab, setActiveTab] = useState<'control' | 'queue' | 'settings'>('control');
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [queue, setQueue] = useState<GenerationTask[]>([]);
  const [selectedMode, setSelectedMode] = useState<GenerationMode>(GenerationMode.TEXT_TO_VIDEO);
  const [isExtensionActive, setIsExtensionActive] = useState(false);

  useEffect(() => {
    // Load settings from storage
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

  const clearQueue = () => {
    setQueue([]);
    chromeAPI.storage.local.set({ queue: [] });
  };

  const removeTask = (id: string) => {
    const updated = queue.filter(t => t.id !== id);
    setQueue(updated);
    chromeAPI.storage.local.set({ queue: updated });
  };

  const startProcessing = () => {
    setIsExtensionActive(true);
    chromeAPI.runtime.sendMessage({ type: 'START_QUEUE' }).then(response => {
      console.log('Queue started:', response);
    });
  };

  const stopProcessing = () => {
    setIsExtensionActive(false);
    chromeAPI.runtime.sendMessage({ type: 'STOP_QUEUE' });
  };

  return (
    <div className="flex w-[800px] h-[600px] bg-neutral-950 text-neutral-200 overflow-hidden">
      {/* Sidebar - Fixed width for popup context */}
      <nav className="w-56 border-r border-neutral-800 flex flex-col py-6 px-5 shrink-0 bg-neutral-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-8 px-1">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">VEO Automation</span>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <NavButton 
            active={activeTab === 'control'} 
            onClick={() => setActiveTab('control')} 
            icon={<Play className="w-5 h-5" />} 
            label="Control" 
          />
          <NavButton 
            active={activeTab === 'queue'} 
            onClick={() => setActiveTab('queue')} 
            icon={<List className="w-5 h-5" />} 
            label="Prompt Queue" 
            badge={queue.length > 0 ? queue.length : undefined}
          />
          <NavButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<SettingsIcon className="w-5 h-5" />} 
            label="Settings" 
          />
        </div>

        <div className="mt-auto pt-6 px-2">
          <div className={cn(
            "p-3 rounded-xl flex items-center gap-3 border transition-all",
            isExtensionActive ? "bg-green-500/10 border-green-500/50" : "bg-neutral-800/50 border-neutral-700"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              isExtensionActive ? "bg-green-500 animate-pulse" : "bg-neutral-600"
            )} />
            <span className="hidden md:block text-xs font-medium uppercase tracking-wider text-neutral-400">
              {isExtensionActive ? "Automation Active" : "Automation Idle"}
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <AnimatePresence mode="wait">
          {activeTab === 'control' && <ControlTab key="control" mode={selectedMode} setMode={setSelectedMode} onAdd={addToQueue} queueCount={queue.length} />}
          {activeTab === 'queue' && (
            <QueueTab 
              key="queue" 
              queue={queue} 
              onClear={clearQueue} 
              onRemove={removeTask} 
              onStart={startProcessing}
              onStop={stopProcessing}
              isActive={isExtensionActive}
            />
          )}
          {activeTab === 'settings' && <SettingsTab key="settings" settings={settings} onSave={saveSettings} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavButton({ active, label, icon, onClick, badge }: { active: boolean, label: string, icon: React.ReactNode, onClick: () => void, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-3 rounded-xl transition-all w-full group",
        active ? "bg-indigo-600/10 text-indigo-400 border border-indigo-600/20" : "text-neutral-400 hover:bg-neutral-800/50 border border-transparent"
      )}
    >
      <span className={cn("transition-colors", active ? "text-indigo-400" : "group-hover:text-neutral-200")}>{icon}</span>
      <span className="font-bold text-sm">{label}</span>
      {badge !== undefined && (
        <span className="ml-auto bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {badge}
        </span>
      )}
    </button>
  );
}

// --- TAB COMPONENTS ---

function ControlTab({ mode, setMode, onAdd, queueCount }: { mode: GenerationMode, setMode: (m: GenerationMode) => void, onAdd: (tasks: GenerationTask[]) => void, queueCount: number }) {
  const [prompts, setPrompts] = useState("");
  const [projectName, setProjectName] = useState("");

  const handleAddTasks = () => {
    const list = prompts.split('\n\n').filter(p => p.trim());
    if (list.length === 0) return;

    const newTasks: GenerationTask[] = list.map(p => ({
      id: Math.random().toString(36).substring(7),
      mode,
      prompt: p.trim(),
      status: 'pending',
      progress: 0,
      retries: 0,
      timestamp: Date.now(),
      config: {
        model: 'Veo 3.1 Fast',
        aspectRatio: '16:9',
        outputsPerPrompt: 1,
        concurrentPrompts: 3,
        delay: 30,
        quality: '1080p',
        maxRetries: 5,
        projectName: projectName || 'Untitled Project'
      }
    }));

    onAdd(newTasks);
    setPrompts("");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 h-full flex flex-col"
    >
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Generation Control</h1>
        <p className="text-neutral-400 text-sm">Configure your batch generation tasks.</p>
      </header>

      <div className="grid grid-cols-5 gap-6 flex-1 min-h-0 overflow-hidden">
        <div className="col-span-1 flex flex-col gap-2">
          <label className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-1">Modes</label>
          <ModeButton active={mode === GenerationMode.TEXT_TO_VIDEO} onClick={() => setMode(GenerationMode.TEXT_TO_VIDEO)} icon={<Video className="w-4 h-4" />} label="Text-to-Video" />
          <ModeButton active={mode === GenerationMode.IMAGE_TO_VIDEO} onClick={() => setMode(GenerationMode.IMAGE_TO_VIDEO)} icon={<Layers className="w-4 h-4" />} label="Image-to-Video" />
          <ModeButton active={mode === GenerationMode.COMPONENTS_TO_VIDEO} onClick={() => setMode(GenerationMode.COMPONENTS_TO_VIDEO)} icon={<Plus className="w-4 h-4" />} label="Comp-to-Video" />
          <ModeButton active={mode === GenerationMode.TEXT_TO_IMAGE} onClick={() => setMode(GenerationMode.TEXT_TO_IMAGE)} icon={<ImageIcon className="w-4 h-4" />} label="Text-to-Image" />
          <ModeButton active={mode === GenerationMode.IMAGE_TO_IMAGE} onClick={() => setMode(GenerationMode.IMAGE_TO_IMAGE)} icon={<Zap className="w-4 h-4" />} label="Image-to-Image" />
        </div>

        <div className="col-span-4 flex flex-col gap-4 overflow-y-auto pr-2">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Project Name</label>
              <input 
                type="text" 
                placeholder="e.g. Cinema"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all text-sm"
              />
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Prompts</label>
                <button 
                  onClick={() => {/* Mock file upload */}}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3" />
                  Upload .txt
                </button>
              </div>
              <textarea 
                rows={5}
                placeholder="Separate with a blank line..."
                value={prompts}
                onChange={(e) => setPrompts(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all text-sm resize-none font-mono"
              />
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handleAddTasks}
                className="flex-1 bg-white hover:bg-neutral-200 text-neutral-950 font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                disabled={!prompts.trim()}
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Add to Queue
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard title="Prompts" value={prompts.split('\n\n').filter(p => p.trim()).length.toString()} icon={<Zap className="text-yellow-500 w-4 h-4" />} />
            <StatCard title="Queue" value={queueCount.toString()} icon={<List className="text-blue-500 w-4 h-4" />} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function QueueTab({ queue, onClear, onRemove, onStart, onStop, isActive }: { queue: GenerationTask[], onClear: () => void, onRemove: (id: string) => void, onStart: () => void, onStop: () => void, isActive: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-10 max-w-6xl mx-auto"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Prompt Queue</h1>
          <p className="text-neutral-400 text-lg">Monitor and manage your active and pending tasks.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
             onClick={onClear}
             className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-red-500 hover:bg-red-500/10 rounded-2xl flex items-center gap-3 transition-all"
          >
            <Trash2 className="w-5 h-5" />
            Clear Queue
          </button>
          {!isActive ? (
            <button 
              onClick={onStart}
              disabled={queue.length === 0}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-bold text-base shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-3"
            >
              <Play className="w-5 h-5" />
              Start Processing
            </button>
          ) : (
            <button 
              onClick={onStop}
              className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-2xl font-bold text-base shadow-xl shadow-red-600/20 transition-all flex items-center gap-3"
            >
              <StopCircle className="w-5 h-5" />
              Stop Running
            </button>
          )}
        </div>
      </header>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-neutral-900/30 border border-dashed border-neutral-800 rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-6">
             <List className="w-8 h-8 text-neutral-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Queue is empty</h3>
          <p className="text-neutral-500 max-w-xs text-center text-sm">Add some prompts in the Control tab to see them here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((task, index) => (
            <QueuedItem 
              key={task.id} 
              task={task} 
              index={index} 
              onRemove={() => onRemove(task.id)} 
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function SettingsTab({ settings, onSave }: { settings: ExtensionSettings, onSave: (s: Partial<ExtensionSettings>) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-10 max-w-5xl mx-auto"
    >
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-3 leading-tight tracking-tight">Project Settings</h1>
        <p className="text-neutral-400 text-lg">Customize logic, models, and download behavior.</p>
      </header>

      <div className="space-y-12">
        <section>
          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500 mb-8 flex items-center gap-3">
            <Zap className="w-5 h-5 text-indigo-500" />
            General Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-neutral-900/50 p-8 rounded-3xl border border-neutral-800">
            <SettingsInput 
              label="Outputs per Prompt" 
              type="number" 
              value={settings.outputsPerPrompt} 
              onChange={(v) => onSave({ outputsPerPrompt: parseInt(v) })}
              description="Number of variations to generate"
            />
            <SettingsInput 
              label="Concurrent Prompts" 
              type="number" 
              value={settings.concurrentPrompts} 
              onChange={(v) => onSave({ concurrentPrompts: parseInt(v) })}
              description="How many tasks to process at once"
            />
            <SettingsInput 
              label="Prompt Delay (sec)" 
              type="number" 
              value={settings.promptDelay} 
              onChange={(v) => onSave({ promptDelay: parseInt(v) })}
              description="Wait time between each task start"
            />
            <SettingsSelect 
              label="Default Aspect Ratio" 
              options={['16:9', '9:16', '1:1']} 
              value={settings.defaultAspectRatio} 
              onChange={(v) => onSave({ defaultAspectRatio: v as any })}
              description="Target video dimensions"
            />
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 mb-6 flex items-center gap-2">
            <Video className="w-4 h-4 text-indigo-500" />
            Model Selection
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
            <SettingsSelect 
              label="Video Model" 
              options={['Veo 3.1 Fast', 'Veo 3.1 Quality', 'Veo 2.0']} 
              value={settings.videoModel} 
              onChange={(v) => onSave({ videoModel: v })}
              description="The AI engine for motion"
            />
            <SettingsSelect 
              label="Image Model" 
              options={['Imagen 3', 'Imagen 2', 'Muse']} 
              value={settings.imageModel} 
              onChange={(v) => onSave({ imageModel: v })}
              description="The AI engine for stills"
            />
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 mb-6 flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-500" />
            Download Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
            <SettingsSelect 
              label="Video Download Quality" 
              options={['none', '720p', '1080p']} 
              value={settings.autoDownloadVideo} 
              onChange={(v) => onSave({ autoDownloadVideo: v as any })}
              description="Automatically save renders"
            />
            <SettingsSelect 
              label="Image Download Quality" 
              options={['none', '1k', '2k', '4k']} 
              value={settings.autoDownloadImage} 
              onChange={(v) => onSave({ autoDownloadImage: v as any })}
              description="Automatically save stills"
            />
          </div>
        </section>
      </div>
    </motion.div>
  );
}

// --- ATOM COMPONENTS ---

function ModeButton({ active, label, icon, onClick }: { active: boolean, label: string, icon: React.ReactNode, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group",
        active ? "bg-indigo-600 text-white font-bold" : "text-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-300"
      )}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-neutral-800/30 border border-neutral-800/60 p-4 rounded-2xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function QueuedItem({ task, index, onRemove }: { task: GenerationTask, index: number, onRemove: () => void }) {
  const statusStyles = {
    pending: { icon: <Clock className="w-5 h-5 text-neutral-500" />, text: "Waiting", bg: "bg-neutral-800" },
    processing: { icon: <Play className="w-5 h-5 text-indigo-400" />, text: "Running", bg: "bg-indigo-950/30" },
    completed: { icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, text: "Success", bg: "bg-green-950/30" },
    failed: { icon: <AlertCircle className="w-5 h-5 text-red-500" />, text: "Failed", bg: "bg-red-950/30" },
    retrying: { icon: <Zap className="w-5 h-5 text-yellow-500" />, text: "Retrying", bg: "bg-yellow-950/30" },
  };

  const currentStatus = statusStyles[task.status];

  return (
    <div className={cn(
      "group relative flex items-center gap-6 p-6 rounded-3xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/60 transition-all",
      task.status === 'processing' && "border-indigo-600/40 ring-1 ring-indigo-600/20 shadow-lg shadow-indigo-600/5"
    )}>
      <div className="w-12 h-12 shrink-0 bg-neutral-800 rounded-2xl flex items-center justify-center font-mono text-sm font-bold text-neutral-500 border border-neutral-700/50">
        {(index + 1).toString().padStart(2, '0')}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-4 mb-2">
          <span className="font-bold text-base text-neutral-200 truncate pr-4">{task.prompt}</span>
          <div className={cn("px-3 py-1 rounded-full flex items-center gap-2 shrink-0 border border-transparent", currentStatus.bg)}>
            {currentStatus.icon}
            <span className="text-xs font-black uppercase tracking-tight opacity-90">{currentStatus.text}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
          <span className="flex items-center gap-2"><Video className="w-4 h-4" /> {task.mode.replace('-', ' ')}</span>
          <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> {task.config.model}</span>
          <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {new Date(task.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 pr-2">
        {task.status === 'processing' && (
           <div className="w-32 h-2 bg-neutral-800 rounded-full overflow-hidden mr-4">
              <motion.div 
                className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${task.progress}%` }}
              />
           </div>
        )}
        <button 
          onClick={onRemove}
          className="p-3 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function SettingsInput({ label, type, value, onChange, description }: { label: string, type: string, value: any, onChange: (v: string) => void, description: string }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col">
        <label className="text-base font-bold text-neutral-200">{label}</label>
        <span className="text-sm text-neutral-500">{description}</span>
      </div>
      <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all text-base"
      />
    </div>
  );
}

function SettingsSelect({ label, options, value, onChange, description }: { label: string, options: string[], value: string, onChange: (v: string) => void, description: string }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col">
        <label className="text-base font-bold text-neutral-200">{label}</label>
        <span className="text-sm text-neutral-500">{description}</span>
      </div>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all text-base appearance-none cursor-pointer"
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
