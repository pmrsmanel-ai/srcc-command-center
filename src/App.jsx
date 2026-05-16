import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, Users, Calendar, LayoutDashboard, X, Edit, Trash2, Plus, Phone, AlertTriangle, Lock, LogOut, Search, Bell, Menu, ChevronLeft, User } from 'lucide-react';

// URL Google Apps Script Anda
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzmwVO-7m5ZoDc_fFcbK-1Kpe6sgjG7DcgjmJnZz2BxoiK2l0VmWu3HFsezE-uRycYdrQ/exec';

// Fungsi helper untuk memperbaiki format tanggal Google Sheets
const formatSheetDate = (dateStr) => {
  if (!dateStr) return '';
  // Cek apakah string adalah format ISO Date dari Google
  if (typeof dateStr === 'string' && dateStr.includes('T') && dateStr.includes('Z')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  }
  return String(dateStr); // Pastikan selalu mengembalikan string
};

const App = () => {
  // State Utama
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pin, setPin] = useState('');
  const [syncStatus, setSyncStatus] = useState('Menghubungkan...');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Data State
  const [checklists, setChecklists] = useState([]);
  const [team, setTeam] = useState([]);
  const [timeline, setTimeline] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState({ entity: '', action: '' });
  const [modalData, setModalData] = useState({});
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null, entity: '' });

  // Ambil Data saat pertama kali dibuka
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(GAS_URL);
      const data = await response.json();
      
      // Terapkan formatter ke data yang diambil
      if (data.checklists && data.checklists.length > 0) {
        setChecklists(data.checklists.map(item => ({...item, deadline: formatSheetDate(item.deadline)})));
      }
      if (data.team && data.team.length > 0) {
        setTeam(data.team);
      }
      if (data.timeline && data.timeline.length > 0) {
        setTimeline(data.timeline.map(item => ({...item, date: formatSheetDate(item.date)})));
      }
      
      setSyncStatus('Terhubung');
    } catch (error) {
      console.info('Koneksi background gagal / Offline:', error.message);
      setSyncStatus('Error');
    }
  };

  // Kirim Update ke Google Apps Script
  const handlePostUpdate = async (payload) => {
    setSyncStatus('Menyinkronkan...');
    try {
      const formBody = new URLSearchParams();
      formBody.append('data', JSON.stringify(payload));

      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        },
        body: formBody.toString()
      });
      setSyncStatus('Terhubung');
    } catch (error) {
      console.error('Post error:', error);
      setSyncStatus('Error');
    }
  };

  // CRUD Actions
  const toggleChecklist = (id) => {
    if (!isAdmin) return; // Kunci akses jika bukan admin
    setChecklists(checklists.map(item => {
      if (item.id === id) {
        const newState = !item.isDone;
        handlePostUpdate({ entity: 'CHECKLIST', action: 'TOGGLE', id: id, isDone: newState });
        return { ...item, isDone: newState };
      }
      return item;
    }));
  };

  const handleDeleteClick = (id, entity) => {
    if (!isAdmin) return;
    setConfirmDelete({ isOpen: true, id, entity });
  };

  const confirmDeleteAction = () => {
    const { id, entity } = confirmDelete;
    
    if (entity === 'CHECKLIST') setChecklists(checklists.filter(i => i.id !== id));
    if (entity === 'TEAM') setTeam(team.filter(i => i.id !== id));
    if (entity === 'TIMELINE') setTimeline(timeline.filter(i => i.id !== id));

    handlePostUpdate({ entity, action: 'DELETE', id });
    setConfirmDelete({ isOpen: false, id: null, entity: '' });
  };

  const openModal = (entity, action, data = null) => {
    if (!isAdmin) return;
    setModalType({ entity, action });
    setModalData(data || { id: Date.now().toString() });
    setIsModalOpen(true);
  };

  const handleModalSave = (e) => {
    e.preventDefault();
    const { entity, action } = modalType;

    if (action === 'ADD') {
      if (entity === 'CHECKLIST') setChecklists([...checklists, { ...modalData, isDone: false }]);
      if (entity === 'TEAM') setTeam([...team, modalData]);
      if (entity === 'TIMELINE') setTimeline([...timeline, modalData]);
    } else if (action === 'EDIT') {
      if (entity === 'CHECKLIST') setChecklists(checklists.map(i => i.id === modalData.id ? modalData : i));
      if (entity === 'TEAM') setTeam(team.map(i => i.id === modalData.id ? modalData : i));
      if (entity === 'TIMELINE') setTimeline(timeline.map(i => i.id === modalData.id ? modalData : i));
    }

    handlePostUpdate({ entity, action, data: modalData });
    setIsModalOpen(false);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === 'srcc2026') {
      setIsAdmin(true);
      setShowLogin(false);
      setPin('');
    } else {
      alert('PIN Tidak Valid!');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setActiveTab('dashboard'); // Kembali ke dashboard saat logout
  };

  // --- Komponen Tampilan (Render Functions) ---

  // 1. Komponen Kartu Header Gradasi (Merah, Abu-abu)
  const renderTopCards = () => {
    const completedTasks = checklists.filter(c => c.isDone).length;
    const progress = checklists.length === 0 ? 0 : Math.round((completedTasks / checklists.length) * 100);
    const filledTeam = team.filter(t => t.name && t.name.trim() !== '').length;
    
    // Mencari deadline dari tugas yang belum selesai
    const unfinishedTasks = checklists.filter(c => !c.isDone);
    const nearestDeadline = unfinishedTasks.length > 0 ? unfinishedTasks[0].deadline : (checklists.length > 0 ? 'Semua Selesai' : 'Belum ada tugas');

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Dark Red Gradient */}
        <div className="bg-gradient-to-r from-red-700 to-red-600 rounded-2xl p-6 text-white shadow-lg shadow-red-600/30 relative overflow-hidden h-40 flex flex-col justify-between">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
          <div>
            <h3 className="text-xl font-bold tracking-wide">Progress Tugas</h3>
            <p className="text-red-100 text-sm mt-1 opacity-90">Tenggat terdekat: {nearestDeadline}</p>
          </div>
          <div className="flex justify-between items-end">
            <button onClick={() => setActiveTab('checklist')} className="border border-white/40 bg-white/10 hover:bg-white/20 transition backdrop-blur-sm px-4 py-1.5 rounded-lg text-sm font-medium z-10">Detail</button>
            <span className="text-4xl font-black">{progress}%</span>
          </div>
        </div>

        {/* Card 2: Slate/Gray Gradient */}
        <div className="bg-gradient-to-r from-slate-600 to-slate-500 rounded-2xl p-6 text-white shadow-lg shadow-slate-500/30 relative overflow-hidden h-40 flex flex-col justify-between">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
          <div>
            <h3 className="text-xl font-bold tracking-wide">Tugas Selesai</h3>
            <p className="text-slate-100 text-sm mt-1 opacity-90">Item yang telah diselesaikan</p>
          </div>
          <div className="flex justify-between items-end">
            <button onClick={() => setActiveTab('checklist')} className="border border-white/40 bg-white/10 hover:bg-white/20 transition backdrop-blur-sm px-4 py-1.5 rounded-lg text-sm font-medium z-10">{isAdmin ? 'Atur' : 'Lihat'}</button>
            <span className="text-4xl font-black">{completedTasks} <span className="text-xl font-normal opacity-80">/{checklists.length}</span></span>
          </div>
        </div>

        {/* Card 3: Soft Red/Rose Gradient */}
        <div className="bg-gradient-to-r from-rose-500 to-red-500 rounded-2xl p-6 text-white shadow-lg shadow-rose-500/30 relative overflow-hidden h-40 flex flex-col justify-between">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white opacity-20 rounded-full blur-2xl"></div>
          <div>
            <h3 className="text-xl font-bold tracking-wide">Tim Panitia</h3>
            <p className="text-rose-100 text-sm mt-1 opacity-90">Personel yang telah terisi</p>
          </div>
          <div className="flex justify-between items-end">
             <button onClick={() => setActiveTab('team')} className="border border-white/40 bg-white/10 hover:bg-white/20 transition backdrop-blur-sm px-4 py-1.5 rounded-lg text-sm font-medium z-10">Lihat</button>
            <span className="text-4xl font-black">{filledTeam} <span className="text-xl font-normal opacity-80">Orang</span></span>
          </div>
        </div>
      </div>
    );
  };

  // Struktur Box Putih Utama
  const ContentWrapper = ({ title, children, actionButton, showTabs = true }) => (
    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 min-h-[500px]">
      {/* Fake Tabs Header */}
      <div className="flex px-6 pt-4 border-b border-slate-100">
        <div className="relative px-6 py-3 cursor-pointer">
          <span className="font-bold text-slate-800 relative z-10">{title}</span>
          <div className="absolute inset-0 bg-slate-50 rounded-t-xl -z-0 border-t border-l border-r border-slate-100"></div>
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 z-20"></div>
        </div>
        {showTabs && (
          <>
            <div className="px-6 py-3 font-medium text-slate-400 hover:text-slate-600 cursor-pointer hidden sm:block">Sedang Berjalan</div>
            <div className="px-6 py-3 font-medium text-slate-400 hover:text-slate-600 cursor-pointer hidden sm:block">Telah Selesai</div>
          </>
        )}
      </div>
      
      <div className="p-6 md:p-8">
        {/* Action Bar (Search & Release Button) */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <div className="flex items-center w-full sm:w-auto space-x-4">
             <div className="flex items-center text-sm font-medium text-slate-600 w-full sm:w-auto">
                <span className="mr-3 whitespace-nowrap hidden sm:block">Pencarian</span>
                <input type="text" placeholder="Masukkan kata kunci..." className="border border-slate-200 rounded-lg px-4 py-2 w-full sm:w-64 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm" />
             </div>
             <button className="hidden md:block border border-red-500 text-red-600 hover:bg-red-50 px-6 py-2 rounded-lg font-medium text-sm transition-colors">Cari</button>
          </div>
          {isAdmin && actionButton && (
            <button onClick={actionButton.onClick} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex items-center justify-center shadow-md shadow-red-600/20 font-medium text-sm transition-colors">
              <Plus className="w-4 h-4 mr-2" /> {actionButton.label}
            </button>
          )}
        </div>

        {/* Content Body */}
        {children}
      </div>
    </div>
  );

  const renderDashboard = () => {
    const completedTasks = checklists.filter(c => c.isDone);
    const filledTeam = team.filter(t => t.name && t.name.trim() !== '');

    return (
      <div className="animate-in fade-in duration-500">
        {renderTopCards()}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Tugas Baru Selesai</h3>
             </div>
             <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                {completedTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center p-3 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white mr-4 shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{task.task}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">PIC: {task.pic}</p>
                    </div>
                  </div>
                ))}
                {completedTasks.length === 0 && <p className="text-slate-400 text-sm text-center py-8">Belum ada data.</p>}
             </div>
          </div>

          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Personel Terisi</h3>
             </div>
             <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                {filledTeam.slice(0, 5).map(member => (
                  <div key={member.id} className="flex items-center p-3 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white mr-4 shadow-sm">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 text-sm">{member.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{member.role}</p>
                    </div>
                    {member.phone && (
                      <a href={`https://wa.me/${String(member.phone).replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="text-green-600 bg-green-50 p-2 rounded-lg hover:bg-green-100 transition">
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
                 {filledTeam.length === 0 && <p className="text-slate-400 text-sm text-center py-8">Belum ada data.</p>}
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderChecklist = () => (
    <div className="animate-in fade-in duration-500">
      {renderTopCards()}
      {!isAdmin && (
        <button onClick={() => setActiveTab('dashboard')} className="mb-4 flex items-center text-slate-500 hover:text-red-600 font-semibold transition-colors">
          <ChevronLeft className="w-5 h-5 mr-1" /> Kembali ke Dashboard
        </button>
      )}
      <ContentWrapper title="Master Checklist" actionButton={{ label: "Tambah Tugas", onClick: () => openModal('CHECKLIST', 'ADD') }}>
        <div className="space-y-4">
          {checklists.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border border-slate-100 rounded-2xl hover:shadow-md transition-shadow bg-white gap-4">
              <div className="flex items-center flex-1 space-x-4">
                <button onClick={() => toggleChecklist(item.id)} className={`transition-colors ${!isAdmin && 'cursor-default'} ${item.isDone ? 'text-red-600' : (isAdmin ? 'text-slate-300 hover:text-red-400' : 'text-slate-300')}`}>
                  {item.isDone ? <CheckCircle2 className="w-8 h-8" /> : <Circle className="w-8 h-8" />}
                </button>
                {/* Visual Graphic Block */}
                <div className={`hidden md:flex w-24 h-16 rounded-xl items-center justify-center text-white font-bold text-xs shadow-sm ${item.isDone ? 'bg-gradient-to-br from-slate-400 to-slate-500' : 'bg-gradient-to-br from-red-600 to-rose-500'}`}>
                   {String(item.category || '').substring(0, 8)}..
                </div>
                <div>
                  <h3 className={`font-bold text-slate-800 text-lg ${item.isDone ? 'line-through text-slate-400' : ''}`}>{item.task}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                     <span className="font-medium mr-3">PIC: {item.pic}</span>
                     Tenggat: {item.deadline}
                  </p>
                </div>
              </div>
              
              {isAdmin && (
                <div className="flex space-x-3 w-full sm:w-auto pl-12 sm:pl-0">
                  <button onClick={() => openModal('CHECKLIST', 'EDIT', item)} className="flex-1 sm:flex-none border border-slate-200 text-slate-600 hover:border-slate-800 hover:text-slate-900 px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                    Ubah
                  </button>
                  <button onClick={() => handleDeleteClick(item.id, 'CHECKLIST')} className="flex-1 sm:flex-none border border-red-200 text-red-500 hover:border-red-600 hover:text-red-600 px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                    Hapus
                  </button>
                </div>
              )}
            </div>
          ))}
          {checklists.length === 0 && <div className="text-center py-10 text-slate-400">Belum ada tugas terdaftar.</div>}
        </div>
      </ContentWrapper>
    </div>
  );

  const renderTeam = () => (
    <div className="animate-in fade-in duration-500">
      {renderTopCards()}
      {!isAdmin && (
        <button onClick={() => setActiveTab('dashboard')} className="mb-4 flex items-center text-slate-500 hover:text-red-600 font-semibold transition-colors">
          <ChevronLeft className="w-5 h-5 mr-1" /> Kembali ke Dashboard
        </button>
      )}
      <ContentWrapper title="Struktur Tim" showTabs={false} actionButton={{ label: "Tambah Personel", onClick: () => openModal('TEAM', 'ADD') }}>
        <div className="space-y-4">
          {team.map((member) => (
            <div key={member.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border border-slate-100 rounded-2xl hover:shadow-md transition-shadow bg-white gap-4">
              <div className="flex items-center flex-1 space-x-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 flex items-center justify-center shadow-sm">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{member.role}</h3>
                  <p className={`text-sm mt-1 ${member.name ? 'text-slate-600' : 'text-slate-400 italic'}`}>
                    {member.name || 'Belum ditugaskan'}
                  </p>
                  {member.phone && <p className="text-xs text-slate-400 mt-1">{String(member.phone)}</p>}
                </div>
              </div>
              
              {isAdmin && (
                <div className="flex space-x-3 w-full sm:w-auto pl-20 sm:pl-0">
                  <button onClick={() => openModal('TEAM', 'EDIT', member)} className="flex-1 sm:flex-none border border-slate-200 text-slate-600 hover:border-slate-800 hover:text-slate-900 px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                    Ubah
                  </button>
                  <button onClick={() => handleDeleteClick(member.id, 'TEAM')} className="flex-1 sm:flex-none border border-red-200 text-red-500 hover:border-red-600 hover:text-red-600 px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                    Hapus
                  </button>
                </div>
              )}
            </div>
          ))}
          {team.length === 0 && <div className="text-center py-10 text-slate-400">Belum ada panitia terdaftar.</div>}
        </div>
      </ContentWrapper>
    </div>
  );

  const renderTimeline = () => (
    <div className="animate-in fade-in duration-500">
      {renderTopCards()}
      {!isAdmin && (
        <button onClick={() => setActiveTab('dashboard')} className="mb-4 flex items-center text-slate-500 hover:text-red-600 font-semibold transition-colors">
          <ChevronLeft className="w-5 h-5 mr-1" /> Kembali ke Dashboard
        </button>
      )}
      <ContentWrapper title="Jadwal Acara" showTabs={false} actionButton={{ label: "Tambah Agenda", onClick: () => openModal('TIMELINE', 'ADD') }}>
        <div className="space-y-4">
          {timeline.map((event) => (
             <div key={event.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border border-slate-100 rounded-2xl hover:shadow-md transition-shadow bg-white gap-4">
               <div className="flex items-center flex-1 space-x-5">
                 <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-rose-500 flex items-center justify-center text-white shadow-sm">
                   <Calendar className="w-6 h-6" />
                 </div>
                 <div>
                   <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md">{event.date}</span>
                   <h3 className="font-bold text-slate-800 text-lg mt-2">{event.title}</h3>
                   <p className="text-sm text-slate-500 mt-1">{event.desc}</p>
                 </div>
               </div>
               
               {isAdmin && (
                 <div className="flex space-x-3 w-full sm:w-auto pl-20 sm:pl-0">
                   <button onClick={() => openModal('TIMELINE', 'EDIT', event)} className="flex-1 sm:flex-none border border-slate-200 text-slate-600 hover:border-slate-800 hover:text-slate-900 px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                     Ubah
                   </button>
                   <button onClick={() => handleDeleteClick(event.id, 'TIMELINE')} className="flex-1 sm:flex-none border border-red-200 text-red-500 hover:border-red-600 hover:text-red-600 px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                     Hapus
                   </button>
                 </div>
               )}
             </div>
          ))}
          {timeline.length === 0 && <div className="text-center py-10 text-slate-400">Belum ada agenda terdaftar.</div>}
        </div>
      </ContentWrapper>
    </div>
  );

  // --- Modals ---
  const renderModal = () => {
    if (!isModalOpen) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
          <div className="px-8 py-6 flex justify-between items-center border-b border-slate-100">
            <h3 className="font-bold text-xl text-slate-800">
              {modalType.action === 'ADD' ? 'Tambah ' : 'Ubah '} Data
            </h3>
            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleModalSave} className="p-8 space-y-5">
            
            {modalType.entity === 'CHECKLIST' && (
              <>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Kategori (Cth: Administrasi)</label>
                  <input required className="w-full border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl p-3 text-slate-800 transition-all outline-none" value={modalData.category || ''} onChange={(e) => setModalData({...modalData, category: e.target.value})} /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Nama Tugas</label>
                  <input required className="w-full border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl p-3 text-slate-800 transition-all outline-none" value={modalData.task || ''} onChange={(e) => setModalData({...modalData, task: e.target.value})} /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Penanggung Jawab (PIC)</label>
                  <input required className="w-full border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl p-3 text-slate-800 transition-all outline-none" value={modalData.pic || ''} onChange={(e) => setModalData({...modalData, pic: e.target.value})} /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Tenggat Waktu / Deadline</label>
                  <input required className="w-full border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl p-3 text-slate-800 transition-all outline-none" value={modalData.deadline || ''} onChange={(e) => setModalData({...modalData, deadline: e.target.value})} /></div>
              </>
            )}

            {modalType.entity === 'TEAM' && (
              <>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Posisi / Peran</label>
                  <input required className="w-full border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl p-3 text-slate-800 transition-all outline-none" value={modalData.role || ''} onChange={(e) => setModalData({...modalData, role: e.target.value})} /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Nama Lengkap</label>
                  <input className="w-full border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl p-3 text-slate-800 transition-all outline-none" value={modalData.name || ''} onChange={(e) => setModalData({...modalData, name: e.target.value})} /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Nomor WhatsApp</label>
                  <input type="tel" className="w-full border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl p-3 text-slate-800 transition-all outline-none" value={modalData.phone || ''} onChange={(e) => setModalData({...modalData, phone: e.target.value})} /></div>
              </>
            )}

            {modalType.entity === 'TIMELINE' && (
              <>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal / Waktu</label>
                  <input required className="w-full border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl p-3 text-slate-800 transition-all outline-none" value={modalData.date || ''} onChange={(e) => setModalData({...modalData, date: e.target.value})} /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Judul Agenda</label>
                  <input required className="w-full border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl p-3 text-slate-800 transition-all outline-none" value={modalData.title || ''} onChange={(e) => setModalData({...modalData, title: e.target.value})} /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Deskripsi</label>
                  <textarea rows="3" className="w-full border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl p-3 text-slate-800 transition-all outline-none resize-none" value={modalData.desc || ''} onChange={(e) => setModalData({...modalData, desc: e.target.value})}></textarea></div>
              </>
            )}

            <div className="pt-6 flex justify-end space-x-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-semibold transition-colors">Batal</button>
              <button type="submit" className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-md shadow-red-600/30 transition-all">Simpan Data</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderConfirmDelete = () => {
    if (!confirmDelete.isOpen) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-8 border border-slate-100 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
             <AlertTriangle className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Hapus Data?</h3>
          <p className="text-slate-500 font-medium mb-8 text-sm">Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan.</p>
          <div className="flex space-x-3 justify-center">
            <button onClick={() => setConfirmDelete({ isOpen: false, id: null, entity: '' })} className="px-6 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold w-full transition-colors">Batal</button>
            <button onClick={confirmDeleteAction} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold w-full shadow-md shadow-red-600/30 transition-all">Ya, Hapus</button>
          </div>
        </div>
      </div>
    );
  };

  const renderLoginModal = () => {
    if (!showLogin) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
          <div className="p-8">
            <div className="flex justify-end mb-2">
              <button onClick={() => setShowLogin(false)} className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-600/30">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Akses Sistem</h3>
              <p className="text-slate-500 font-medium mt-1 text-sm">Masukkan PIN untuk mengelola data</p>
            </div>
            <form onSubmit={handleLogin}>
              <div className="mb-6">
                <input 
                  type="password" 
                  autoFocus
                  className="w-full border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-2xl p-4 text-slate-800 font-mono tracking-[0.5em] text-center text-xl transition-all outline-none" 
                  value={pin} 
                  onChange={(e) => setPin(e.target.value)} 
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold shadow-lg shadow-red-600/30 transition-all">Otorisasi Akses</button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // Hitung tugas yang belum selesai untuk notifikasi
  const unfinishedTasks = checklists.filter(c => !c.isDone);

  // --- Main Layout ---
  return (
    // Background utama abu-abu kebiruan terang
    <div className="min-h-screen flex bg-[#f4f7fb] text-slate-800 font-sans selection:bg-red-200">
      
      {/* Sidebar - Hanya ditampilkan untuk Admin */}
      {isAdmin && (
        <>
          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div className="md:hidden fixed inset-0 bg-slate-900/50 z-40" onClick={() => setIsSidebarOpen(false)}></div>
          )}
          
          <div className={`fixed md:static inset-y-0 left-0 w-[260px] bg-slate-900 text-slate-300 z-50 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl md:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            {/* Logo Area */}
            <div className="h-20 flex items-center px-6 pt-4">
              <div className="bg-red-600 text-white font-black text-2xl italic px-4 py-1.5 rounded-xl tracking-wider shadow-lg shadow-red-600/20">
                SRCC
              </div>
            </div>
            
            {/* Navigation Menu */}
            <nav className="flex-1 mt-8 space-y-1 overflow-y-auto custom-scrollbar-dark">
              {[
                { id: 'dashboard', icon: LayoutDashboard, label: 'Ringkasan Dashboard' },
                { id: 'checklist', icon: CheckCircle2, label: 'Master Checklist' },
                { id: 'team', icon: Users, label: 'Struktur Tim' },
                { id: 'timeline', icon: Calendar, label: 'Jadwal Acara' },
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }} 
                  className={`w-[90%] flex items-center px-6 py-3.5 rounded-r-full transition-all font-medium text-sm group
                    ${activeTab === tab.id 
                      ? 'bg-red-600 text-white shadow-[0_4px_20px_rgba(220,38,38,0.3)]' 
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                    }`}
                >
                  <tab.icon className={`w-5 h-5 mr-4 transition-colors ${activeTab === tab.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} /> 
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Logout Button di bawah */}
            <div className="p-4 mb-4">
              <button onClick={handleLogout} className="w-[90%] flex items-center px-6 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-r-full transition-colors font-medium text-sm">
                <LogOut className="w-5 h-5 mr-4 text-slate-500" /> Keluar Akun
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Minimalist Top Header */}
        <header className="h-20 px-6 sm:px-10 flex justify-between items-center bg-transparent z-30">
          <div className="flex items-center">
            {isAdmin && (
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden mr-4 text-slate-600 hover:text-slate-900">
                <Menu className="w-6 h-6" />
              </button>
            )}
            <div onClick={() => setActiveTab('dashboard')} className={`${isAdmin ? 'hidden md:block' : 'block'} cursor-pointer hover:scale-105 transition-transform bg-red-600 text-white font-black text-xl italic px-4 py-1.5 rounded-xl tracking-wider shadow-lg shadow-red-600/20`}>
              SRCC
            </div>
          </div>
          
          {/* Kanan Header: Status & Profil */}
          <div className="flex items-center space-x-4 sm:space-x-6">
             <div className="hidden sm:flex items-center bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                <div className={`w-2 h-2 rounded-full mr-2 ${syncStatus === 'Terhubung' ? 'bg-green-500' : syncStatus === 'Error' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`}></div>
                <span className="text-xs font-semibold text-slate-500">{syncStatus}</span>
             </div>
             
             <div className="flex items-center space-x-3">
                <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100 transition">
                   <Search className="w-4 h-4" />
                </button>
                
                {/* Wrapper Notifikasi Lonceng */}
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100 transition relative"
                  >
                     <Bell className="w-4 h-4" />
                     {unfinishedTasks.length > 0 && (
                       <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full border-2 border-white"></span>
                     )}
                  </button>

                  {/* Dropdown Popup Notifikasi */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                        <h4 className="font-bold text-slate-800 text-sm">Tugas Berjalan</h4>
                        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{unfinishedTasks.length}</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {unfinishedTasks.length > 0 ? (
                          unfinishedTasks.map(task => (
                            <div key={task.id} className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                              <p className="text-sm font-semibold text-slate-800 truncate">{task.task}</p>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-xs text-slate-500">PIC: {task.pic}</span>
                                <span className="text-xs font-medium text-red-500">{task.deadline}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-center text-slate-500 text-sm">
                            Tidak ada tugas yang sedang berjalan.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {!isAdmin ? (
                  <button onClick={() => setShowLogin(true)} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold flex items-center transition shadow-md shadow-red-600/20 ml-2">
                    <Lock className="w-4 h-4 mr-2" /> Login Admin
                  </button>
                ) : (
                  <div className="flex items-center space-x-3 ml-2 pl-4 border-l border-slate-200">
                     <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Admin" className="w-full h-full object-cover" />
                     </div>
                     <span className="font-bold text-slate-700 text-sm hidden sm:block">Admin Pusat</span>
                  </div>
                )}
             </div>
          </div>
        </header>

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-10 pb-12 custom-scrollbar">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'checklist' && renderChecklist()}
            {activeTab === 'team' && renderTeam()}
            {activeTab === 'timeline' && renderTimeline()}
          </div>
        </main>
      </div>

      {/* Modals */}
      {renderModal()}
      {renderConfirmDelete()}
      {renderLoginModal()}

      {/* Inline Styles for Custom Scrollbars */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar-dark::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb { background-color: #334155; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default App;