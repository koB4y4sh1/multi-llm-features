/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Upload, 
  Search, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Loader2, 
  X, 
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { getEmbedding } from './services/embeddingService';

// Set worker source using modern Vite approach
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

async function extractTextFromOffice(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'docx') {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } else if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let fullText = '';
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      fullText += XLSX.utils.sheet_to_txt(sheet) + '\n';
    });
    return fullText;
  } else if (extension === 'pptx') {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
    let fullText = '';
    for (const slideFile of slideFiles) {
      const content = await zip.files[slideFile].async('string');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');
      const textNodes = xmlDoc.getElementsByTagName('a:t');
      for (let i = 0; i < textNodes.length; i++) {
        fullText += textNodes[i].textContent + ' ';
      }
      fullText += '\n';
    }
    return fullText;
  }
  return '';
}
import { saveFile, getAllFiles, deleteFile, cosineSimilarity } from './services/vectorStore';
import { EmbeddedFile, FileType, SearchResult } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [files, setFiles] = useState<EmbeddedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ [key in FileType]: SearchResult[] }>({
    image: [],
    video: [],
    audio: [],
    document: []
  });
  const [activeTab, setActiveTab] = useState<FileType | 'all'>('all');
  const [topK, setTopK] = useState(3);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    const storedFiles = await getAllFiles();
    setFiles(storedFiles);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (selectedFiles.length > 5) {
      alert('一度にアップロードできるのは最大5ファイルまでです。');
      return;
    }

    setIsUploading(true);
    const newProgress = { ...uploadProgress };

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileId = Math.random().toString(36).substring(7);
      newProgress[file.name] = 'processing';
      setUploadProgress({ ...newProgress });

      try {
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
            reader.readAsText(file);
          } else {
            reader.readAsDataURL(file);
          }
        });

        let type: FileType = 'document';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';

        let embeddingInput: any;
        let extractedText: string | undefined;

        const isOfficeFile = [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-excel',
          'text/csv'
        ].includes(file.type) || 
        ['.docx', '.xlsx', '.xls', '.pptx', '.csv'].some(ext => file.name.toLowerCase().endsWith(ext));

        if (isOfficeFile) {
          extractedText = await extractTextFromOffice(file);
          embeddingInput = extractedText;
        } else if (file.type === 'application/pdf' || type !== 'document') {
          const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
          embeddingInput = { data: base64Data, mimeType: file.type };
        } else {
          embeddingInput = fileData;
        }

        const embedding = await getEmbedding(embeddingInput);

        const embeddedFile: EmbeddedFile = {
          id: fileId,
          name: file.name,
          type,
          mimeType: file.type,
          data: fileData,
          extractedText,
          embedding,
          timestamp: Date.now()
        };

        await saveFile(embeddedFile);
        newProgress[file.name] = 'complete';
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        newProgress[file.name] = 'error';
      }
      setUploadProgress({ ...newProgress });
    }

    await loadFiles();
    setIsUploading(false);
    setTimeout(() => setUploadProgress({}), 3000);
  };

  const handleDelete = async (id: string) => {
    await deleteFile(id);
    await loadFiles();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || files.length === 0) return;

    setIsSearching(true);
    try {
      const queryEmbedding = await getEmbedding(searchQuery);
      
      const resultsWithScores = files.map(file => ({
        ...file,
        score: cosineSimilarity(queryEmbedding, file.embedding)
      }));

      // Sort by score descending and take top K overall
      const topResults = resultsWithScores
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      const grouped: { [key in FileType]: SearchResult[] } = {
        image: [],
        video: [],
        audio: [],
        document: []
      };

      topResults.forEach(res => {
        grouped[res.type].push(res);
      });

      setSearchResults(grouped);
      setActiveTab('all'); // Default to all to show the top 3
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredResults = useMemo(() => {
    if (activeTab === 'all') {
      return Object.values(searchResults).flat().sort((a, b) => b.score - a.score);
    }
    return searchResults[activeTab];
  }, [searchResults, activeTab]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Search className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Multimodal RAG</h1>
              <p className="text-xs text-white/40 font-mono uppercase tracking-widest">Gemini Embedding 2.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-white/40 font-mono">{files.length} FILES INDEXED</p>
              <div className="h-1 w-24 bg-white/10 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${Math.min((files.length / 20) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Search Section */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
              <span className="text-xs font-mono text-white/40 uppercase tracking-wider">Top Results</span>
              <select 
                value={topK} 
                onChange={(e) => setTopK(Number(e.target.value))}
                className="bg-transparent text-emerald-500 font-bold outline-none cursor-pointer"
              >
                {[1, 3, 5, 10].map(n => (
                  <option key={n} value={n} className="bg-[#141414]">{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500" />
            <div className="relative flex items-center bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="pl-6 text-white/40">
                <Search className="w-6 h-6" />
              </div>
              <input
                type="text"
                placeholder="マルチモーダル検索クエリを入力..."
                className="w-full bg-transparent px-6 py-6 text-xl outline-none placeholder:text-white/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className={cn(
                  "mr-2 px-10 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-500 flex items-center gap-3 group/btn relative overflow-hidden",
                  isSearching || !searchQuery.trim()
                    ? "bg-white/5 text-white/10 cursor-not-allowed border border-white/5"
                    : "bg-emerald-500 text-black hover:bg-white hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] active:scale-95 border border-emerald-400/50"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span className="relative z-10">SEARCH</span>
                    <ChevronRight className="w-4 h-4 transition-transform duration-500 group-hover/btn:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {(['all', 'image', 'video', 'audio', 'document'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
                  activeTab === tab 
                    ? "bg-white text-black border-white" 
                    : "bg-white/5 text-white/60 border-white/5 hover:border-white/20"
                )}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Results Area */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">検索結果 <span className="text-emerald-500 text-sm font-mono ml-2">TOP {topK} RESULTS</span></h2>
            </div>
            <AnimatePresence mode="wait">
              {filteredResults.length > 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 gap-8"
                >
                  {filteredResults.map((result) => (
                    <ResultCard key={result.id} result={result} />
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-white/5 rounded-3xl text-white/20"
                >
                  <Search className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">検索結果がありません</p>
                  <p className="text-sm">クエリを入力して検索を開始してください</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar / Upload Area */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-[#141414] border border-white/10 rounded-3xl p-8 space-y-6 sticky top-32">
              <div className="space-y-2">
                <h2 className="text-xl font-bold">ファイル管理</h2>
                <p className="text-sm text-white/40">最大5ファイルまで同時アップロード可能</p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "group relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-4",
                  isUploading 
                    ? "border-emerald-500/50 bg-emerald-500/5" 
                    : "border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  multiple 
                  className="hidden" 
                  accept="image/*,video/*,audio/*,.txt,.md,.pdf"
                />
                
                {isUploading ? (
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                ) : (
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-white/60" />
                  </div>
                )}
                
                <div className="text-center">
                  <p className="font-bold">{isUploading ? '処理中...' : 'クリックしてアップロード'}</p>
                  <p className="text-xs text-white/40 mt-1">画像, 動画, 音声, テキスト</p>
                </div>
              </div>

              {/* Upload Progress */}
              <AnimatePresence>
                {Object.keys(uploadProgress).length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {Object.entries(uploadProgress).map(([name, status]) => (
                      <div key={name} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3 min-w-0">
                          {status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
                          {status === 'complete' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          {status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                          <span className="text-xs truncate text-white/60">{name}</span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-mono uppercase px-2 py-0.5 rounded",
                          status === 'processing' && "bg-emerald-500/20 text-emerald-500",
                          status === 'complete' && "bg-emerald-500/20 text-emerald-500",
                          status === 'error' && "bg-red-500/20 text-red-500"
                        )}>
                          {status}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* File List */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">インデックス済み</h3>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">{files.length}</span>
                </div>
                
                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 scrollbar-thin">
                  {files.length > 0 ? (
                    files.map((file) => (
                      <div key={file.id} className="group flex items-center justify-between bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileIcon type={file.type} className="w-4 h-4 text-white/40" />
                          <span className="text-xs truncate text-white/80">{file.name}</span>
                        </div>
                        <button 
                          onClick={() => handleDelete(file.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8 text-xs text-white/20 italic">ファイルがありません</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 text-white/40 text-xs font-mono">
        <p>© 2026 MULTIMODAL RAG SEARCH SYSTEM</p>
        <div className="flex items-center gap-6">
          <p>STATUS: OPERATIONAL</p>
          <p>LATENCY: 42MS</p>
        </div>
      </footer>
    </div>
  );
}

function FileIcon({ type, className }: { type: FileType; className?: string }) {
  switch (type) {
    case 'image': return <ImageIcon className={className} />;
    case 'video': return <Video className={className} />;
    case 'audio': return <Music className={className} />;
    case 'document': return <FileText className={className} />;
  }
}

function ResultCard({ result }: { result: SearchResult }) {
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (result.mimeType === 'application/pdf') {
      renderPdfPreview();
    }
  }, [result]);

  const renderPdfPreview = async () => {
    try {
      const base64Data = result.data.split(',')[1];
      const binaryData = atob(base64Data);
      const uint8Array = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i);
      }

      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        setPdfPreview(canvas.toDataURL());
      }
    } catch (error) {
      console.error('PDF preview error:', error);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    if (result.type === 'document' && !result.data.startsWith('data:')) {
      // For text documents that aren't data URLs
      const blob = new Blob([result.data], { type: result.mimeType });
      link.href = URL.createObjectURL(blob);
    } else {
      link.href = result.data;
    }
    link.download = result.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="group relative bg-[#141414] border border-white/10 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all duration-500">
      {/* Score Badge */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-emerald-500">
            {Math.round(result.score * 100)}% MATCH
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Preview Area */}
        <div className="md:w-1/2 aspect-video md:aspect-auto bg-black relative overflow-hidden flex items-center justify-center">
          {result.type === 'image' && (
            <img 
              src={result.data} 
              alt={result.name} 
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700" 
              referrerPolicy="no-referrer"
            />
          )}
          {result.type === 'video' && (
            <video 
              src={result.data} 
              controls 
              className="w-full h-full object-contain"
            />
          )}
          {result.type === 'audio' && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-8">
              <Music className="w-16 h-16 text-emerald-500/40 mb-4" />
              <audio src={result.data} controls className="w-full max-w-[300px]" />
            </div>
          )}
          {result.type === 'document' && (
            <div className="w-full h-full p-8 overflow-y-auto bg-white/5 scrollbar-thin">
              {result.mimeType === 'application/pdf' ? (
                pdfPreview ? (
                  <img src={pdfPreview} alt="PDF Preview" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-white/20">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-[10px] uppercase font-mono">Rendering PDF...</p>
                  </div>
                )
              ) : (
                <p className="text-xs font-mono text-white/60 leading-relaxed whitespace-pre-wrap">
                  {result.extractedText || (result.data.length > 2000 ? result.data.substring(0, 2000) + '...' : result.data)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Info Area */}
        <div className="md:w-1/2 p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/5 rounded-xl">
                <FileIcon type={result.type} className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold truncate">{result.name}</h3>
                <p className="text-xs text-white/40 uppercase tracking-wider font-mono">{result.mimeType}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs text-white/40 font-mono uppercase tracking-widest">Metadata</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-[10px] text-white/30 uppercase">Indexed At</p>
                  <p className="text-xs font-mono">{new Date(result.timestamp).toLocaleDateString()}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-[10px] text-white/30 uppercase">File ID</p>
                  <p className="text-xs font-mono truncate">{result.id}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-8">
            <button 
              onClick={handleDownload}
              className="flex-1 bg-white text-black hover:bg-white/90 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4 rotate-180" /> ダウンロード
            </button>
            <button className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
