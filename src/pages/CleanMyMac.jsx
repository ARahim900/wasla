import React, { useState, useEffect, useRef } from 'react';
import {
  HardDrive, Cpu, Trash2, Zap, Shield, Search,
  CheckCircle, Clock, FileWarning, Layers, MonitorPlay,
  Monitor, Sparkles, Folder, Maximize, Smile,
  Globe, Mail, RefreshCw, AlertTriangle,
  Download, File, Music, Video, Image,
  Send, Check, ToggleLeft, ToggleRight, Play
} from 'lucide-react';

// ─────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────

const SYSTEM_JUNK = [
  { id: 1, name: 'User Cache Files',        path: '~/Library/Caches',                        size: 4.2, selected: true  },
  { id: 2, name: 'System Log Files',        path: '/var/log',                                 size: 2.1, selected: true  },
  { id: 3, name: 'Language Files (unused)', path: '/Applications (unused locales)',            size: 3.8, selected: true  },
  { id: 4, name: 'Broken Login Items',      path: '~/Library/LaunchAgents',                   size: 0.1, selected: true  },
  { id: 5, name: 'Xcode Derived Data',      path: '~/Library/Developer/Xcode',                size: 6.3, selected: true  },
  { id: 6, name: 'App Support Remnants',    path: '~/Library/Application Support (orphaned)', size: 2.4, selected: false },
];

const MAIL_JUNK = [
  { id: 1, name: 'Mail Downloads Folder', path: '~/Library/Mail Downloads', size: 1.8, selected: true },
  { id: 2, name: 'Mail Envelope Index',   path: '~/Library/Mail/V10',       size: 0.9, selected: true },
  { id: 3, name: 'Attachments Cache',     path: '~/Library/Caches/Mail',    size: 2.3, selected: true },
];

const LARGE_FILES = [
  { id: 1, name: 'Final Cut Pro Cache',  path: '~/Movies/Final Cut',            size: 18.4, icon: Video     },
  { id: 2, name: 'Parallels VM Image',   path: '~/Parallels/Windows.pvm',       size: 32.1, icon: HardDrive },
  { id: 3, name: 'Xcode Simulators',     path: '~/Library/Developer/Simulator', size: 12.7, icon: File      },
  { id: 4, name: 'Logic Pro Sounds',     path: '~/Music/Logic',                 size: 8.9,  icon: Music     },
  { id: 5, name: 'Adobe Cache',          path: '~/Library/Caches/Adobe',        size: 5.2,  icon: Image     },
  { id: 6, name: 'Old Downloads (90d+)', path: '~/Downloads',                   size: 14.3, icon: Download  },
];

const DUPLICATE_FILES = [
  { id: 1, name: 'family_photo_2023.jpg',    copies: 3, size: 0.02, path: '~/Pictures, ~/Desktop'    },
  { id: 2, name: 'project_backup.zip',       copies: 2, size: 2.4,  path: '~/Documents, ~/Downloads' },
  { id: 3, name: 'Untitled.pdf',             copies: 4, size: 0.8,  path: '~/Downloads, ~/Desktop'   },
  { id: 4, name: 'presentation_final.pptx',  copies: 2, size: 1.1,  path: '~/Documents'              },
  { id: 5, name: 'track_01.mp3',             copies: 2, size: 0.04, path: '~/Music, ~/Downloads'     },
];

const PRIVACY_ITEMS = [
  { id: 1, app: 'Safari',    items: ['History','Cookies','Cache','Autofill','Downloads list'], icon: Globe,  size: 0.8, selected: true  },
  { id: 2, app: 'Chrome',    items: ['History','Cookies','Cache','Autofill'],                  icon: Globe,  size: 1.2, selected: true  },
  { id: 3, app: 'Firefox',   items: ['History','Cookies','Cache'],                             icon: Globe,  size: 0.6, selected: true  },
  { id: 4, app: 'Mail',      items: ['Recent recipients','Saved attachments'],                 icon: Mail,   size: 0.3, selected: false },
  { id: 5, app: 'Spotlight', items: ['Recent searches'],                                       icon: Search, size: 0.1, selected: true  },
];

const MALWARE_RESULTS = [
  { id: 1, name: 'Adware.MacSearch', path: '/Library/LaunchAgents/com.macsearch.plist',      severity: 'high',   type: 'Adware' },
  { id: 2, name: 'PUP.MacBooster',   path: '~/Library/Application Support/MacBooster',       severity: 'medium', type: 'PUP'    },
  { id: 3, name: 'Trojan.Generic',   path: '/tmp/.hidden_process',                           severity: 'high',   type: 'Trojan' },
];

const LOGIN_ITEMS = [
  { id: 1, name: 'Dropbox',              impact: 'High',   size: '120 MB', enabled: true,  icon: '📦' },
  { id: 2, name: 'Spotify',              impact: 'Medium', size: '85 MB',  enabled: true,  icon: '🎵' },
  { id: 3, name: 'Slack',                impact: 'High',   size: '200 MB', enabled: true,  icon: '💬' },
  { id: 4, name: 'Adobe Creative Cloud', impact: 'High',   size: '180 MB', enabled: true,  icon: '🎨' },
  { id: 5, name: 'Google Chrome Helper', impact: 'Medium', size: '60 MB',  enabled: false, icon: '🌐' },
  { id: 6, name: 'Steam',                impact: 'Medium', size: '95 MB',  enabled: false, icon: '🎮' },
  { id: 7, name: '1Password',            impact: 'Low',    size: '15 MB',  enabled: true,  icon: '🔑' },
  { id: 8, name: 'Bartender 4',          impact: 'Low',    size: '8 MB',   enabled: true,  icon: '🍫' },
];

const MAINTENANCE_TASKS = [
  { id: 1, name: 'Run Monthly Scripts',     desc: 'Cleans temp files & rebuilds databases',    duration: '~2 min',  status: 'idle' },
  { id: 2, name: 'Repair Disk Permissions', desc: 'Fixes file permission errors on the disk',  duration: '~3 min',  status: 'idle' },
  { id: 3, name: 'Flush DNS Cache',         desc: 'Clears cached domain name lookups',         duration: '~5 sec',  status: 'idle' },
  { id: 4, name: 'Rebuild Spotlight Index', desc: 'Refreshes search index for faster results', duration: '~5 min',  status: 'idle' },
  { id: 5, name: 'Verify Startup Disk',     desc: 'Checks disk integrity and structure',       duration: '~4 min',  status: 'idle' },
  { id: 6, name: 'Clear Font Cache',        desc: 'Removes corrupted font cache files',        duration: '~30 sec', status: 'idle' },
];

const INSTALLED_APPS = [
  { id: 1, name: 'Xcode',             size: 12.8, version: '15.2', lastUsed: '6 months ago', leftovers: 2.1, icon: '🔧' },
  { id: 2, name: 'Sketch',            size: 0.2,  version: '97.1', lastUsed: '1 week ago',   leftovers: 0.3, icon: '✏️' },
  { id: 3, name: 'Parallels Desktop', size: 0.5,  version: '19',   lastUsed: '2 months ago', leftovers: 1.8, icon: '💻' },
  { id: 4, name: 'Adobe Photoshop',   size: 4.1,  version: '25.5', lastUsed: '3 weeks ago',  leftovers: 3.2, icon: '🖼️' },
  { id: 5, name: 'Final Cut Pro',     size: 3.4,  version: '10.7', lastUsed: '1 month ago',  leftovers: 0.8, icon: '🎬' },
  { id: 6, name: 'Logic Pro',         size: 1.9,  version: '11.0', lastUsed: 'Yesterday',    leftovers: 0.2, icon: '🎵' },
  { id: 7, name: 'DiskSight (old)',   size: 0.04, version: '1.2',  lastUsed: '1 year ago',   leftovers: 0.1, icon: '💾' },
  { id: 8, name: 'VirtualBox',        size: 0.2,  version: '7.0',  lastUsed: '8 months ago', leftovers: 0.9, icon: '📦' },
];

const APP_UPDATES = [
  { id: 1, name: 'Slack',  current: '4.35.126', latest: '4.36.140', size: '180 MB', icon: '💬' },
  { id: 2, name: 'Zoom',   current: '5.16.2',   latest: '5.17.1',   size: '78 MB',  icon: '📹' },
  { id: 3, name: 'Sketch', current: '97.1',     latest: '98.0',     size: '120 MB', icon: '✏️' },
  { id: 4, name: 'Notion', current: '3.1.0',    latest: '3.2.1',    size: '95 MB',  icon: '📝' },
];

const SPACE_LENS_DATA = [
  { name: 'Applications', size: 89.4, color: 'bg-emerald-500', items: ['Xcode 12.8 GB', 'Adobe PS 4.1 GB', 'Final Cut 3.4 GB']   },
  { name: 'Documents',    size: 45.2, color: 'bg-purple-500',  items: ['Work Files 22 GB', 'Projects 15 GB', 'Archives 8 GB']      },
  { name: 'Movies',       size: 67.8, color: 'bg-teal-500',    items: ['FC Cache 18 GB', 'Downloads 32 GB', 'iMovie 17 GB']        },
  { name: 'Music',        size: 22.1, color: 'bg-violet-500',  items: ['Logic Sounds 9 GB', 'iTunes 8 GB', 'Podcasts 5 GB']        },
  { name: 'Photos',       size: 38.5, color: 'bg-rose-500',    items: ['Library 30 GB', 'Shared 5 GB', 'Edited 3 GB']              },
  { name: 'System',       size: 14.7, color: 'bg-indigo-500',  items: ['macOS 14 GB', 'Swap 0.7 GB']                               },
  { name: 'Developer',    size: 28.9, color: 'bg-blue-500',    items: ['Xcode Cache 13 GB', 'Simulators 13 GB', 'Pods 3 GB']       },
  { name: 'Other',        size: 43.4, color: 'bg-cyan-500',    items: ['Misc 43 GB']                                                },
];

// ─────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────

function useSectionScan(taskList) {
  const [status,   setStatus]   = useState('idle');
  const [progress, setProgress] = useState(0);
  const [taskIdx,  setTaskIdx]  = useState(0);
  const [cleaned,  setCleaned]  = useState(false);
  const len = taskList.length;

  useEffect(() => {
    if (status !== 'scanning') return;
    const iv = setInterval(() => {
      setProgress(prev => {
        const next = prev + 3;
        setTaskIdx(Math.min(Math.floor((next / 100) * len), len - 1));
        if (next >= 100) { setStatus('complete'); clearInterval(iv); return 100; }
        return next;
      });
    }, 60);
    return () => clearInterval(iv);
  }, [status, len]);

  const startScan = () => { setStatus('scanning'); setProgress(0); setTaskIdx(0); setCleaned(false); };
  const reset     = () => { setStatus('idle');     setProgress(0); setTaskIdx(0); setCleaned(false); };
  const clean     = () => setCleaned(true);
  return { status, progress, task: taskList[taskIdx] ?? '', cleaned, startScan, reset, clean };
}

function ScanButton({ status, onStart, onReset, label = 'Scan' }) {
  if (status === 'idle')
    return <button onClick={onStart} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-colors">{label}</button>;
  if (status === 'scanning')
    return <button disabled className="bg-white/10 text-white/40 px-6 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 cursor-not-allowed"><RefreshCw size={14} className="animate-spin" /> Scanning…</button>;
  return <button onClick={onReset} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-medium text-sm border border-white/10 transition-all">Scan Again</button>;
}

function SectionHeader({ title, subtitle, status, onStart, onReset, scanLabel = 'Scan' }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="text-emerald-200/60 text-sm mt-1">{subtitle}</p>
      </div>
      <ScanButton status={status} onStart={onStart} onReset={onReset} label={scanLabel} />
    </div>
  );
}

function ProgressBar({ progress, task }) {
  return (
    <div className="my-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-white/60">{task}</span>
        <span className="text-sm text-emerald-300">{progress}%</span>
      </div>
      <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function IdlePrompt({ icon: Icon, text }) {
  return (
    <div className="text-center py-16 text-white/30">
      <Icon size={48} className="mx-auto mb-4 opacity-30" />
      <p>{text}</p>
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-2 mb-6">
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${active === t ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

function DoneScreen({ message, note, onReset }) {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle size={40} className="text-green-400" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">{message}</h3>
      <p className="text-white/50">{note}</p>
      <button onClick={onReset} className="mt-6 bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all">Scan Again</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// SMART CARE
// ─────────────────────────────────────────────

function SmartCare() {
  const [scanStatus, setScanStatus] = useState('idle');
  const [progress,   setProgress]   = useState(0);
  const [scanTask,   setScanTask]   = useState('Ready to scan');

  const totalStorage = 512, storageBefore = 450, storageAfter = 395;
  const freed = storageBefore - storageAfter;

  const junkCats = [
    { name: 'System Cache',     before: 12.4, color: 'bg-emerald-500', icon: Layers      },
    { name: 'App Leftovers',    before: 5.2,  color: 'bg-teal-500',    icon: FileWarning },
    { name: 'Trash Bins',       before: 5.3,  color: 'bg-rose-500',    icon: Trash2      },
    { name: 'Large & Old Files',before: 32.1, color: 'bg-purple-500',  icon: HardDrive   },
  ];

  const perfStats = [
    { name: 'Boot Time',   before: '32s',  after: '18s',  icon: Clock       },
    { name: 'Memory Load', before: '85%',  after: '45%',  icon: Cpu         },
    { name: 'App Launch',  before: '4.2s', after: '1.8s', icon: MonitorPlay },
  ];

  useEffect(() => {
    if (scanStatus !== 'scanning') return;
    const iv = setInterval(() => {
      setProgress(prev => {
        const n = prev + 2;
        if (n === 10) setScanTask('Analyzing System Cache…');
        if (n === 30) setScanTask('Finding App Leftovers…');
        if (n === 60) setScanTask('Checking Trash Bins…');
        if (n === 80) setScanTask('Cleaning and Optimizing…');
        if (n >= 100) { setScanStatus('completed'); setScanTask('Cleanup Complete'); clearInterval(iv); return 100; }
        return n;
      });
    }, 60);
    return () => clearInterval(iv);
  }, [scanStatus]);

  const isComplete = scanStatus === 'completed';

  return (
    <div className="flex-1 relative flex flex-col overflow-y-auto custom-scrollbar">
      {!isComplete && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="relative mb-8 group">
            <div className="relative w-64 h-48 bg-emerald-700 rounded-3xl flex items-center justify-center border-t border-white/20">
              <Monitor size={80} className="text-white/80" />
              {scanStatus === 'scanning' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="w-32 h-12 bg-white/10 mx-auto rounded-b-xl border border-white/5" />
          </div>
          <h2 className="text-4xl font-semibold text-white mb-3">
            {scanStatus === 'idle' ? 'Welcome back!' : `${progress}%`}
          </h2>
          <p className="text-lg text-emerald-200/70 mb-16">
            {scanStatus === 'idle' ? 'Start with a quick and extensive scan of your Mac.' : scanTask}
          </p>
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
            {scanStatus === 'idle' && (
              <button onClick={() => { setScanStatus('scanning'); setProgress(0); setScanTask('Initializing scanner…'); }}
                className="group relative w-24 h-24 rounded-full flex items-center justify-center focus:outline-none">
                <div className="relative w-full h-full bg-emerald-600 hover:bg-emerald-500 rounded-full flex items-center justify-center border border-white/30 text-white font-semibold text-lg transition-colors">
                  Scan
                </div>
              </button>
            )}
            {scanStatus === 'scanning' && (
              <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center bg-black/20 text-white/50">Scanning…</div>
            )}
          </div>
        </div>
      )}

      {isComplete && (
        <div className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">Cleanup Complete</h2>
              <p className="text-emerald-200/70">Your system is fully optimized.</p>
            </div>
            <button onClick={() => { setScanStatus('idle'); setProgress(0); setScanTask('Ready to scan'); }}
              className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-medium border border-white/10 transition-colors">
              Start Over
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white/5 p-6 rounded-2xl border border-white/10">
              <h3 className="text-lg font-medium text-white mb-4">Storage Recovery</h3>
              <div className="w-full h-6 bg-black/30 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-white/20 transition-all duration-1000" style={{ width: `${(storageAfter / totalStorage) * 100}%` }} />
              </div>
              <div className="flex justify-between mt-6">
                <div><p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-1">Total Drive</p><p className="text-2xl font-light text-white">{totalStorage} <span className="text-sm text-white/50">GB</span></p></div>
                <div><p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-1">Currently Used</p><p className="text-2xl font-light text-white">{storageAfter} <span className="text-sm text-white/50">GB</span></p></div>
                <div className="text-right"><p className="text-xs text-emerald-300/60 uppercase tracking-widest font-semibold mb-1">Total Freed</p><p className="text-3xl font-semibold text-emerald-400">{freed} <span className="text-sm">GB</span></p></div>
              </div>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <h3 className="text-lg font-medium text-white mb-4">Performance Gain</h3>
              <div className="space-y-4">
                {perfStats.map((s, i) => (
                  <div key={i} className="bg-black/20 p-4 rounded-xl flex items-center justify-between border border-white/5">
                    <div className="flex items-center gap-3"><s.icon size={20} className="text-emerald-400" strokeWidth={1.5} /><span className="text-white/80 font-medium">{s.name}</span></div>
                    <div className="text-right"><p className="text-xs line-through text-white/30">{s.before}</p><p className="font-semibold text-emerald-300">{s.after}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-3 bg-white/5 p-6 rounded-2xl border border-white/10">
              <h3 className="text-lg font-medium text-white mb-4">Items Removed</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {junkCats.map((cat, i) => (
                  <div key={i} className="bg-black/20 p-5 rounded-xl border border-white/5 relative overflow-hidden">
                    <cat.icon size={24} className="mb-4 text-white/50" strokeWidth={1.5} />
                    <h4 className="text-white/80 font-medium mb-1">{cat.name}</h4>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-light text-white/40 line-through">{cat.before} GB</span>
                      <span className="text-sm text-emerald-400 font-medium mb-1">Cleaned</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 right-6 text-xs text-white/20 font-medium tracking-wide">by © MacPaw (Mockup)</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────

function Cleanup() {
  const [tab,        setTab]       = useState('System Junk');
  const [junkItems,  setJunkItems] = useState(SYSTEM_JUNK);
  const [mailItems,  setMailItems] = useState(MAIL_JUNK);
  const [trashDone,  setTrashDone] = useState(false);
  const { status, progress, task, cleaned, startScan, reset, clean } = useSectionScan([
    'Scanning user caches…', 'Checking system logs…', 'Finding language files…', 'Locating app leftovers…', 'Verifying trash bins…',
  ]);

  const junkSize = junkItems.filter(i => i.selected).reduce((a, b) => a + b.size, 0);
  const mailSize = mailItems.filter(i => i.selected).reduce((a, b) => a + b.size, 0);

  const toggleJunk = id => setJunkItems(p => p.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  const toggleMail = id => setMailItems(p => p.map(i => i.id === id ? { ...i, selected: !i.selected } : i));

  const ItemRow = ({ item, onToggle, size }) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={item.selected}
      aria-label={`${item.name}, ${size} GB`}
      onClick={() => onToggle(item.id)}
      className="w-full flex items-center justify-between bg-white/5 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 p-4 rounded-xl border border-white/10 cursor-pointer transition-all text-left"
    >
      <div className="flex items-center gap-3">
        <div className={`w-5 h-5 rounded flex items-center justify-center ${item.selected ? 'bg-emerald-500' : 'bg-white/10 border border-white/20'}`} aria-hidden="true">
          {item.selected && <Check size={12} className="text-white" />}
        </div>
        <div><p className="text-white/90 font-medium text-sm">{item.name}</p><p className="text-white/30 text-xs">{item.path}</p></div>
      </div>
      <span className="text-emerald-300 font-medium text-sm">{size} GB</span>
    </button>
  );

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
      <SectionHeader title="Cleanup" subtitle="Remove junk files, logs, and unnecessary clutter" status={status} onStart={startScan} onReset={reset} />
      <TabBar tabs={['System Junk', 'Mail Attachments', 'Trash Bins']} active={tab} onChange={setTab} />

      {status === 'scanning' && <ProgressBar progress={progress} task={task} />}
      {status === 'idle'     && <IdlePrompt icon={Sparkles} text='Click "Scan" to find junk files on your Mac' />}

      {status === 'complete' && !cleaned && tab === 'System Junk' && (
        <>
          <div className="space-y-2 mb-4">{junkItems.map(i => <ItemRow key={i.id} item={i} onToggle={toggleJunk} size={i.size} />)}</div>
          <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/10">
            <span className="text-white/60 text-sm">{junkItems.filter(i => i.selected).length} items — <span className="text-emerald-300">{junkSize.toFixed(1)} GB</span> to free</span>
            <button onClick={clean} className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-all">Clean Up</button>
          </div>
        </>
      )}

      {status === 'complete' && !cleaned && tab === 'Mail Attachments' && (
        <>
          <div className="space-y-2 mb-4">{mailItems.map(i => <ItemRow key={i.id} item={i} onToggle={toggleMail} size={i.size} />)}</div>
          <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/10">
            <span className="text-white/60 text-sm"><span className="text-emerald-300">{mailSize.toFixed(1)} GB</span> of mail data to clean</span>
            <button onClick={clean} className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90">Clean Up</button>
          </div>
        </>
      )}

      {status === 'complete' && !cleaned && tab === 'Trash Bins' && (
        <div className="bg-white/5 p-8 rounded-2xl border border-white/10 text-center">
          <Trash2 size={48} className="mx-auto mb-4 text-rose-400 opacity-80" />
          <h3 className="text-white font-medium text-lg mb-1">Trash Contains 5.3 GB</h3>
          <p className="text-white/40 text-sm mb-6">Includes files from all apps and system bins</p>
          {!trashDone
            ? <button onClick={() => setTrashDone(true)} className="bg-rose-600 hover:bg-rose-500 text-white px-8 py-3 rounded-xl font-medium transition-colors">Empty All Trash</button>
            : <div className="flex items-center justify-center gap-2 text-green-400"><CheckCircle size={18} /><span>All bins emptied — 5.3 GB freed.</span></div>
          }
        </div>
      )}

      {status === 'complete' && cleaned && (
        <DoneScreen message="All Clean!" note={`${junkSize.toFixed(1)} GB successfully removed from your system.`} onReset={reset} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PROTECTION
// ─────────────────────────────────────────────

function Protection() {
  const [tab,            setTab]            = useState('Privacy');
  const [privacyItems,   setPrivacyItems]   = useState(PRIVACY_ITEMS);
  const [removedThreats, setRemovedThreats] = useState([]);
  const { status, progress, task, cleaned, startScan, reset, clean } = useSectionScan([
    'Scanning browser data…', 'Checking privacy traces…', 'Looking for malware signatures…', 'Analyzing startup agents…', 'Verifying system integrity…',
  ]);

  const totalSize    = privacyItems.filter(i => i.selected).reduce((a, b) => a + b.size, 0);
  const activeThreats = MALWARE_RESULTS.filter(t => !removedThreats.includes(t.id));

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
      <SectionHeader title="Protection" subtitle="Protect your privacy and remove threats" status={status} onStart={startScan} onReset={reset} />
      <TabBar tabs={['Privacy', 'Malware Removal']} active={tab} onChange={setTab} />

      {status === 'scanning' && <ProgressBar progress={progress} task={task} />}
      {status === 'idle'     && <IdlePrompt icon={Shield} text='Click "Scan" to check your privacy and security' />}

      {status === 'complete' && !cleaned && tab === 'Privacy' && (
        <>
          <div className="space-y-3 mb-4">
            {privacyItems.map(item => (
              <div key={item.id} className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <item.icon size={18} className="text-emerald-400" />
                    <span className="text-white font-medium">{item.app}</span>
                    <span className="text-white/40 text-xs">{item.size} GB</span>
                  </div>
                  <button onClick={() => setPrivacyItems(p => p.map(i => i.id === item.id ? { ...i, selected: !i.selected } : i))} className="text-xs">
                    {item.selected
                      ? <span className="text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-full">Selected</span>
                      : <span className="text-white/30 bg-white/5 px-2 py-1 rounded-full">Skip</span>}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.items.map((label, i) => (
                    <span key={i} className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full border border-white/10">{label}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/10">
            <span className="text-white/60 text-sm">{privacyItems.filter(i => i.selected).length} apps — <span className="text-emerald-300">{totalSize.toFixed(1)} GB</span> of traces to remove</span>
            <button onClick={clean} className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90">Remove Traces</button>
          </div>
        </>
      )}

      {status === 'complete' && cleaned && tab === 'Privacy' && (
        <DoneScreen message="Privacy Cleared!" note={`${totalSize.toFixed(1)} GB of traces removed.`} onReset={reset} />
      )}

      {status === 'complete' && tab === 'Malware Removal' && (
        activeThreats.length > 0 ? (
          <>
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-4">
              <AlertTriangle size={20} className="text-red-400 shrink-0" />
              <span className="text-red-300 text-sm">{activeThreats.length} threat{activeThreats.length > 1 ? 's' : ''} detected on your system</span>
            </div>
            <div className="space-y-3">
              {activeThreats.map(threat => (
                <div key={threat.id} className="bg-white/5 p-4 rounded-xl border border-red-500/20 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${threat.severity === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{threat.severity.toUpperCase()}</span>
                      <span className="text-white/30 text-xs">{threat.type}</span>
                    </div>
                    <p className="text-white font-medium text-sm">{threat.name}</p>
                    <p className="text-white/30 text-xs mt-1">{threat.path}</p>
                  </div>
                  <button onClick={() => setRemovedThreats(p => [...p, threat.id])} className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ml-4">Remove</button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><Shield size={40} className="text-green-400" /></div>
            <h3 className="text-2xl font-bold text-white mb-2">All Clear!</h3>
            <p className="text-white/50">No malware or threats found on your system.</p>
          </div>
        )
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PERFORMANCE
// ─────────────────────────────────────────────

function Performance() {
  const [tab,        setTab]       = useState('Memory');
  const [loginItems, setLoginItems]= useState(LOGIN_ITEMS);
  const [tasks,      setTasks]     = useState(MAINTENANCE_TASKS);
  const [ramCleaned, setRamCleaned]= useState(false);
  const [ramUsage,   setRamUsage]  = useState(78);

  const toggleLogin = id => setLoginItems(p => p.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i));
  const runTask     = id => {
    setTasks(p => p.map(t => t.id === id ? { ...t, status: 'running' } : t));
    setTimeout(() => setTasks(p => p.map(t => t.id === id ? { ...t, status: 'done' } : t)), 2000);
  };
  const impactCls = v => v === 'High' ? 'text-red-400 bg-red-500/10' : v === 'Medium' ? 'text-yellow-400 bg-yellow-500/10' : 'text-green-400 bg-green-500/10';

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-6"><h2 className="text-2xl font-bold text-white">Performance</h2><p className="text-emerald-200/60 text-sm mt-1">Optimize your Mac's speed and responsiveness</p></div>
      <TabBar tabs={['Memory', 'Login Items', 'Maintenance']} active={tab} onChange={setTab} />

      {tab === 'Memory' && (
        <>
          <div className="bg-white/5 p-8 rounded-2xl border border-white/10 mb-6 flex flex-col items-center">
            <div className="relative w-44 h-44 mb-6">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="url(#rg)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${ramUsage * 2.51} 251`} className="transition-all duration-1000" />
                <defs>
                  <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#d946ef" /><stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-white">{ramUsage}%</span>
                <span className="text-white/40 text-sm">RAM Used</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 w-full mb-6">
              <div className="bg-black/20 p-3 rounded-xl text-center"><p className="text-white/40 text-xs mb-1">Total</p><p className="text-white font-semibold">16 GB</p></div>
              <div className="bg-black/20 p-3 rounded-xl text-center"><p className="text-white/40 text-xs mb-1">Used</p><p className="text-emerald-300 font-semibold">{(16 * ramUsage / 100).toFixed(1)} GB</p></div>
              <div className="bg-black/20 p-3 rounded-xl text-center"><p className="text-white/40 text-xs mb-1">Free</p><p className="text-green-400 font-semibold">{(16 * (100 - ramUsage) / 100).toFixed(1)} GB</p></div>
            </div>
            {!ramCleaned
              ? <button onClick={() => { setRamCleaned(true); setRamUsage(38); }} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-medium flex items-center gap-2 hover:opacity-90"><Zap size={18} /> Free Up RAM</button>
              : <div className="flex items-center gap-2 text-green-400"><CheckCircle size={18} /><span className="font-medium">RAM freed — ~6.4 GB released.</span></div>
            }
          </div>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h3 className="text-white font-medium mb-4">Heavy Memory Consumers</h3>
            <div className="space-y-2">
              {[{app:'Google Chrome',mem:'2.8 GB',cpu:'12%'},{app:'Xcode',mem:'1.9 GB',cpu:'8%'},{app:'Slack',mem:'0.8 GB',cpu:'3%'},{app:'Adobe Photoshop',mem:'1.2 GB',cpu:'5%'}].map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-black/20 p-3 rounded-xl">
                  <span className="text-white/80 text-sm">{p.app}</span>
                  <div className="flex gap-4 text-xs"><span className="text-emerald-300">{p.mem}</span><span className="text-white/40">CPU: {p.cpu}</span><button className="text-red-400 hover:text-red-300 transition-colors">Quit</button></div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'Login Items' && (
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <p className="text-white/40 text-sm mb-4">Toggle apps that launch at startup. Disabling high-impact items speeds up boot time.</p>
          <div className="space-y-2">
            {loginItems.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div><p className="text-white/90 font-medium text-sm">{item.name}</p><p className="text-white/30 text-xs">{item.size}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${impactCls(item.impact)}`}>{item.impact}</span>
                  <button onClick={() => toggleLogin(item.id)}>
                    {item.enabled ? <ToggleRight size={28} className="text-emerald-400" /> : <ToggleLeft size={28} className="text-white/20" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {loginItems.filter(i => !i.enabled).length > 0 && (
            <p className="text-white/30 text-xs mt-4 text-center">{loginItems.filter(i => !i.enabled).length} items disabled — estimated boot savings: ~{loginItems.filter(i => !i.enabled).length * 3}s</p>
          )}
        </div>
      )}

      {tab === 'Maintenance' && (
        <div className="space-y-3">
          {tasks.map(t => (
            <div key={t.id} className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between">
              <div><p className="text-white/90 font-medium text-sm">{t.name}</p><p className="text-white/30 text-xs">{t.desc} · {t.duration}</p></div>
              {t.status === 'idle'    && <button onClick={() => runTask(t.id)} className="bg-white/10 hover:bg-white/20 text-white/70 hover:text-white px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2"><Play size={12} /> Run</button>}
              {t.status === 'running' && <div className="flex items-center gap-2 text-emerald-300 text-xs"><RefreshCw size={14} className="animate-spin" /> Running…</div>}
              {t.status === 'done'    && <div className="flex items-center gap-2 text-green-400 text-xs"><CheckCircle size={14} /> Done</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// APPLICATIONS
// ─────────────────────────────────────────────

function Applications() {
  const [tab,           setTab]          = useState('Uninstaller');
  const [search,        setSearch]       = useState('');
  const [uninstalledIds,setUninstalledIds]= useState([]);
  const [updatedIds,    setUpdatedIds]   = useState([]);

  const visibleApps    = INSTALLED_APPS.filter(a => !uninstalledIds.includes(a.id) && a.name.toLowerCase().includes(search.toLowerCase()));
  const pendingUpdates = APP_UPDATES.filter(u => !updatedIds.includes(u.id));

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-6"><h2 className="text-2xl font-bold text-white">Applications</h2><p className="text-emerald-200/60 text-sm mt-1">Manage, remove, and update your installed apps</p></div>
      <TabBar tabs={['Uninstaller', 'Updater']} active={tab} onChange={setTab} />

      {tab === 'Uninstaller' && (
        <>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applications…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div className="space-y-2">
            {visibleApps.map(app => (
              <div key={app.id} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{app.icon}</span>
                  <div><p className="text-white/90 font-medium text-sm">{app.name}</p><p className="text-white/30 text-xs">v{app.version} · Last used: {app.lastUsed}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right"><p className="text-white/60 text-sm">{app.size} GB</p><p className="text-white/30 text-xs">{app.leftovers} GB leftovers</p></div>
                  <button onClick={() => setUninstalledIds(p => [...p, app.id])} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-xs font-medium transition-all">Uninstall</button>
                </div>
              </div>
            ))}
          </div>
          {uninstalledIds.length > 0 && <p className="text-white/30 text-xs text-center mt-4">{uninstalledIds.length} app{uninstalledIds.length > 1 ? 's' : ''} uninstalled</p>}
        </>
      )}

      {tab === 'Updater' && (
        <>
          {pendingUpdates.length > 0 && (
            <div className="flex justify-end mb-4">
              <button onClick={() => setUpdatedIds(APP_UPDATES.map(u => u.id))} className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90">Update All</button>
            </div>
          )}
          <div className="space-y-2">
            {APP_UPDATES.map(app => (
              <div key={app.id} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{app.icon}</span>
                  <div><p className="text-white/90 font-medium text-sm">{app.name}</p><p className="text-white/30 text-xs"><span className="line-through">{app.current}</span> → <span className="text-emerald-300">{app.latest}</span> · {app.size}</p></div>
                </div>
                {updatedIds.includes(app.id)
                  ? <div className="flex items-center gap-2 text-green-400 text-xs"><CheckCircle size={14} /> Updated</div>
                  : <button onClick={() => setUpdatedIds(p => [...p, app.id])} className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-4 py-2 rounded-lg text-xs font-medium transition-all">Update</button>
                }
              </div>
            ))}
            {APP_UPDATES.every(u => updatedIds.includes(u.id)) && (
              <div className="text-center py-8"><CheckCircle size={40} className="text-green-400 mx-auto mb-3" /><p className="text-white/60">All apps are up to date!</p></div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MY CLUTTER
// ─────────────────────────────────────────────

function MyClutter() {
  const [tab,          setTab]         = useState('Large Files');
  const [removedLarge, setRemovedLarge]= useState([]);
  const [removedDupes, setRemovedDupes]= useState([]);
  const { status, progress, task, startScan, reset } = useSectionScan([
    'Scanning for large files…', 'Checking Downloads folder…', 'Finding duplicates…', 'Analyzing file dates…', 'Building report…',
  ]);

  const visibleLarge = LARGE_FILES.filter(f => !removedLarge.includes(f.id));
  const visibleDupes = DUPLICATE_FILES.filter(d => !removedDupes.includes(d.id));

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
      <SectionHeader title="My Clutter" subtitle="Find and remove large files and duplicates" status={status} onStart={startScan} onReset={reset} />
      <TabBar tabs={['Large Files', 'Duplicates']} active={tab} onChange={setTab} />

      {status === 'scanning' && <ProgressBar progress={progress} task={task} />}
      {status === 'idle'     && <IdlePrompt icon={Folder} text='Click "Scan" to find large and duplicate files' />}

      {status === 'complete' && tab === 'Large Files' && (
        <>
          <p className="text-white/40 text-sm mb-4">{visibleLarge.length} large files — {visibleLarge.reduce((a, b) => a + b.size, 0).toFixed(1)} GB total</p>
          <div className="space-y-2">
            {visibleLarge.map(file => (
              <div key={file.id} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <file.icon size={20} className="text-emerald-400" strokeWidth={1.5} />
                  <div><p className="text-white/90 font-medium text-sm">{file.name}</p><p className="text-white/30 text-xs">{file.path}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-emerald-300 font-medium text-sm">{file.size} GB</span>
                  <button onClick={() => setRemovedLarge(p => [...p, file.id])} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg transition-all"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          {removedLarge.length > 0 && (
            <p className="text-green-400 text-xs text-center mt-4">
              {removedLarge.length} file{removedLarge.length > 1 ? 's' : ''} removed · {LARGE_FILES.filter(f => removedLarge.includes(f.id)).reduce((a, b) => a + b.size, 0).toFixed(1)} GB freed
            </p>
          )}
        </>
      )}

      {status === 'complete' && tab === 'Duplicates' && (
        <>
          <p className="text-white/40 text-sm mb-4">{visibleDupes.length} duplicate groups — {visibleDupes.reduce((a, b) => a + b.size * (b.copies - 1), 0).toFixed(2)} GB recoverable</p>
          <div className="space-y-2">
            {visibleDupes.map(dupe => (
              <div key={dupe.id} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                <div><p className="text-white/90 font-medium text-sm">{dupe.name}</p><p className="text-white/30 text-xs">{dupe.copies} copies · {dupe.path}</p></div>
                <div className="flex items-center gap-4">
                  <span className="text-emerald-300 text-sm">{(dupe.size * (dupe.copies - 1)).toFixed(2)} GB</span>
                  <button onClick={() => setRemovedDupes(p => [...p, dupe.id])} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg transition-all"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          {removedDupes.length > 0 && <p className="text-green-400 text-xs text-center mt-4">{removedDupes.length} group{removedDupes.length > 1 ? 's' : ''} removed</p>}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SPACE LENS
// ─────────────────────────────────────────────

function SpaceLens() {
  const [selected, setSelected] = useState(null);
  const total = SPACE_LENS_DATA.reduce((a, b) => a + b.size, 0);

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-6"><h2 className="text-2xl font-bold text-white">Space Lens</h2><p className="text-emerald-200/60 text-sm mt-1">Visual breakdown of your disk usage</p></div>

      <div className="bg-white/5 p-6 rounded-2xl border border-white/10 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/60 text-sm">512 GB total · {total.toFixed(0)} GB used</span>
          <span className="text-emerald-300 font-medium text-sm">{(512 - total).toFixed(0)} GB free</span>
        </div>
        <div className="w-full h-10 rounded-xl overflow-hidden flex mb-6">
          {SPACE_LENS_DATA.map((item, i) => (
            <div key={i} className={`${item.color} cursor-pointer hover:opacity-75 transition-opacity h-full`}
              style={{ width: `${(item.size / 512) * 100}%` }}
              onClick={() => setSelected(selected?.name === item.name ? null : item)}
              title={`${item.name}: ${item.size} GB`}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SPACE_LENS_DATA.map((item, i) => (
            <button key={i} onClick={() => setSelected(selected?.name === item.name ? null : item)}
              className={`flex items-center gap-2 p-3 rounded-xl text-left transition-all ${selected?.name === item.name ? 'bg-white/10 border border-white/20' : 'bg-black/20 border border-transparent hover:bg-white/5'}`}>
              <div className={`w-3 h-3 rounded-full ${item.color} shrink-0`} />
              <div><p className="text-white/80 text-xs font-medium">{item.name}</p><p className="text-white/40 text-xs">{item.size} GB</p></div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${selected.color}`} />
            {selected.name} — {selected.size} GB
          </h3>
          <div className="space-y-3">
            {selected.items.map((item, i) => {
              const parts = item.split(' ');
              const size  = parseFloat(parts[parts.length - 2]);
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 bg-black/20 rounded-full h-2 overflow-hidden">
                    <div className={`h-full ${selected.color} opacity-70`} style={{ width: `${Math.min((size / selected.size) * 100, 100)}%` }} />
                  </div>
                  <span className="text-white/60 text-xs w-40 text-right shrink-0">{item}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ASSISTANT
// ─────────────────────────────────────────────

const RESPONSES = {
  cache:   "Cache files are temporary data stored by apps. They build up over time and waste disk space — it's safe to clear them. Apps rebuild what they need automatically. Go to Cleanup → System Junk.",
  memory:  "When RAM fills up macOS uses slow disk-based swap (swapping), which makes everything feel sluggish. Use Performance → Memory to free RAM instantly without restarting.",
  startup: "Login items are apps that auto-launch at boot. Too many severely slow boot time. Go to Performance → Login Items and toggle off the high-impact ones.",
  slow:    "Common causes: too many login items, full RAM, bloated caches, or low disk space. I'd start with Smart Care — it gives you a full breakdown in one scan.",
  disk:    "Check Space Lens for a visual breakdown of what's eating your storage. Common culprits: Xcode, Parallels VMs, video files, old iOS backups, and app caches.",
  malware: "Go to Protection → Malware Removal and run a scan. CleanMyMac detects adware, browser hijackers, and PUPs. Most threats are removed with one click.",
  default: "I can help with: cache files, RAM usage, startup items, disk space, or malware. What would you like to know?",
};

function getResponse(text) {
  const t = text.toLowerCase();
  if (t.includes('cache'))                                     return RESPONSES.cache;
  if (t.includes('memory') || t.includes('ram'))               return RESPONSES.memory;
  if (t.includes('startup') || t.includes('login') || t.includes('boot')) return RESPONSES.startup;
  if (t.includes('slow'))                                      return RESPONSES.slow;
  if (t.includes('disk') || t.includes('space') || t.includes('storage')) return RESPONSES.disk;
  if (t.includes('malware') || t.includes('virus') || t.includes('threat')) return RESPONSES.malware;
  return RESPONSES.default;
}

function Assistant() {
  const [messages, setMessages] = useState([{ role: 'assistant', text: "Hi! I'm your Mac Assistant. Ask me anything — caches, RAM, startup items, malware, disk space. What do you need?" }]);
  const [input,    setInput]    = useState('');
  const bottomRef               = useRef(null);

  const send = () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setMessages(p => [...p, { role: 'user', text: userText }]);
    setInput('');
    setTimeout(() => setMessages(p => [...p, { role: 'assistant', text: getResponse(userText) }]), 600);
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const suggestions = ['Why is my Mac slow?', 'What are cache files?', 'How to free up RAM?', 'Check disk space'];

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      <div className="mb-4"><h2 className="text-2xl font-bold text-white">Assistant</h2><p className="text-emerald-200/60 text-sm mt-1">Ask anything about your Mac</p></div>
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-4 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center mr-2 shrink-0 mt-1">
                <Smile size={16} className="text-emerald-400" />
              </div>
            )}
            <div className={`max-w-sm lg:max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-emerald-500/20 text-white rounded-tr-sm' : 'bg-white/5 text-white/80 rounded-tl-sm border border-white/10'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => setInput(s)} className="text-xs text-emerald-300/70 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 px-3 py-1.5 rounded-full transition-all">{s}</button>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about your Mac…"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-500/50" />
        <button onClick={send} className="bg-emerald-600 hover:opacity-90 text-white w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────

const SIDEBAR = [
  { name: 'Smart Care',   icon: Monitor  },
  { name: 'Cleanup',      icon: Sparkles },
  { name: 'Protection',   icon: Shield   },
  { name: 'Performance',  icon: Zap      },
  { name: 'Applications', icon: Layers   },
  { name: 'My Clutter',   icon: Folder   },
  { name: 'Space Lens',   icon: Maximize },
];

function renderSection(name) {
  switch (name) {
    case 'Smart Care':   return <SmartCare />;
    case 'Cleanup':      return <Cleanup />;
    case 'Protection':   return <Protection />;
    case 'Performance':  return <Performance />;
    case 'Applications': return <Applications />;
    case 'My Clutter':   return <MyClutter />;
    case 'Space Lens':   return <SpaceLens />;
    case 'Assistant':    return <Assistant />;
    default:             return <SmartCare />;
  }
}

export default function CleanMyMac() {
  const [active, setActive] = useState('Smart Care');

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8 font-sans">
      <h1 className="sr-only">CleanMyMac demo</h1>
      <div className="w-full max-w-6xl h-[800px] max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-slate-900 relative">

        {/* macOS title bar */}
        <div className="h-12 w-full flex items-center px-4 shrink-0 bg-white/5 z-20 absolute top-0 left-0 border-b border-white/5">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80 border border-red-600/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-600/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 border border-green-600/50" />
          </div>
          <span className="mx-auto text-white/30 text-sm font-medium">CleanMyMac</span>
        </div>

        <div className="flex flex-1 pt-12 h-full overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0 border-r border-white/5 bg-black/20 flex flex-col justify-between py-6">
            <div className="px-4 space-y-1">
              {SIDEBAR.map(item => (
                <button key={item.name} onClick={() => setActive(item.name)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${active === item.name ? 'bg-white/10 text-white border border-white/5' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
                  <item.icon size={18} className={active === item.name ? 'text-emerald-400' : ''} />
                  {item.name}
                </button>
              ))}
            </div>
            <div className="px-4">
              <button onClick={() => setActive('Assistant')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${active === 'Assistant' ? 'bg-white/10 text-white border border-white/5' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
                <Smile size={18} className={active === 'Assistant' ? 'text-emerald-400' : ''} />
                Assistant
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {renderSection(active)}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.1); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
