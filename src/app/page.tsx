'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { auth, documents, query } from '@/app/lib/api';
import AnalyticsContent from '@/components/AnalyticsContent';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import {
  Send, FileText, BarChart3, MessageSquare, LogOut,
  Upload, Trash2, User, Sparkles, Loader2,
  AlertCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'chat' | 'docs' | 'analytics';

type DocumentType = {
  document_id?: string;
  id?: string;
  _id?: string;
  filename: string;
  status: string;
};

type UserType = {
  full_name?: string;
  email: string;
};

type Message = { role: 'user' | 'assistant'; content: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDocId = (doc: DocumentType): string =>
  doc.document_id ?? doc.id ?? doc._id ?? doc.filename;

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [tab, setTab]                     = useState<Tab>('chat');
  const [user, setUser]                   = useState<UserType | null>(null);
  const [isLoading, setIsLoading]         = useState(true);

  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [fullName, setFullName]           = useState('');
  const [authMode, setAuthMode]           = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading]     = useState(false);

  const [docs, setDocs]                   = useState<DocumentType[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const [question, setQuestion]           = useState('');
  const [messages, setMessages]           = useState<Message[]>([]);
  const [chatLoading, setChatLoading]     = useState(false);

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── loadDocuments ─────────────────────────────────────────────────────────

  const loadDocuments = useCallback(async () => {
    try {
      const res = await documents.list() as { documents?: DocumentType[] };
      const newDocs: DocumentType[] = res?.documents ?? [];
      setDocs(newDocs);
      if (newDocs.length > 0) {
        setSelectedDocId(prev => prev ?? getDocId(newDocs[0]));
      }
    } catch (err) {
      console.error(err);
      setDocs([]);
    }
  }, []);

  // ── checkAuth ─────────────────────────────────────────────────────────────

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const userData = await auth.getMe() as UserType;
      setUser(userData);
      await loadDocuments();
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [loadDocuments]);

  useEffect(() => {
    checkAuth().finally(() => setIsLoading(false));
  }, [checkAuth]);

  // ── Polling ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      if (localStorage.getItem('token')) loadDocuments();
    }, 8000);
    return () => clearInterval(interval);
  }, [loadDocuments]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Auth ──────────────────────────────────────────────────────────────────

  const handleAuth = async () => {
    setAuthLoading(true);
    try {
      const res = authMode === 'login'
        ? await auth.login(email, password) as { access_token: string; user: UserType }
        : await auth.register(email, password, fullName) as { access_token: string; user: UserType };
      localStorage.setItem('token', res.access_token);
      setUser(res.user);
      await loadDocuments();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Chat ──────────────────────────────────────────────────────────────────

  const handleAsk = async () => {
    if (!question.trim() || !selectedDocId) return;
    const q = question;
    setQuestion('');
    setMessages((p) => [...p, { role: 'user', content: q }]);
    setChatLoading(true);
    try {
      const res = await query.ask(q, selectedDocId) as { answer?: string; response?: string };
      setMessages((p) => [...p, { role: 'assistant', content: res.answer ?? res.response ?? 'No response.' }]);
    } catch {
      setMessages((p) => [...p, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── File upload ───────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/upload/`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
      });
      if (!res.ok) throw new Error('Upload failed');
      await loadDocuments();
    } catch {
      alert('Upload failed');
    }
  };

  // ── Delete doc ────────────────────────────────────────────────────────────

  const handleDeleteDoc = async (docId: string) => {
    try {
      const res = await fetch(`${API_URL}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      await loadDocuments();
      if (selectedDocId === docId) {
        setSelectedDocId(null);
        setMessages([]);
      }
    } catch {
      alert('Delete failed');
    }
  };

  // ── Nav items (shared between sidebar + bottom nav) ───────────────────────

  const navItems = [
    { id: 'chat',      label: 'Chat',      Icon: MessageSquare },
    { id: 'docs',      label: 'Documents', Icon: FileText      },
    { id: 'analytics', label: 'Analytics', Icon: BarChart3     },
  ] as const;

  // ── Loading screen ────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-[#f9f7ff]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-purple-100 border-t-purple-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles size={20} className="text-purple-500" />
          </div>
        </div>
        <p className="text-gray-400 text-sm font-medium animate-pulse">Loading PrismAI…</p>
      </div>
    </div>
  );

  // ── Auth screen ───────────────────────────────────────────────────────────

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9f7ff] p-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-200 rounded-full opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-200 rounded-full opacity-30 blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md shadow-2xl border-0 relative bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-2 pt-10">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-400 rounded-3xl blur-xl opacity-40 scale-125" />
              <div className="relative p-5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl shadow-lg">
                <Sparkles className="h-11 w-11 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-4xl font-black tracking-tight bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">
            PrismAI
          </CardTitle>
          <p className="text-muted-foreground mt-2 text-sm">Refract your documents into brilliant insights</p>
        </CardHeader>

        <CardContent className="space-y-5 px-8 pb-10">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(['login', 'register'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setAuthMode(mode)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 capitalize ${
                  authMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {mode === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {authMode === 'register' && (
              <Input
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-12 rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-200"
              />
            )}
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-200"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-200"
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            />
          </div>

          <Button
            onClick={handleAuth}
            className="w-full h-12 text-sm font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
            disabled={authLoading}
          >
            {authLoading
              ? <span className="flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> Processing…</span>
              : authMode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // ── Main app ──────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-[#f9f7ff]">

      {/* ── Header ── */}
      <header className="h-14 border-b border-border bg-white/90 backdrop-blur-md flex items-center px-3 md:px-6 justify-between z-50 shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-sm">
            <Sparkles className="text-white" size={15} />
          </div>
          <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">
            PrismAI
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-100 px-2 md:px-3 py-1.5 rounded-full">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center shrink-0">
              <User size={10} className="text-white" />
            </div>
            {/* Hide name on very small screens */}
            <span className="font-medium text-xs hidden sm:inline truncate max-w-[120px]">
              {user.full_name ?? user.email}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
            onClick={() => { localStorage.removeItem('token'); setUser(null); }}
          >
            <LogOut size={16} />
          </Button>
        </div>
      </header>

      {/* ── Top nav — mobile only, sits just below header ── */}
      <nav className="md:hidden bg-white border-b border-border flex items-center justify-around px-2 shrink-0 shadow-sm">
        {navItems.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              tab === id
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon size={16} strokeWidth={tab === id ? 2.5 : 1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar — desktop only ── */}
        <div className="hidden md:flex w-60 border-r border-border bg-white p-4 flex-col shrink-0">
          <nav className="space-y-1">
            {navItems.map(({ id, label, Icon }) => (
              <Button
                key={id}
                variant={tab === id ? 'default' : 'ghost'}
                className={`w-full justify-start gap-3 rounded-xl transition-all ${
                  tab === id
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'hover:bg-purple-50 hover:text-purple-700 text-gray-600'
                }`}
                onClick={() => setTab(id)}
              >
                <Icon size={16} /> {label}
              </Button>
            ))}
          </nav>

          <Separator className="my-6" />

          <div className="px-3 space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Documents</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${docs.length > 0 ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              <span className="text-xs text-muted-foreground font-medium">
                {docs.length} file{docs.length !== 1 ? 's' : ''} uploaded
              </span>
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-auto p-3 md:p-6">

          {/* CHAT */}
          {tab === 'chat' && (
            <div className="h-full flex flex-col">
              {selectedDocId ? (
                <div className="mb-3 md:mb-4 p-3 md:p-4 bg-white border border-border rounded-2xl flex items-center gap-3 shrink-0 shadow-sm">
                  <div className="p-2 bg-purple-100 rounded-xl">
                    <FileText className="text-purple-600" size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {docs.find((d) => getDocId(d) === selectedDocId)?.filename}
                    </p>
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                      Connected &amp; Ready
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mb-3 md:mb-4 p-3 md:p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 shrink-0">
                  <AlertCircle size={15} className="text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-700 font-medium">
                    Select a document from the Documents tab to start chatting
                  </p>
                </div>
              )}

              <ScrollArea className="flex-1 bg-white border border-border rounded-3xl p-3 md:p-6 mb-3 md:mb-4 shadow-sm">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-20">
                    <div className="p-5 bg-purple-50 rounded-3xl">
                      <MessageSquare size={30} className="text-purple-200" />
                    </div>
                    <p className="text-gray-500 font-semibold text-sm">Ready to answer your questions</p>
                    <p className="text-xs text-gray-400 max-w-[200px]">Type your first question below</p>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div key={i} className={`mb-4 md:mb-5 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role === 'assistant' && (
                        <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mr-2 shrink-0 mt-0.5 shadow-sm">
                          <Sparkles size={11} className="text-white" />
                        </div>
                      )}
                      <div className={`max-w-[85%] md:max-w-[75%] p-3 md:p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        m.role === 'user'
                          ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-br-sm'
                          : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-bl-sm'
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start mb-4 md:mb-5">
                    <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mr-2 shrink-0 shadow-sm">
                      <Sparkles size={11} className="text-white" />
                    </div>
                    <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl rounded-bl-sm">
                      <div className="flex gap-1.5 items-center">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </ScrollArea>

              <div className="flex gap-2 md:gap-3 shrink-0">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask anything about the document…"
                  disabled={!selectedDocId}
                  className="rounded-xl border-gray-200 focus:border-purple-400 h-12"
                  onKeyDown={(e) => e.key === 'Enter' && !chatLoading && handleAsk()}
                />
                <Button
                  onClick={handleAsk}
                  disabled={!selectedDocId || chatLoading}
                  className="h-12 px-4 md:px-5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md transition-all shrink-0"
                >
                  {chatLoading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                </Button>
              </div>
            </div>
          )}

          {/* DOCUMENTS */}
          {tab === 'docs' && (
            <div className="space-y-4 md:space-y-6">
              <Card
                className="border-2 border-dashed border-gray-200 hover:border-purple-400 bg-white hover:bg-purple-50/20 cursor-pointer transition-all duration-200"
                onClick={() => fileInputRef.current?.click()}
              >
                {/* Reduced padding on mobile */}
                <CardContent className="p-8 md:p-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 md:p-5 bg-gray-50 rounded-3xl">
                      <Upload size={30} className="text-gray-300" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-500">Click to upload a document</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT and more</p>
                    </div>
                  </div>
                  <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} />
                </CardContent>
              </Card>

              {docs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 md:py-16 gap-3">
                  <div className="p-5 bg-gray-50 rounded-3xl">
                    <FileText size={30} className="text-gray-200" />
                  </div>
                  <p className="text-sm font-semibold text-gray-400">No documents yet</p>
                  <p className="text-xs text-gray-300">Upload a file above to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {docs.map((doc) => {
                    const id = getDocId(doc);
                    const isActive = selectedDocId === id;
                    return (
                      <Card
                        key={id}
                        className={`transition-all duration-200 hover:shadow-md ${
                          isActive ? 'border-purple-200 bg-purple-50/30 shadow-sm' : ''
                        }`}
                      >
                        <CardContent className="p-4 md:p-5 flex justify-between items-center gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2.5 rounded-xl shrink-0 ${isActive ? 'bg-purple-100' : 'bg-gray-100'}`}>
                              <FileText size={15} className={isActive ? 'text-purple-600' : 'text-gray-400'} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{doc.filename}</p>
                              <p className={`text-xs mt-0.5 font-semibold ${
                                doc.status === 'ready' ? 'text-emerald-500' : 'text-amber-500'
                              }`}>
                                {doc.status === 'ready' ? '● Ready' : '⏳ ' + doc.status}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant={isActive ? 'default' : 'outline'}
                              className={`text-xs rounded-lg ${
                                isActive
                                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-0'
                                  : 'hover:border-purple-300 hover:text-purple-600'
                              }`}
                              onClick={() => { setSelectedDocId(id); setTab('chat'); }}
                            >
                              {isActive ? 'Active' : 'Select'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              onClick={() => handleDeleteDoc(id)}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ANALYTICS */}
          {tab === 'analytics' && <AnalyticsContent />}

        </main>
      </div>



    </div>
  );
}
