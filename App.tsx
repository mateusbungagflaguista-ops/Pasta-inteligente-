
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SmartFile, AnalysisStatus } from './types';
import FileCard from './components/FileCard';
import { analyzeDocument, semanticSearch } from './services/geminiService';

const App: React.FC = () => {
  const [files, setFiles] = useState<SmartFile[]>(() => {
    const saved = localStorage.getItem('exfile_data');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [selectedFile, setSelectedFile] = useState<SmartFile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [semanticIds, setSemanticIds] = useState<string[] | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'folders' | 'trash'>('grid');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('exfile_data', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 3 && files.length > 0) {
        const ids = await semanticSearch(searchQuery, files);
        setSemanticIds(ids);
      } else {
        setSemanticIds(null);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery, files]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    setStatus(AnalysisStatus.ANALYZING);
    const newFiles: SmartFile[] = [];

    for (const file of Array.from(uploadedFiles) as File[]) {
      const isImage = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');
      const isVideo = file.type.startsWith('video/');
      const isPDF = file.type === 'application/pdf';
      
      const fileData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        if (isImage || isAudio || isVideo || isPDF) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      });

      const smartFile: SmartFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        content: fileData,
        isImage: isImage,
        isDeleted: false
      };

      const analysis = await analyzeDocument(smartFile);
      smartFile.summary = analysis.summary;
      smartFile.tags = analysis.tags;
      smartFile.aiInsights = analysis.insights;
      smartFile.suggestedFolder = analysis.suggestedFolder;
      
      newFiles.push(smartFile);
    }

    setFiles(prev => [...prev, ...newFiles]);
    setStatus(AnalysisStatus.COMPLETED);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleTrash = (id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, isDeleted: !f.isDeleted } : f));
    setSelectedFile(null);
  };

  const deleteForever = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setSelectedFile(null);
  };

  const activeFiles = files.filter(f => viewMode === 'trash' ? f.isDeleted : !f.isDeleted);

  const filteredFiles = activeFiles.filter(f => {
    if (semanticIds) return semanticIds.includes(f.id);
    const searchLower = searchQuery.toLowerCase();
    return f.name.toLowerCase().includes(searchLower) || f.tags?.some(t => t.toLowerCase().includes(searchLower));
  });

  const folders = Array.from(new Set(activeFiles.map(f => f.suggestedFolder || 'Sem Categoria')));

  const renderFilePreview = (file: SmartFile) => {
    if (file.isImage) {
      return <img src={file.content} alt={file.name} className="w-full rounded-xl shadow-md bg-black/5" />;
    }
    if (file.type.startsWith('audio/')) {
      return (
        <div className="bg-indigo-50 dark:bg-indigo-900/40 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
          <p className="text-[10px] font-bold text-indigo-500 uppercase mb-2">Reprodutor de Áudio</p>
          <audio controls className="w-full">
            <source src={file.content} type={file.type} />
            O teu browser não aguenta esse mambo.
          </audio>
        </div>
      );
    }
    if (file.type.startsWith('video/')) {
      return (
        <div className="bg-black rounded-xl overflow-hidden shadow-xl">
          <video controls className="w-full aspect-video">
            <source src={file.content} type={file.type} />
          </video>
        </div>
      );
    }
    if (file.type === 'application/pdf') {
      return (
        <iframe src={file.content} className="w-full h-[300px] rounded-xl border border-gray-200 dark:border-slate-700" title={file.name} />
      );
    }
    return (
      <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700 max-h-[200px] overflow-y-auto">
        <pre className="text-[10px] text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono">
          {file.content.substring(0, 5000)}
          {file.content.length > 5000 && "... (mambo muito grande)"}
        </pre>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 dark:text-gray-100 transition-colors duration-300">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            ExFile <span className="text-indigo-600 dark:text-indigo-400">Smart Hub</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
             <p className="text-gray-600 dark:text-gray-400 text-lg">O teu mambo inteligente.</p>
             {!isOnline && (
               <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200 uppercase animate-pulse">
                 Offline
               </span>
             )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            {isDarkMode ? '🌞' : '🌙'}
          </button>

          <button 
            onClick={() => setViewMode(viewMode === 'trash' ? 'grid' : 'trash')}
            className={`p-3 rounded-xl transition-all shadow-sm border ${viewMode === 'trash' ? 'bg-red-500 text-white border-red-600' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          <button 
            onClick={() => setViewMode(viewMode === 'grid' ? 'folders' : 'grid')}
            className="p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            {viewMode === 'grid' ? '📂' : '🖼️'}
          </button>
          
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={status === AnalysisStatus.ANALYZING}
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"
          >
            {status === AnalysisStatus.ANALYZING ? "A estudar o mambo..." : "Botar Ficheiros"}
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="relative group">
            <input 
              type="text" 
              placeholder={isOnline ? "Pesquisa inteligente (IA)..." : "Pesquisa rápida (Local)..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 dark:text-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-lg"
            />
            <div className="absolute left-4 top-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {viewMode === 'folders' ? (
            <div className="space-y-8">
              {folders.map(folderName => {
                const folderFiles = filteredFiles.filter(f => f.suggestedFolder === folderName);
                if (folderFiles.length === 0) return null;
                return (
                  <div key={folderName}>
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{folderName}</h2>
                      <div className="h-px flex-grow bg-gray-200 dark:bg-slate-800 ml-4"></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {folderFiles.map(file => (
                        <FileCard key={file.id} file={file} onClick={setSelectedFile} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredFiles.map(file => (
                <FileCard key={file.id} file={file} onClick={setSelectedFile} />
              ))}
            </div>
          )}

          {filteredFiles.length === 0 && (
            <div className="col-span-full py-20 text-center glass rounded-3xl border-2 border-dashed border-gray-300 dark:border-slate-700">
              <p className="text-gray-400">Não há mambos por aqui ainda...</p>
            </div>
          )}
        </div>

        <aside className="lg:col-span-4">
          <div className="glass rounded-3xl p-6 sticky top-8 border border-white dark:border-slate-700 shadow-xl min-h-[500px]">
            {selectedFile ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold dark:text-white">Ficheiro Aberto</h2>
                  <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* VISUALIZADOR UNIVERSAL */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pré-visualização</label>
                  {renderFilePreview(selectedFile)}
                </div>

                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/50 rounded-xl border border-indigo-100 dark:border-indigo-800">
                  <label className="text-[10px] font-bold text-indigo-500 uppercase block mb-1">Pasta da IA</label>
                  <p className="text-indigo-900 dark:text-indigo-200 font-bold">{selectedFile.suggestedFolder}</p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Resumo do Mambo</label>
                  <p className="text-gray-700 dark:text-gray-300 text-sm mt-1 leading-relaxed">
                    "{selectedFile.summary}"
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <button 
                    onClick={() => toggleTrash(selectedFile.id)}
                    className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${selectedFile.isDeleted ? 'bg-green-600 text-white' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}
                  >
                    {selectedFile.isDeleted ? "Recuperar mambo" : "Mandar pra lixeira"}
                  </button>
                  
                  {selectedFile.isDeleted && (
                    <button 
                      onClick={() => deleteForever(selectedFile.id)}
                      className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
                    >
                      Eliminar de vez!
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-3xl">
                  ⚡
                </div>
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">Escolhe um mambo</h3>
                <p className="text-gray-400 text-sm">Clica num ficheiro para abrir o player, ver o PDF ou ler o texto aqui mesmo.</p>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default App;
