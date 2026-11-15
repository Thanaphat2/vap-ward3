/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Cloud,
  CloudOff,
  Plus,
  RefreshCcw,
  ShieldAlert,
  User,
  Users
} from 'lucide-react';
import GuideScreen from './components/GuideScreen';
import { AddPatientModal, CloudModal, DeleteConfirmModal, NurseModal } from './components/Modals';
import PatientCard from './components/PatientCard';
import PatientDetail from './components/PatientDetail';
import { DEFAULT_GOOGLE_SHEET_URL, DEFAULT_NURSE_NAME, SHIFT_BY_LABEL, STORAGE_KEYS } from './constants';
import { useLocalStorageState } from './hooks/useLocalStorageState';
import { usePatients } from './hooks/usePatients';
import type { Assessor, NewPatientInput, Shift, ShiftLabel } from './types';
import { getRiskTier } from './utils';

type Tab = 'home' | 'beds' | 'guide';
type BedFilter = 'all' | 'vent' | 'high_risk';

export default function App() {
  const [currentTab, setCurrentTab] = useState<Tab>('home');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [bedFilter, setBedFilter] = useState<BedFilter>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showNurseModal, setShowNurseModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ผู้ประเมิน / เวร / URL ของ Sheets จำไว้ใน localStorage
  const [activeShift, setActiveShift] = useLocalStorageState<ShiftLabel>(
    STORAGE_KEYS.shift,
    'เวรเช้า',
    v => v in SHIFT_BY_LABEL
  );
  const [nurseName, setNurseName] = useLocalStorageState<string>(STORAGE_KEYS.nurse, DEFAULT_NURSE_NAME);
  const [sheetUrl, setSheetUrl] = useLocalStorageState<string>(STORAGE_KEYS.sheetUrl, DEFAULT_GOOGLE_SHEET_URL);

  const [activeChecklistShift, setActiveChecklistShift] = useState<Shift>(SHIFT_BY_LABEL[activeShift]);
  useEffect(() => {
    setActiveChecklistShift(SHIFT_BY_LABEL[activeShift]);
  }, [activeShift]);

  const {
    patients,
    status,
    refresh,
    toggleChecklistItem,
    toggleWeaningItem,
    setWeaningNote,
    addPatient,
    removePatient
  } = usePatients(sheetUrl);
  const isSyncing = status.syncing;
  const isSheetConnected = status.connected;

  const assessor = useMemo<Assessor>(() => ({ name: nurseName, shiftLabel: activeShift }), [nurseName, activeShift]);

  const selectedPatient = useMemo(
    () => patients.find(p => p.id === selectedPatientId),
    [patients, selectedPatientId]
  );

  // ผู้ป่วยที่เปิดอยู่ถูกลบ (จากเครื่องอื่น) → กลับหน้ารายการ แทนที่จะเหลือหน้าจอว่าง
  useEffect(() => {
    if (selectedPatientId && !selectedPatient) setSelectedPatientId(null);
  }, [selectedPatientId, selectedPatient]);

  const { highRiskCount, filteredPatients } = useMemo(() => {
    const highRisk = patients.filter(p => getRiskTier(p.progresses?.[activeChecklistShift] ?? 0).isHighRisk);
    return {
      highRiskCount: highRisk.length,
      filteredPatients: bedFilter === 'high_risk' ? highRisk : patients
    };
  }, [patients, activeChecklistShift, bedFilter]);
  const totalCount = patients.length;
  const ventCount = totalCount;

  const handleAddPatient = useCallback(
    (input: NewPatientInput) => {
      addPatient(input, assessor);
      setShowAddModal(false);
    },
    [addPatient, assessor]
  );

  const handleDeletePatient = useCallback(
    (id: string) => {
      removePatient(id);
      setDeleteConfirmId(null);
      setSelectedPatientId(prev => (prev === id ? null : prev));
    },
    [removePatient]
  );

  const handleSaveSheetUrl = useCallback(
    (url: string) => {
      const next = url.trim();
      setShowCloudModal(false);
      if (next === sheetUrl) void refresh(); // URL เดิม → แค่ซิงค์ใหม่
      else setSheetUrl(next); // URL ใหม่ → usePatients จะโหลดเองอัตโนมัติ
    },
    [sheetUrl, setSheetUrl, refresh]
  );

  return (
    <div className="flex justify-center items-center min-h-dvh bg-slate-300 p-0 sm:py-6 sm:px-4 font-sans">
      {/* Mobile App Container */}
      <div className="w-full sm:max-w-[430px] h-dvh sm:h-[880px] bg-[#F0FDFA] shadow-2xl sm:rounded-[40px] flex flex-col overflow-hidden relative border border-slate-300">

        {/* Top Header */}
        <header className="bg-teal-700 text-white px-5 pt-3 pb-2.5 flex flex-col gap-2 shadow-md flex-shrink-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-600 border border-teal-500 flex items-center justify-center shadow-inner">
                <Activity className="w-5 h-5 text-teal-100 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-bold font-prompt tracking-wide">VAP Care Smart 2.0</h1>
                  <span className="text-[10px] bg-teal-800 text-teal-200 px-1.5 py-0.5 rounded font-semibold">อญ.3</span>
                </div>
              </div>
            </div>

            {/* Google Sheets Sync Status & Refresh Button */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => refresh()}
                disabled={isSyncing}
                className="p-1 rounded-full bg-teal-800 hover:bg-teal-600 text-teal-100 transition-colors"
                title="รีเฟรชข้อมูลจาก Google Sheets"
                aria-label="รีเฟรชข้อมูลจาก Google Sheets"
              >
                <RefreshCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={() => setShowCloudModal(true)}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-prompt font-semibold transition-all shadow-sm ${
                  isSheetConnected 
                    ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white border border-emerald-400' 
                    : 'bg-amber-500/90 hover:bg-amber-500 text-white border border-amber-300'
                }`}
                title="ตั้งค่า Google Sheets"
              >
                {isSheetConnected ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
                <span>{isSheetConnected ? 'Sheets' : 'Local'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Nurse Assessor & Shift Bar */}
          <div 
            onClick={() => setShowNurseModal(true)}
            className="bg-teal-800/90 hover:bg-teal-800 border border-teal-600/60 rounded-xl px-3 py-1.5 flex items-center justify-between cursor-pointer transition-colors shadow-inner"
            title="คลิกเพื่อเปลี่ยนชื่อพยาบาลหรือเวร"
          >
            <div className="flex items-center gap-2 text-xs font-sarabun text-teal-100 truncate">
              <User className="w-3.5 h-3.5 text-teal-300 flex-shrink-0" />
              <span className="truncate">ผู้ประเมิน: <strong className="text-white">{nurseName}</strong></span>
              <span className="text-teal-400">|</span>
              <span className="bg-teal-700 text-teal-100 px-1.5 py-0.2 rounded text-[11px] font-semibold">{activeShift}</span>
            </div>
            <div className="text-[10px] text-teal-300 underline flex-shrink-0 font-prompt">เปลี่ยน</div>
          </div>
        </header>

        {/* Main Body View */}
        <div className="flex-1 overflow-y-auto pb-24 pt-4 px-4 bg-[#F0FDFA]">

          {/* ================= 1. HOME SCREEN ================= */}
          {currentTab === 'home' && !selectedPatientId && (
            <div className="space-y-4 font-sarabun">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-teal-100 shadow-sm">
                  <div className="flex items-center justify-between text-teal-700 mb-2">
                    <span className="text-xs font-bold font-prompt">ผู้ป่วย Vent (อญ.3)</span>
                    <Users className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-2xl font-extrabold font-prompt text-slate-800">{totalCount} <span className="text-xs font-normal text-slate-500">ราย</span></div>
                  <div className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> หอผู้ป่วยหญิง 3
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-teal-100 shadow-sm">
                  <div className="flex items-center justify-between text-teal-700 mb-2">
                    <span className="text-xs font-bold font-prompt">เสี่ยงมาก (&lt;60%)</span>
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-2xl font-extrabold font-prompt text-rose-600">{highRiskCount} <span className="text-xs font-normal text-slate-500">ราย</span></div>
                  <div className="text-[11px] text-slate-500 mt-1">ต้องซ่อมเสริม/พัฒนา</div>
                </div>
              </div>

              {/* Clean 2-Card Menu layout */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-prompt mb-3 px-1">
                  เมนูด่วน (Smart Ward อญ.3 Menu)
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  
                  {/* Bed List */}
                  <button 
                    onClick={() => setCurrentTab('beds')}
                    className="bg-white p-4 rounded-2xl border border-teal-100 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-bold font-prompt text-slate-800">รายเตียง (Bed List - อญ.3)</div>
                        <div className="text-xs text-slate-500">ประเมิน WHAPO + S คำนวณความเสี่ยงอัตโนมัติ</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* WHAPOS Guide */}
                  <button 
                    onClick={() => setCurrentTab('guide')}
                    className="bg-white p-4 rounded-2xl border border-teal-100 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-bold font-prompt text-slate-800">คู่มือ/แนวทาง WHAPOS Reference</div>
                        <div className="text-xs text-slate-500">เกณฑ์การให้คะแนนและความเสี่ยงอัตโนมัติ</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>

                </div>
              </div>

            </div>
          )}

          {/* ================= 2. BED LIST SCREEN ================= */}
          {currentTab === 'beds' && !selectedPatientId && (
            <div className="space-y-4 font-sarabun">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold font-prompt text-slate-800">รายเตียง (อญ.3)</h2>
                  <p className="text-xs text-slate-500">หอผู้ป่วยอายุรกรรมหญิง 3 (ผู้ป่วยหญิงทั้งหมด)</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-prompt px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" /> เพิ่มผู้ป่วย
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button 
                  onClick={() => setBedFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-prompt transition-colors whitespace-nowrap ${
                    bedFilter === 'all' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-teal-100'
                  }`}
                >
                  ทั้งหมด ({totalCount})
                </button>
                <button 
                  onClick={() => setBedFilter('vent')}
                  className={`px-3 py-1.5 rounded-full text-xs font-prompt transition-colors whitespace-nowrap ${
                    bedFilter === 'vent' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-teal-100'
                  }`}
                >
                  ใช้เครื่องช่วยหายใจ ({ventCount})
                </button>
                <button 
                  onClick={() => setBedFilter('high_risk')}
                  className={`px-3 py-1.5 rounded-full text-xs font-prompt transition-colors whitespace-nowrap ${
                    bedFilter === 'high_risk' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-teal-100'
                  }`}
                >
                  เสี่ยงมาก (&lt;60%) ({highRiskCount})
                </button>
              </div>

              {/* Patient Cards List */}
              <div className="space-y-3">
                {filteredPatients.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs bg-white rounded-2xl border border-teal-100 p-6">
                    {isSyncing ? 'กำลังโหลดข้อมูลจาก Google Sheets...' : 'ยังไม่มีข้อมูลผู้ป่วยในขณะนี้ (สามารถกดปุ่ม "+ เพิ่มผู้ป่วย" ด้านบนได้ทันที)'}
                  </div>
                ) : (
                  filteredPatients.map(patient => (
                    <PatientCard
                      key={patient.id}
                      patient={patient}
                      shift={activeChecklistShift}
                      activeShift={activeShift}
                      onOpen={setSelectedPatientId}
                      onDelete={setDeleteConfirmId}
                    />
                  ))
                )}
              </div>

            </div>
          )}

          {/* ================= 3. PATIENT DETAIL & WHAPO + S ASSESSMENT SCREEN ================= */}
          {selectedPatient && (
            <PatientDetail
              key={selectedPatient.id}
              selectedPatient={selectedPatient}
              activeChecklistShift={activeChecklistShift}
              nurseName={nurseName}
              onShiftChange={setActiveChecklistShift}
              onBack={() => setSelectedPatientId(null)}
              onDelete={setDeleteConfirmId}
              updateItemStatus={(pid, shift, itemId, st) => toggleChecklistItem(pid, shift, itemId, st, assessor)}
              updateWeaningItemStatus={(pid, shift, itemId, st) => toggleWeaningItem(pid, shift, itemId, st, assessor)}
              updateWeaningItemNote={setWeaningNote}
            />
          )}

          {/* ================= 4. WHAPOS REFERENCE GUIDE SCREEN ================= */}
          {currentTab === 'guide' && !selectedPatientId && <GuideScreen />}

        </div>

        {/* ================= PERSISTENT BOTTOM NAVIGATION BAR (3 TABS) ================= */}
        <nav className="absolute bottom-0 inset-x-0 bg-white border-t border-teal-100 px-2 py-2 flex items-center justify-around shadow-lg z-30">
          <button 
            onClick={() => { setCurrentTab('home'); setSelectedPatientId(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-6 rounded-xl transition-colors ${
              currentTab === 'home' && !selectedPatientId ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-[10px] font-prompt">หน้าหลัก</span>
          </button>

          <button 
            onClick={() => { setCurrentTab('beds'); setSelectedPatientId(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-6 rounded-xl transition-colors ${
              currentTab === 'beds' ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-prompt">ผู้ป่วย</span>
          </button>

          <button 
            onClick={() => { setCurrentTab('guide'); setSelectedPatientId(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-6 rounded-xl transition-colors ${
              currentTab === 'guide' ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-prompt">คู่มือ</span>
          </button>
        </nav>

        {/* ================= MODALS ================= */}
        {showAddModal && <AddPatientModal onClose={() => setShowAddModal(false)} onSubmit={handleAddPatient} />}
        {showNurseModal && (
          <NurseModal
            nurseName={nurseName}
            onNurseNameChange={setNurseName}
            activeShift={activeShift}
            onShiftChange={setActiveShift}
            onClose={() => setShowNurseModal(false)}
          />
        )}
        {showCloudModal && (
          <CloudModal
            sheetUrl={sheetUrl}
            status={status}
            onSave={handleSaveSheetUrl}
            onClose={() => setShowCloudModal(false)}
          />
        )}
        {deleteConfirmId && (
          <DeleteConfirmModal
            onCancel={() => setDeleteConfirmId(null)}
            onConfirm={() => handleDeletePatient(deleteConfirmId)}
          />
        )}
      </div>
    </div>
  );
}
