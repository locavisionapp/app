import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, Plus, X, Eye, Check, Clock, AlertTriangle,
  Search, Filter, Printer, CreditCard, Building2, User, ChevronRight
} from 'lucide-react';
import { subscribeToInvoices, updateInvoice, createInvoice, deleteInvoice, getClients, getRentals } from '../services/firestore';
import jsPDF from 'jspdf';

const STATUS_CONFIG = {
  brouillon: { label: 'Brouillon', color: 'text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-400', icon: Clock },
  envoyee: { label: 'Envoyée', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400', icon: FileText },
  payee: { label: 'Payée', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Check },
  en_retard: { label: 'En retard', color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle }
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);
};

const formatDate = (ts) => {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-FR');
};

const generatePDF = (invoice) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', 20, 25);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${invoice.invoiceNumber || invoice.id.slice(0, 8).toUpperCase()}`, pageWidth - 20, 20, { align: 'right' });
  doc.text(`Date: ${formatDate(invoice.createdAt)}`, pageWidth - 20, 30, { align: 'right' });

  // Reset color
  doc.setTextColor(30, 30, 30);

  // Emitter & Client
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DE', 20, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.companyName || 'LocaVision', 20, 63);
  doc.text(invoice.companyAddress || '', 20, 70);

  doc.setFont('helvetica', 'bold');
  doc.text('POUR', pageWidth / 2, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.clientName || 'Client', pageWidth / 2, 63);
  doc.text(invoice.clientEmail || '', pageWidth / 2, 70);

  // Divider
  doc.setDrawColor(200, 200, 220);
  doc.line(20, 80, pageWidth - 20, 80);

  // Table Header
  const tableY = 90;
  doc.setFillColor(245, 245, 255);
  doc.rect(20, tableY - 5, pageWidth - 40, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DESCRIPTION', 22, tableY + 3);
  doc.text('QTÉ', 120, tableY + 3, { align: 'right' });
  doc.text('P.U.', 150, tableY + 3, { align: 'right' });
  doc.text('TOTAL', pageWidth - 22, tableY + 3, { align: 'right' });

  // Items
  let y = tableY + 18;
  doc.setFont('helvetica', 'normal');
  const items = invoice.items || [{ description: `Location véhicule - Réf. ${invoice.rentalId?.slice(0, 6) || ''}`, qty: 1, unitPrice: invoice.amount }];
  items.forEach((item) => {
    doc.text(item.description || '', 22, y);
    doc.text(String(item.qty || 1), 120, y, { align: 'right' });
    doc.text(formatCurrency(item.unitPrice), 150, y, { align: 'right' });
    doc.text(formatCurrency((item.qty || 1) * (item.unitPrice || 0)), pageWidth - 22, y, { align: 'right' });
    y += 10;
  });

  // Total box
  y += 10;
  doc.setDrawColor(200, 200, 220);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;
  const total = invoice.amount || items.reduce((acc, i) => acc + (i.qty || 1) * (i.unitPrice || 0), 0);
  const tva = total * 0.20;
  const ht = total - tva;

  doc.setFont('helvetica', 'normal');
  doc.text('Sous-total HT :', 130, y);
  doc.text(formatCurrency(ht), pageWidth - 22, y, { align: 'right' });
  y += 8;
  doc.text('TVA (20%) :', 130, y);
  doc.text(formatCurrency(tva), pageWidth - 22, y, { align: 'right' });
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL TTC :', 130, y);
  doc.text(formatCurrency(total), pageWidth - 22, y, { align: 'right' });

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Merci pour votre confiance. Document généré par LocaVision.', pageWidth / 2, 280, { align: 'center' });

  doc.save(`Facture-${invoice.invoiceNumber || invoice.id.slice(0, 8)}.pdf`);
};

const InvoiceModal = ({ invoice, clients, rentals, onClose, onSave, companyId }) => {
  const [form, setForm] = useState({
    invoiceNumber: '',
    clientId: '',
    rentalId: '',
    amount: '',
    status: 'brouillon',
    dueDate: '',
    notes: '',
    ...invoice
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const client = clients.find(c => c.id === form.clientId);
    const rental = rentals.find(r => r.id === form.rentalId);
    onSave({
      ...form,
      amount: parseFloat(form.amount) || 0,
      clientName: client ? `${client.firstName} ${client.lastName}` : form.clientName,
      clientEmail: client?.email || '',
      rentalRef: rental?.id || '',
      companyId
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
            {invoice?.id ? 'Modifier la Facture' : 'Nouvelle Facture'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">N° Facture</label>
              <input value={form.invoiceNumber} onChange={e => setForm(p => ({ ...p, invoiceNumber: e.target.value }))}
                placeholder="FAC-2024-001"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Statut</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none">
                {Object.entries(STATUS_CONFIG).map(([key, v]) => (
                  <option key={key} value={key}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Client</label>
            <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none">
              <option value="">— Sélectionner un client —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Location associée</label>
            <select value={form.rentalId} onChange={e => {
              const r = rentals.find(r => r.id === e.target.value);
              setForm(p => ({ ...p, rentalId: e.target.value, amount: r?.totalPrice || p.amount }));
            }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none">
              <option value="">— Sélectionner une location —</option>
              {rentals.map(r => (
                <option key={r.id} value={r.id}>Réf. {r.id.slice(0, 8)} — {formatCurrency(r.totalPrice)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Montant TTC (€)</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="0.00" required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Date d'échéance</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2} placeholder="Informations complémentaires..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              Annuler
            </button>
            <button type="submit"
              className="flex-1 px-4 py-3 rounded-xl bg-primary-600 text-white text-sm font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20">
              Sauvegarder
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const Invoices = ({ companyId }) => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  useEffect(() => {
    const unsub = subscribeToInvoices({ companyId }, (data) => {
      setInvoices(data);
      setLoading(false);
    });
    const loadAux = async () => {
      const [c, r] = await Promise.all([
        getClients({ companyId }),
        getRentals({ companyId })
      ]);
      setClients(c);
      setRentals(r);
    };
    loadAux();
    return () => unsub();
  }, [companyId]);

  const handleSave = async (data) => {
    if (editingInvoice?.id) {
      await updateInvoice(editingInvoice.id, data);
    } else {
      await createInvoice(data);
    }
    setShowModal(false);
    setEditingInvoice(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cette facture ?')) {
      await deleteInvoice(id);
    }
  };

  const filtered = invoices.filter(inv => {
    const matchSearch = (inv.clientName || '').toLowerCase().includes(search.toLowerCase()) ||
      (inv.invoiceNumber || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalRevenue = invoices.filter(i => i.status === 'payee').reduce((acc, i) => acc + (i.amount || 0), 0);
  const pendingRevenue = invoices.filter(i => i.status === 'envoyee').reduce((acc, i) => acc + (i.amount || 0), 0);
  const overdueRevenue = invoices.filter(i => i.status === 'en_retard').reduce((acc, i) => acc + (i.amount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic uppercase text-slate-900 dark:text-white">
            Facturation
          </h1>
          <p className="text-slate-400 mt-1 text-sm">{invoices.length} facture{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setEditingInvoice(null); setShowModal(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20"
        >
          <Plus size={16} /> Nouvelle Facture
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Recettes perçues', value: formatCurrency(totalRevenue), color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'En attente', value: formatCurrency(pendingRevenue), color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'En retard', value: formatCurrency(overdueRevenue), color: 'from-rose-500 to-red-600', bg: 'bg-rose-50 dark:bg-rose-900/20' }
        ].map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`${card.bg} rounded-2xl p-5 border border-white/50 dark:border-white/5`}>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">{card.label}</p>
            <p className={`text-2xl font-black italic bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une facture..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none">
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-slate-400">
          <FileText size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-bold">Aucune facture trouvée</p>
          <p className="text-sm mt-1">Créez votre première facture pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((inv, i) => {
              const statusConf = STATUS_CONFIG[inv.status] || STATUS_CONFIG.brouillon;
              const StatusIcon = statusConf.icon;
              return (
                <motion.div key={inv.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900 dark:text-white text-sm truncate">
                        {inv.invoiceNumber || `FAC-${inv.id.slice(0, 6).toUpperCase()}`}
                      </p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${statusConf.color}`}>
                        <StatusIcon size={9} /> {statusConf.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{inv.clientName || '—'} · {formatDate(inv.createdAt)}{inv.dueDate ? ` · Échéance: ${inv.dueDate}` : ''}</p>
                  </div>
                  <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{formatCurrency(inv.amount)}</p>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => generatePDF(inv)}
                      className="p-2 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-600 transition-colors" title="Télécharger PDF">
                      <Download size={15} />
                    </button>
                    <button onClick={() => { setEditingInvoice(inv); setShowModal(true); }}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors" title="Modifier">
                      <ChevronRight size={15} />
                    </button>
                    <button onClick={() => handleDelete(inv.id)}
                      className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Supprimer">
                      <X size={15} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <InvoiceModal
            invoice={editingInvoice}
            clients={clients}
            rentals={rentals}
            companyId={companyId}
            onClose={() => { setShowModal(false); setEditingInvoice(null); }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Invoices;
