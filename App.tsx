
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  Trash2, 
  ShieldCheck, 
  X, 
  Edit2, 
  UserCircle2, 
  ClipboardList, 
  FileDown, 
  Activity, 
  HardDrive, 
  FileSearch, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Database
} from 'lucide-react';

import { OperationalRecord, StatusMessage, FormData } from './types';
import { extractDataFromDocument } from './services/geminiService';

const LOCAL_STORAGE_KEY = 'gcm_ribeirao_records_internal';

const App: React.FC = () => {
  const [records, setRecords] = useState<OperationalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<StatusMessage | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    nomeRequerido: '',
    telefone: '',
    endereco: '',
    pontoReferencia: '',
    observacoes: ''
  });

  // Load records from Local Storage on startup
  useEffect(() => {
    const loadData = () => {
      setLoading(true);
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          setRecords(JSON.parse(saved));
        }
      } catch (err) {
        console.error("Error loading local data:", err);
        showStatus("Erro ao carregar banco de dados local.", "error");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Sync records to Local Storage whenever they change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
    }
  }, [records, loading]);

  const showStatus = (text: string, type: StatusMessage['type'] = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiProcessing(true);
    showStatus("Analisando documento com IA...", "info");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const extracted = await extractDataFromDocument(base64Data, file.type);
        
        if (extracted && extracted.length > 0) {
          const newRecords = extracted.map(item => ({
            ...item,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
          }));
          
          setRecords(prev => [...newRecords, ...prev]);
          showStatus(`${extracted.length} registros extraídos e salvos internamente!`, "success");
        } else {
          showStatus("Não foi possível extrair dados legíveis.", "error");
        }
      };
    } catch (err) {
      console.error(err);
      showStatus("Falha na extração por IA.", "error");
    } finally {
      setAiProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGeneratePDF = () => {
    if (records.length === 0) {
      showStatus("Sem registros para exportar.", "info");
      return;
    }
    
    // @ts-ignore
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, 297, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("GCM RIBEIRÃO - RELATÓRIO OPERACIONAL INTERNO", 15, 15);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 240, 15);

    const tableData = records.map((r, idx) => [
      (idx + 1).toString().padStart(2, '0'),
      r.nome.toUpperCase(),
      (r.nomeRequerido || "-").toUpperCase(),
      r.telefone || "-",
      `${r.endereco}${r.pontoReferencia ? `\n(Ref: ${r.pontoReferencia})` : ""}`,
      r.observacoes || ""
    ]);

    // @ts-ignore
    doc.autoTable({
      head: [["ID", "NOME", "REQUERIDO", "FONE", "LOCALIZAÇÃO", "OBSERVAÇÕES"]],
      body: tableData,
      startY: 30,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [75, 0, 130], textColor: 255 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 
        0: { cellWidth: 15 }, 
        1: { cellWidth: 45 }, 
        2: { cellWidth: 45 }, 
        3: { cellWidth: 25 },
        4: { cellWidth: 60 }
      }
    });

    doc.save(`GCM_Interno_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      setRecords(prev => prev.map(r => r.id === editingId ? {
        ...r,
        ...formData,
        updatedAt: new Date().toISOString()
      } : r));
      showStatus("Registro atualizado no sistema.");
    } else {
      const newRecord: OperationalRecord = {
        ...formData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      };
      setRecords(prev => [newRecord, ...prev]);
      showStatus("Novo registro salvo no sistema local.");
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ nome: '', nomeRequerido: '', telefone: '', endereco: '', pontoReferencia: '', observacoes: '' });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (record: OperationalRecord) => {
    setFormData({
      nome: record.nome,
      nomeRequerido: record.nomeRequerido,
      telefone: record.telefone,
      endereco: record.endereco,
      pontoReferencia: record.pontoReferencia,
      observacoes: record.observacoes
    });
    setEditingId(record.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Deseja realmente excluir este registro permanentemente do sistema interno?")) return;
    setRecords(prev => prev.filter(r => r.id !== id));
    showStatus("Registro removido do sistema.", "info");
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => 
      r.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.nomeRequerido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.endereco?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.observacoes?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf" />

      {/* Modern Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-xl border-b border-indigo-900/30">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
              <ShieldCheck size={28} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold tracking-tight uppercase">GCM Ribeirão</h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest leading-none">Sistema de Banco Local</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={aiProcessing}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 px-4 py-2.5 rounded-xl border border-slate-700 transition-all text-sm font-semibold disabled:opacity-50"
            >
              {aiProcessing ? <Loader2 className="animate-spin" size={18} /> : <FileSearch size={18} />} 
              <span className="hidden md:inline">Extrair por IA</span>
            </button>

            <button 
              onClick={handleGeneratePDF}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl border border-slate-700 transition-all text-sm font-semibold"
            >
              <FileDown size={18} />
              <span className="hidden md:inline">Relatório PDF</span>
            </button>

            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-50 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/30 text-sm font-bold active:scale-95"
            >
              <Plus size={20} />
              <span>Novo Registro</span>
            </button>
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {statusMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top duration-300">
          <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border backdrop-blur-md ${
            statusMsg.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 
            statusMsg.type === 'info' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 
            'bg-green-50 border-green-200 text-green-700'
          }`}>
            {statusMsg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span className="font-semibold text-sm">{statusMsg.text}</span>
          </div>
        </div>
      )}

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">
        {/* Search and stats bar */}
        <div className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="relative flex-grow max-w-2xl">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={20} />
            </div>
            <input 
              type="text"
              placeholder="Pesquisar nos registros locais..."
              className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-slate-800 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
              <Database size={16} className="text-indigo-500" />
              <span>{records.length} Registros Ativos</span>
            </div>
            <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
              <HardDrive size={14} />
              <span>Armazenamento Local</span>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-32 flex flex-col items-center">
              <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
              <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.2em]">Acessando Memória do Sistema...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="col-span-full py-40 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center opacity-60">
              <Search className="text-slate-300 mb-6" size={64} />
              <p className="text-slate-500 font-bold text-lg">Nenhum registro encontrado</p>
              <p className="text-slate-400 text-sm mt-1">Sua base de dados interna está limpa.</p>
            </div>
          ) : (
            filteredRecords.map((record) => (
              <div 
                key={record.id} 
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all group flex flex-col h-full overflow-hidden relative"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:bg-indigo-50 transition-colors"></div>

                <div className="flex justify-between items-start mb-5 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
                      {record.nome?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 leading-tight uppercase line-clamp-1">{record.nome}</h3>
                      <p className="text-indigo-600 font-bold text-[10px] tracking-widest flex items-center gap-1.5 mt-1 bg-indigo-50 w-fit px-2 py-0.5 rounded-md">
                        <Phone size={12} /> {record.telefone || 'Sem contato'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(record)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(record.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>

                <div className="space-y-4 flex-grow relative z-10">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                    <div className="flex gap-3">
                      <UserCircle2 className="text-slate-400 shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Parte Requerida</p>
                        <p className="text-slate-700 font-semibold text-sm italic">{record.nomeRequerido || 'Não identificado'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                    <div className="flex gap-3">
                      <MapPin className="text-indigo-400 shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Localização</p>
                        <p className="text-slate-700 font-semibold text-sm leading-snug line-clamp-2">{record.endereco || 'Local não informado'}</p>
                        {record.pontoReferencia && <p className="text-indigo-500 text-[10px] font-bold mt-1.5 italic">Ref: {record.pontoReferencia}</p>}
                      </div>
                    </div>
                  </div>

                  {record.observacoes && (
                    <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                      <div className="flex gap-3">
                        <ClipboardList className="text-indigo-300 shrink-0 mt-0.5" size={18} />
                        <div>
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Notas Operacionais</p>
                          <p className="text-slate-600 text-[13px] font-medium leading-relaxed italic line-clamp-3">{record.observacoes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <span>SISTEMA INTERNO</span>
                  <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-12 text-center mt-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <ShieldCheck size={20} className="text-indigo-600" />
            <span className="text-slate-800 font-bold uppercase tracking-[0.3em] text-sm">GCM Ribeirão Digital • Offline Ready</span>
          </div>
          <p className="text-slate-400 text-xs font-medium max-w-lg mx-auto leading-relaxed">
            Plataforma de gerenciamento local. Seus dados permanecem apenas neste dispositivo.
          </p>
          <div className="mt-8 pt-8 border-t border-slate-100">
            <p className="text-slate-300 text-[10px] uppercase font-black tracking-widest mb-1">Desenvolvido por</p>
            <p className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-indigo-600 font-black text-2xl uppercase italic">Estevão</p>
          </div>
        </div>
      </footer>

      {/* Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 px-8 py-6 flex justify-between items-center text-white">
              <div>
                <h2 className="text-2xl font-bold uppercase tracking-tight">{editingId ? 'Editar Registro' : 'Novo Registro no Sistema'}</h2>
                <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest mt-1 opacity-80">Salvamento imediato na memória local</p>
              </div>
              <button onClick={resetForm} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nome Principal / Vítima</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-semibold" 
                    value={formData.nome} 
                    onChange={(e) => setFormData({...formData, nome: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Parte / Requerido</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-semibold" 
                    value={formData.nomeRequerido} 
                    onChange={(e) => setFormData({...formData, nomeRequerido: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Contato</label>
                  <input 
                    type="text" 
                    placeholder="(00) 00000-0000"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-semibold" 
                    value={formData.telefone} 
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Ponto de Referência</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-semibold" 
                    value={formData.pontoReferencia} 
                    onChange={(e) => setFormData({...formData, pontoReferencia: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Endereço</label>
                <input 
                  required 
                  type="text" 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-semibold" 
                  value={formData.endereco} 
                  onChange={(e) => setFormData({...formData, endereco: e.target.value})} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Relato Operacional</label>
                <textarea 
                  rows={4} 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-semibold resize-none" 
                  value={formData.observacoes} 
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})} 
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 transition-all uppercase tracking-widest text-sm active:scale-[0.98]"
                >
                  Confirmar e Salvar no Sistema
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
