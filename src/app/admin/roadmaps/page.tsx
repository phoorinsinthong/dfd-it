'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth/auth-context';
import {
  getChecklists,
  getChecklistTemplates,
  generateAnnualRoadmap,
  createAdhocChecklist,
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  updateMonthlyChecklist,
  deleteMonthlyChecklist,
  toggleChecklistItem,
  THAI_MONTH_NAMES,
} from '@/lib/services/roadmap-service';
import { Checklist, ChecklistTemplate, ChecklistItem } from '@/types/database';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldAlert,
  Check,
  X,
  FileCheck2,
  ListTodo,
  Pencil,
  Trash2,
} from 'lucide-react';

export default function AdminRoadmapsPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'checklists' | 'templates'>('checklists');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [scheduleScope, setScheduleScope] = useState<'all_year' | 'custom_range'>('all_year');
  const [customStartMonth, setCustomStartMonth] = useState(10); // Oct
  const [customEndMonth, setCustomEndMonth] = useState(12); // Dec
  const [customPeriodLabel, setCustomPeriodLabel] = useState('ต.ค. - ธ.ค.');

  const [isAdhocModalOpen, setIsAdhocModalOpen] = useState(false);
  const [adhocTitle, setAdhocTitle] = useState('');
  const [adhocMonth, setAdhocMonth] = useState(1);
  const [adhocItems, setAdhocItems] = useState<string[]>(['']);

  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateItems, setNewTemplateItems] = useState<string[]>(['']);

  // Edit Checklist State
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null);
  const [editChecklistTitle, setEditChecklistTitle] = useState('');
  const [editChecklistPeriod, setEditChecklistPeriod] = useState('');
  const [editChecklistItems, setEditChecklistItems] = useState<string[]>(['']);
  const [deletingChecklist, setDeletingChecklist] = useState<Checklist | null>(null);

  // Edit Template State
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [editTemplateTitle, setEditTemplateTitle] = useState('');
  const [editTemplateDesc, setEditTemplateDesc] = useState('');
  const [editTemplatePeriod, setEditTemplatePeriod] = useState('');
  const [editTemplateItems, setEditTemplateItems] = useState<string[]>(['']);
  const [deletingTemplate, setDeletingTemplate] = useState<ChecklistTemplate | null>(null);

  const [expandedChecklistId, setExpandedChecklistId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [fetchedChecklists, fetchedTemplates] = await Promise.all([
      getChecklists(selectedYear),
      getChecklistTemplates(),
    ]);

    setChecklists(fetchedChecklists);
    setTemplates(fetchedTemplates);
    if (fetchedTemplates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(fetchedTemplates[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  // Handle Toggle Task Completion
  const handleToggleTask = async (itemId: string) => {
    if (!user) return;
    const res = await toggleChecklistItem(itemId, user.name);
    if (res.success) {
      loadData();
    }
  };

  // Handle Generate Annual / Custom Period Plan
  const handleGenerateAnnualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) return;

    setSubmitting(true);
    const options = scheduleScope === 'custom_range'
      ? {
          startMonth: customStartMonth,
          endMonth: customEndMonth,
          periodLabel: customPeriodLabel || `${THAI_MONTH_NAMES[customStartMonth - 1]} - ${THAI_MONTH_NAMES[customEndMonth - 1]}`,
        }
      : undefined;

    const res = await generateAnnualRoadmap(selectedTemplateId, selectedYear, options);
    setSubmitting(false);

    if (res.success) {
      setIsGenerateModalOpen(false);
      const desc = scheduleScope === 'custom_range'
        ? `สร้างแผนงานประจำช่วง (${options?.periodLabel}) ปี ${selectedYear} เรียบร้อยแล้ว (${res.createdCount} รายการ)`
        : `สร้างแผนงานประจำปี ${selectedYear} ครบ 12 เดือนเรียบร้อยแล้ว (${res.createdCount} รายการ)`;
      setStatusMessage(desc);
      loadData();
    }
  };

  // Handle Ad-hoc Checklist Submit
  const handleAdhocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = adhocItems.map((i) => i.trim()).filter(Boolean);
    if (!adhocTitle.trim() || validItems.length === 0) return;

    setSubmitting(true);
    const res = await createAdhocChecklist({
      title: adhocTitle.trim(),
      year: selectedYear,
      targetMonth: adhocMonth,
      items: validItems,
    });
    setSubmitting(false);

    if (res.success) {
      setIsAdhocModalOpen(false);
      setAdhocTitle('');
      setAdhocItems(['']);
      setStatusMessage(`สร้างเช็คลิสต์เฉพาะกิจ "${res.data?.title}" เรียบร้อยแล้ว`);
      loadData();
    }
  };

  // Actor for audit logging
  const currentActor = user ? {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  } : undefined;

  // Handle Create Template Submit
  const handleCreateTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = newTemplateItems.map((i) => i.trim()).filter(Boolean);
    if (!newTemplateTitle.trim() || validItems.length === 0) return;

    setSubmitting(true);
    const res = await createChecklistTemplate({
      title: newTemplateTitle.trim(),
      description: newTemplateDesc.trim() || undefined,
      items: validItems,
      actor: currentActor,
    });
    setSubmitting(false);

    if (res.success) {
      setIsNewTemplateModalOpen(false);
      setNewTemplateTitle('');
      setNewTemplateDesc('');
      setNewTemplateItems(['']);
      setStatusMessage(`เพิ่มแม่แบบใหม่ "${res.data?.title}" สำเร็จ`);
      loadData();
    }
  };

  // Open Edit Checklist
  const handleOpenEditChecklist = (chk: Checklist) => {
    setEditingChecklist(chk);
    setEditChecklistTitle(chk.title);
    setEditChecklistPeriod(chk.period_label || '');
    setEditChecklistItems(chk.items.map((i) => i.task_name));
  };

  // Save Edit Checklist
  const handleSaveEditChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChecklist) return;

    const validItems = editChecklistItems.map((i) => i.trim()).filter(Boolean);
    if (!editChecklistTitle.trim() || validItems.length === 0) return;

    setSubmitting(true);
    const res = await updateMonthlyChecklist({
      checklistId: editingChecklist.id,
      title: editChecklistTitle.trim(),
      periodLabel: editChecklistPeriod.trim() || undefined,
      items: validItems,
      actor: currentActor,
    });
    setSubmitting(false);

    if (res.success) {
      setEditingChecklist(null);
      setStatusMessage(`แก้ไขรายการแผนงาน "${res.data?.title}" เรียบร้อยแล้ว`);
      loadData();
    }
  };

  // Delete Checklist
  const handleDeleteChecklist = async () => {
    if (!deletingChecklist) return;

    setSubmitting(true);
    const res = await deleteMonthlyChecklist(deletingChecklist.id, currentActor);
    setSubmitting(false);

    if (res.success) {
      setDeletingChecklist(null);
      setStatusMessage(`ลบรายการแผนงานเรียบร้อยแล้ว`);
      loadData();
    }
  };

  // Open Edit Template
  const handleOpenEditTemplate = (tpl: ChecklistTemplate) => {
    setEditingTemplate(tpl);
    setEditTemplateTitle(tpl.title);
    setEditTemplateDesc(tpl.description || '');
    setEditTemplatePeriod(tpl.period_label || '');
    setEditTemplateItems([...tpl.items]);
  };

  // Save Edit Template
  const handleSaveEditTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    const validItems = editTemplateItems.map((i) => i.trim()).filter(Boolean);
    if (!editTemplateTitle.trim() || validItems.length === 0) return;

    setSubmitting(true);
    const res = await updateChecklistTemplate({
      id: editingTemplate.id,
      title: editTemplateTitle.trim(),
      description: editTemplateDesc.trim() || undefined,
      periodLabel: editTemplatePeriod.trim() || undefined,
      items: validItems,
      actor: currentActor,
    });
    setSubmitting(false);

    if (res.success) {
      setEditingTemplate(null);
      setStatusMessage(`แก้ไขแม่แบบ "${res.data?.title}" สำเร็จ`);
      loadData();
    }
  };

  // Delete Template
  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return;

    setSubmitting(true);
    const res = await deleteChecklistTemplate(deletingTemplate.id, currentActor);
    setSubmitting(false);

    if (res.success) {
      setDeletingTemplate(null);
      setStatusMessage(`ลบแม่แบบแผนงานเรียบร้อยแล้ว`);
      loadData();
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar activeSection="roadmaps" />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 p-8 rounded-2xl max-w-md text-center">
            <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">ไม่มีสิทธิ์เข้าถึง (Access Denied)</h2>
            <p className="text-sm text-slate-400 mb-6">หน้านี้สำหรับเจ้าหน้าที่ฝ่ายไอที (IT Staff) เท่านั้น</p>
          </div>
        </div>
      </div>
    );
  }

  // Summary Metrics
  const totalChecklists = checklists.length;
  const completedCount = checklists.filter((c) => c.status === 'completed').length;
  const inProgressCount = checklists.filter((c) => c.status === 'in_progress').length;
  const averageProgress =
    totalChecklists === 0
      ? 0
      : Math.round(
          checklists.reduce((acc, c) => acc + (c.progress_percent || 0), 0) / totalChecklists
        );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar activeSection="roadmaps" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <ClipboardList className="w-7 h-7 text-blue-500" />
              แผนงานบำรุงรักษาเชิงป้องกัน (PM Roadmap & Checklist)
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              สร้างแผนงานประจำปีอัตโนมัติ 12 เดือน ติดตามการตรวจเช็ค Server/UPS/ระบบเครือข่าย และบันทึกผู้ปฏิบัติงานแบบตรวจสอบได้
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/25 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              สร้างแผน 12 เดือนจากแม่แบบ
            </button>
            <button
              onClick={() => setIsAdhocModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              สร้างเช็คลิสต์เฉพาะกิจ
            </button>
            <button
              onClick={() => setIsNewTemplateModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm border border-slate-800 transition flex items-center gap-1.5"
              title="จัดการแม่แบบมาตรฐาน"
            >
              <Layers className="w-4 h-4" />
              เพิ่มแม่แบบ
            </button>
          </div>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('checklists')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'checklists'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            แผนงานประจำปี / เช็คลิสต์ ({checklists.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            แม่แบบแผนงานมาตรฐาน ({templates.length})
          </button>
        </div>

        {/* TAB 1: CHECKLISTS & ROADMAPS */}
        {activeTab === 'checklists' && (
          <div className="space-y-6">
            {/* Year Selector & Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-medium">ปีของแผนงาน (Target Year)</span>
                <div className="flex items-center gap-2 mt-2">
                  {[2025, 2026, 2027].map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setSelectedYear(yr)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        selectedYear === yr
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-medium">ความคืบหน้ารวมทั้งปี</span>
                <div className="text-2xl font-bold text-white mt-1 flex items-baseline gap-2">
                  <span>{averageProgress}%</span>
                  <span className="text-xs font-normal text-slate-400">({completedCount}/{totalChecklists} แผน)</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${averageProgress}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-2xl">
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> แผนที่เสร็จสมบูรณ์ 100%
                </span>
                <div className="text-2xl font-bold text-emerald-300 mt-1">{completedCount}</div>
              </div>

              <div className="bg-blue-950/20 border border-blue-800/40 p-4 rounded-2xl">
                <span className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> แผนงานที่กำลังดำเนินการ
                </span>
                <div className="text-2xl font-bold text-blue-300 mt-1">{inProgressCount}</div>
              </div>
            </div>

            {/* 12-Month Timeline / Checklists Grid */}
            {loading ? (
              <div className="p-12 text-center text-slate-400">กำลังโหลดแผนงาน PM...</div>
            ) : checklists.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto">
                  <ListTodo className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">ยังไม่มีแผนงาน PM ในปี {selectedYear}</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    คลิกปุ่มด้านล่างเพื่อสร้างแผนบำรุงรักษาประจำปีครบ 12 เดือนทันทีจากแม่แบบมาตรฐาน
                  </p>
                </div>
                <button
                  onClick={() => setIsGenerateModalOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/30 transition inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  สร้างแผน 12 เดือนทันที
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-200">
                    รายการแผนบำรุงรักษา ปี {selectedYear} ({checklists.length} รายการ)
                  </span>
                  <span className="text-xs text-slate-400">คลิกที่การ์ดเพื่อดูและติ๊กรายการงาน</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {checklists.map((chk) => {
                    const isExpanded = expandedChecklistId === chk.id;
                    const completedItems = chk.items.filter((i) => i.is_completed).length;

                    return (
                      <div
                        key={chk.id}
                        className={`bg-slate-900/80 border rounded-2xl p-5 transition flex flex-col justify-between ${
                          chk.status === 'completed'
                            ? 'border-emerald-800/60 bg-emerald-950/10'
                            : chk.status === 'in_progress'
                            ? 'border-blue-800/60'
                            : 'border-slate-800'
                        }`}
                      >
                        <div>
                          {/* Top status */}
                          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                                {chk.target_month ? `${THAI_MONTH_NAMES[chk.target_month - 1]} ${chk.year}` : `Ad-hoc ${chk.year}`}
                              </span>
                              {chk.period_label && (
                                <span className="font-sans text-[10px] font-semibold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700/50">
                                  {chk.period_label}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  chk.status === 'completed'
                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                    : chk.status === 'in_progress'
                                    ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {chk.status === 'completed' && '✓ เสร็จสิ้น'}
                                {chk.status === 'in_progress' && 'กำลังดำเนินการ'}
                                {chk.status === 'pending' && 'รอดำเนินการ'}
                              </span>
                              <button
                                onClick={() => handleOpenEditChecklist(chk)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                title="แก้ไขแผนงาน"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingChecklist(chk)}
                                className="p-1.5 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 transition"
                                title="ลบแผนงาน"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h3 className="text-sm font-bold text-white mb-2 leading-snug">{chk.title}</h3>

                          {/* Progress Bar */}
                          <div className="space-y-1 mb-4">
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>ความคืบหน้า</span>
                              <span className="font-mono font-bold text-slate-200">
                                {completedItems}/{chk.items.length} ({chk.progress_percent}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  chk.progress_percent === 100
                                    ? 'bg-emerald-500'
                                    : chk.progress_percent && chk.progress_percent > 0
                                    ? 'bg-blue-500'
                                    : 'bg-slate-700'
                                }`}
                                style={{ width: `${chk.progress_percent}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Tasks List */}
                          <div className="space-y-2 pt-2 border-t border-slate-800/80">
                            {chk.items.slice(0, isExpanded ? undefined : 3).map((item) => (
                              <label
                                key={item.id}
                                className={`flex items-start gap-2.5 p-2 rounded-xl text-xs cursor-pointer transition ${
                                  item.is_completed
                                    ? 'bg-emerald-950/20 text-slate-300'
                                    : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={item.is_completed}
                                  onChange={() => handleToggleTask(item.id)}
                                  className="mt-0.5 rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-700"
                                />
                                <div className="flex-1">
                                  <span className={item.is_completed ? 'line-through text-slate-400' : 'text-slate-200'}>
                                    {item.task_name}
                                  </span>
                                  {item.is_completed && item.completed_by && (
                                    <span className="block text-[10px] text-emerald-400 mt-0.5">
                                      ✓ โดย: {item.completed_by} ({new Date(item.completed_at || '').toLocaleDateString('th-TH')})
                                    </span>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>

                          {chk.items.length > 3 && (
                            <button
                              onClick={() => setExpandedChecklistId(isExpanded ? null : chk.id)}
                              className="w-full mt-2 py-1 text-center text-[11px] text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 font-medium"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" /> ซ่อนรายการ
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" /> ดูอีก {chk.items.length - 3} รายการ...
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEMPLATES MANAGEMENT */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-400" />
                  แม่แบบแผนงาน PM ทั้งหมด ({templates.length} แม่แบบ)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  แม่แบบที่ใช้สำหรับสร้างแผนงานประจำปี หรือสร้างเช็คลิสต์ตรวจเช็คอุปกรณ์ประจำเดือน
                </p>
              </div>
              <button
                onClick={() => setIsNewTemplateModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 self-start sm:self-auto shadow-md shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                เพิ่มแม่แบบใหม่
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-950/60 text-blue-300 border border-blue-800/40">
                        {tpl.frequency === 'quarterly' ? 'รายไตรมาส (Quarterly)' : 'รายเดือน (Monthly)'}
                      </span>
                      {tpl.period_label && (
                        <span className="text-[11px] font-medium text-indigo-300 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-700/50">
                          {tpl.period_label}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          onClick={() => handleOpenEditTemplate(tpl)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="แก้ไขแม่แบบ"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingTemplate(tpl)}
                          className="p-1.5 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 transition"
                          title="ลบแม่แบบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1">{tpl.title}</h3>
                    {tpl.description && (
                      <p className="text-xs text-slate-400 mb-3">{tpl.description}</p>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <span className="text-[11px] text-slate-400 font-semibold block mb-1.5">
                        รายการข้อตรวจเช็ค ({tpl.items.length} ข้อ):
                      </span>
                      <ul className="space-y-1">
                        {tpl.items.map((item, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-blue-400 font-mono text-[10px]">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal: Generate Annual 12 Months */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                สร้างแผนงาน PM ประจำปี 12 เดือน
              </h3>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateAnnualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  เลือกแม่แบบมาตรฐาน (Checklist Template)
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.title} ({tpl.items.length} ข้อตรวจเช็ค)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ปีเป้าหมาย
                </label>
                <input
                  type="number"
                  disabled
                  value={selectedYear}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ช่วงเวลาที่จะดำเนินการ
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setScheduleScope('all_year')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                      scheduleScope === 'all_year'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ทั้งปี (12 เดือน)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleScope('custom_range')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                      scheduleScope === 'custom_range'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    กำหนดช่วงเดือน (เช่น ต.ค. - ธ.ค.)
                  </button>
                </div>
              </div>

              {scheduleScope === 'custom_range' && (
                <div className="space-y-3 p-3.5 bg-slate-800/60 border border-slate-700 rounded-xl">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        เดือนเริ่มต้น
                      </label>
                      <select
                        value={customStartMonth}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCustomStartMonth(val);
                          setCustomPeriodLabel(`${THAI_MONTH_NAMES[val - 1]} - ${THAI_MONTH_NAMES[customEndMonth - 1]}`);
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        {THAI_MONTH_NAMES.map((m, idx) => (
                          <option key={idx + 1} value={idx + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        เดือนสิ้นสุด
                      </label>
                      <select
                        value={customEndMonth}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCustomEndMonth(val);
                          setCustomPeriodLabel(`${THAI_MONTH_NAMES[customStartMonth - 1]} - ${THAI_MONTH_NAMES[val - 1]}`);
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        {THAI_MONTH_NAMES.map((m, idx) => (
                          <option key={idx + 1} value={idx + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      ป้ายกำกับช่วงเวลา (Period Tag)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ต.ค. - ธ.ค., ไตรมาส 4"
                      value={customPeriodLabel}
                      onChange={(e) => setCustomPeriodLabel(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs text-blue-300">
                ℹ️ {scheduleScope === 'custom_range'
                  ? `ระบบจะโคลนรายการงานทั้ง ${templates.find((t) => t.id === selectedTemplateId)?.items.length || 0} ข้อ ลงในเดือน ${THAI_MONTH_NAMES[customStartMonth - 1]} ถึง ${THAI_MONTH_NAMES[customEndMonth - 1]} ปี ${selectedYear}`
                  : `ระบบจะทำการโคลนรายการงานทั้ง ${templates.find((t) => t.id === selectedTemplateId)?.items.length || 0} ข้อ สำหรับทุกเดือน (ม.ค. - ธ.ค. ${selectedYear}) เป็น 12 แผนงานทันที`}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {submitting ? 'กำลังสร้าง...' : scheduleScope === 'custom_range' ? 'สร้างแผนประจำช่วงทันที' : 'สร้าง 12 เดือนทันที'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Ad-hoc Checklist */}
      {isAdhocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" />
                สร้างเช็คลิสต์เฉพาะกิจ (Ad-hoc Event)
              </h3>
              <button
                onClick={() => setIsAdhocModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdhocSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ชื่อเช็คลิสต์ / ชื่องาน <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ย้ายสำนักงานสาขาพญาไท, เซ็ตอัพเครื่องพนักงานใหม่ 20 เครื่อง"
                  value={adhocTitle}
                  onChange={(e) => setAdhocTitle(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  เดือนที่กำหนดดำเนินงาน
                </label>
                <select
                  value={adhocMonth}
                  onChange={(e) => setAdhocMonth(Number(e.target.value))}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {THAI_MONTH_NAMES.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  รายการงานตรวจเช็ค (Tasks) <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {adhocItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`ข้อที่ ${idx + 1}...`}
                        value={item}
                        onChange={(e) => {
                          const updated = [...adhocItems];
                          updated[idx] = e.target.value;
                          setAdhocItems(updated);
                        }}
                        className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {adhocItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setAdhocItems(adhocItems.filter((_, i) => i !== idx))}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setAdhocItems([...adhocItems, ''])}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มข้อตรวจเช็ค
                </button>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdhocModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกเช็คลิสต์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Template */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-500" />
                เพิ่มแม่แบบมาตรฐาน (Standard Template)
              </h3>
              <button
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ชื่อแม่แบบ <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น แผนตรวจเช็คระบบ Wi-Fi และ Firewall ประจำปี"
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  คำอธิบายวัตถุประสงค์
                </label>
                <input
                  type="text"
                  placeholder="ระบุข้อกำหนด หรือมาตรฐานที่ใช้อ้างอิง"
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  รายการตรวจเช็คมาตรฐาน (Template Tasks) <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {newTemplateItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`ข้อที่ ${idx + 1}...`}
                        value={item}
                        onChange={(e) => {
                          const updated = [...newTemplateItems];
                          updated[idx] = e.target.value;
                          setNewTemplateItems(updated);
                        }}
                        className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {newTemplateItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewTemplateItems(newTemplateItems.filter((_, i) => i !== idx))}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setNewTemplateItems([...newTemplateItems, ''])}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มข้อตรวจเช็ค
                </button>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกแม่แบบ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Checklist */}
      {editingChecklist && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-400" />
                แก้ไขแผนงาน PM
              </h3>
              <button
                onClick={() => setEditingChecklist(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditChecklist} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ชื่อแผนงาน <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editChecklistTitle}
                  onChange={(e) => setEditChecklistTitle(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ช่วงเวลา / ป้ายกำกับ (Period Label)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ต.ค. - ธ.ค., ไตรมาส 1"
                  value={editChecklistPeriod}
                  onChange={(e) => setEditChecklistPeriod(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  รายการข้อตรวจเช็ค (Checklist Tasks) <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editChecklistItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`ข้อที่ ${idx + 1}...`}
                        value={item}
                        onChange={(e) => {
                          const updated = [...editChecklistItems];
                          updated[idx] = e.target.value;
                          setEditChecklistItems(updated);
                        }}
                        className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {editChecklistItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditChecklistItems(editChecklistItems.filter((_, i) => i !== idx))
                          }
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setEditChecklistItems([...editChecklistItems, ''])}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มข้อตรวจเช็ค
                </button>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingChecklist(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Checklist Confirmation */}
      {deletingChecklist && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-950/50 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">ยืนยันการลบแผนงาน?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              คุณต้องการลบแผนงาน <strong className="text-white">{deletingChecklist.title}</strong> หรือไม่? การกระทำนี้ไม่สามารถเรียกคืนได้
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingChecklist(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteChecklist}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition shadow-md shadow-red-600/20"
              >
                {submitting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Template */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-400" />
                แก้ไขแม่แบบแผนงาน PM
              </h3>
              <button
                onClick={() => setEditingTemplate(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ชื่อแม่แบบ <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTemplateTitle}
                  onChange={(e) => setEditTemplateTitle(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  คำอธิบายวัตถุประสงค์
                </label>
                <input
                  type="text"
                  value={editTemplateDesc}
                  onChange={(e) => setEditTemplateDesc(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ช่วงเวลา / ป้ายกำกับ (Period Label)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ต.ค. - ธ.ค., ทุก 3 เดือน"
                  value={editTemplatePeriod}
                  onChange={(e) => setEditTemplatePeriod(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  รายการตรวจเช็คมาตรฐาน (Template Tasks) <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editTemplateItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`ข้อที่ ${idx + 1}...`}
                        value={item}
                        onChange={(e) => {
                          const updated = [...editTemplateItems];
                          updated[idx] = e.target.value;
                          setEditTemplateItems(updated);
                        }}
                        className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {editTemplateItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditTemplateItems(editTemplateItems.filter((_, i) => i !== idx))
                          }
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setEditTemplateItems([...editTemplateItems, ''])}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มข้อตรวจเช็ค
                </button>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขแม่แบบ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Template Confirmation */}
      {deletingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-950/50 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">ยืนยันการลบแม่แบบแผนงาน?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              คุณต้องการลบแม่แบบ <strong className="text-white">{deletingTemplate.title}</strong> หรือไม่? การลบนี้จะไม่กระทบกับแผนงานที่สร้างไปแล้วในปฏิทิน
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTemplate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteTemplate}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition shadow-md shadow-red-600/20"
              >
                {submitting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
