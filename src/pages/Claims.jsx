import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Plus, X, ChevronRight, Car, User, AlertTriangle,
  Wrench, CheckCircle, Clock, Search, FileText, Camera, DollarSign,
  ArrowRight
} from 'lucide-react';
import { subscribeToClaims, createClaim, updateClaim, deleteClaim, getVehicles, getClients } from '../services/firestore';

const STATUSES = [
  { key: 'a_traiter', label: 'À Traiter', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800', icon: AlertTriangle, dot: 'bg-rose-500' },
  { key: 'en_expertise', label: 'En Expertise', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', icon: Search, dot: 'bg-amber-500' },
  { key: 'en_reparation', label: 'En Réparation', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', icon: Wrench, dot: 'bg-blue-500' },
  { key: 'resolu', label: 'Résolu', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', icon: CheckCircle, dot: 'bg-emerald-500' }
];

const STATUS_NEXT = { a_traiter: 'en_expertise', en_expertise: 'en_reparation', en_reparation: 'resolu', resolu: null };

const formatDate = (ts) => {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-FR');
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);

const ClaimModal = ({ claim, vehicles, clients, onClose, onSave, companyId }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    vehicleId: '',
    clientId: '',
    severity: 'modere',
    estimatedCost: '',
    garageName: '',
    garageQuote: '',
    notes: '',
    ...claim
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const vehicle = vehicles.find(v => v.id === form.vehicleId);
    const client = clients.find(c => c.id === form.clientId);
    onSave({
      ...form,
      estimatedCost: parseFloat(form.estimatedCost) || 0,
      garageQuote: parseFloat(form.garageQuote) || 0,
      vehicleName: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})` : form.vehicleName,
      clientName: client ? `${client.firstName} ${client.lastName}` : form.clientName,
      companyId
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
            {claim?.id ? 'Modifier le Sinistre' : 'Déclarer un Sinistre'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Titre du sinistre *</label>
            <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="ex: Accrochage parking, bris de glace..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Véhicule</label>
              <select value={form.vehicleId} onChange={e => setForm(p => ({ ...p, vehicleId: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="">— Véhicule —</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.licensePlate})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Client impliqué</label>
              <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="">— Client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Gravité</label>
            <div className="grid grid-cols-3 gap-2">
              {[['leger', 'Léger', 'text-green-600'], ['modere', 'Modéré', 'text-amber-600'], ['grave', 'Grave', 'text-red-600']].map(([val, lbl, cls]) => (
                <button type="button" key={val} onClick={() => setForm(p => ({ ...p, severity: val }))}
                  className={`py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${form.severity === val ? `border-current ${cls} bg-current/10` : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3} placeholder="Détails du sinistre..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Coût estimé (€)</label>
              <input type="number" step="0.01" value={form.estimatedCost} onChange={e => setForm(p => ({ ...p, estimatedCost: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Devis Garage (€)</label>
              <input type="number" step="0.01" value={form.garageQuote} onChange={e => setForm(p => ({ ...p, garageQuote: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Garage / Réparateur</label>
            <input value={form.garageName} onChange={e => setForm(p => ({ ...p, garageName: e.target.value }))}
              placeholder="Nom du garage..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              Annuler
            </button>
            <button type="submit"
              className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white text-sm font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20">
              {claim?.id ? 'Sauvegarder' : 'Déclarer'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const ClaimCard = ({ claim, onEdit, onDelete, onAdvance }) => {
  const statusConf = STATUSES.find(s => s.key === claim.status) || STATUSES[0];
  const StatusIcon = statusConf.icon;
  const nextStatus = STATUS_NEXT[claim.status];
  const nextConf = STATUSES.find(s => s.key === nextStatus);

  const severityColors = { leger: 'text-green-600 bg-green-50 dark:bg-green-900/20', modere: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', grave: 'text-red-600 bg-red-50 dark:bg-red-900/20' };
  const severityLabels = { leger: 'Léger', modere: 'Modéré', grave: 'Grave' };

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 hover:shadow-xl transition-all group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1">
          <h3 className="font-black text-slate-900 dark:text-white text-sm leading-tight">{claim.title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{formatDate(claim.createdAt)}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${statusConf.color}`}>
          <StatusIcon size={9} /> {statusConf.label}
        </span>
      </div>

      {claim.vehicleName && (
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Car size={12} /> {claim.vehicleName}
        </div>
      )}
      {claim.clientName && (
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <User size={12} /> {claim.clientName}
        </div>
      )}
      {claim.severity && (
        <span className={`inline-flex text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 mb-2 ${severityColors[claim.severity]}`}>
          {severityLabels[claim.severity]}
        </span>
      )}

      {(claim.estimatedCost > 0 || claim.garageQuote > 0) && (
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {claim.estimatedCost > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Coût estimé</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(claim.estimatedCost)}</p>
            </div>
          )}
          {claim.garageQuote > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Devis garage</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(claim.garageQuote)}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        {nextStatus && nextConf && (
          <button onClick={() => onAdvance(claim.id, nextStatus)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-primary-600 hover:text-white transition-all">
            <ArrowRight size={12} /> {nextConf.label}
          </button>
        )}
        <button onClick={() => onEdit(claim)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
          <ChevronRight size={15} />
        </button>
        <button onClick={() => onDelete(claim.id)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
          <X size={15} />
        </button>
      </div>
    </motion.div>
  );
};

const Claims = ({ companyId }) => {
  const [claims, setClaims] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClaim, setEditingClaim] = useState(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('kanban'); // 'kanban' | 'list'

  useEffect(() => {
    const unsub = subscribeToClaims({ companyId }, (data) => {
      setClaims(data);
      setLoading(false);
    });
    const loadAux = async () => {
      const [v, c] = await Promise.all([getVehicles({ companyId }), getClients({ companyId })]);
      setVehicles(v);
      setClients(c);
    };
    loadAux();
    return () => unsub();
  }, [companyId]);

  const handleSave = async (data) => {
    if (editingClaim?.id) {
      await updateClaim(editingClaim.id, data);
    } else {
      await createClaim(data);
    }
    setShowModal(false);
    setEditingClaim(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce sinistre ?')) await deleteClaim(id);
  };

  const handleAdvance = async (id, newStatus) => {
    await updateClaim(id, { status: newStatus });
  };

  const filtered = claims.filter(c =>
    (c.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.vehicleName || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.clientName || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalCost = claims.reduce((acc, c) => acc + (c.garageQuote || c.estimatedCost || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic uppercase text-slate-900 dark:text-white">Sinistres</h1>
          <p className="text-slate-400 mt-1 text-sm">{claims.length} sinistre{claims.length !== 1 ? 's' : ''} · Coût total : {formatCurrency(totalCost)}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button onClick={() => setView('kanban')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${view === 'kanban' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Kanban</button>
            <button onClick={() => setView('list')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${view === 'list' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Liste</button>
          </div>
          <button onClick={() => { setEditingClaim(null); setShowModal(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20">
            <Plus size={16} /> Déclarer
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un sinistre..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 outline-none" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-rose-600" /></div>
      ) : view === 'kanban' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {STATUSES.map(col => {
            const colClaims = filtered.filter(c => c.status === col.key);
            const ColIcon = col.icon;
            return (
              <div key={col.key} className="space-y-3">
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${col.color}`}>
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <ColIcon size={14} />
                  <span className="text-xs font-black uppercase tracking-widest flex-1">{col.label}</span>
                  <span className="text-xs font-black opacity-60">{colClaims.length}</span>
                </div>
                <AnimatePresence>
                  {colClaims.map(claim => (
                    <ClaimCard key={claim.id} claim={claim}
                      onEdit={(c) => { setEditingClaim(c); setShowModal(true); }}
                      onDelete={handleDelete} onAdvance={handleAdvance} />
                  ))}
                </AnimatePresence>
                {colClaims.length === 0 && (
                  <div className="text-center py-8 text-slate-300 dark:text-slate-700 text-xs font-bold">Aucun sinistre</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((claim, i) => {
              const statusConf = STATUSES.find(s => s.key === claim.status) || STATUSES[0];
              const StatusIcon = statusConf.icon;
              return (
                <motion.div key={claim.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-all group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${statusConf.color}`}>
                    <ShieldAlert size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 dark:text-white text-sm">{claim.title}</p>
                    <p className="text-xs text-slate-500">{claim.vehicleName || '—'} · {claim.clientName || '—'} · {formatDate(claim.createdAt)}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusConf.color}`}>
                    <StatusIcon size={9} />{statusConf.label}
                  </span>
                  {(claim.garageQuote || claim.estimatedCost) > 0 && (
                    <p className="font-black text-slate-900 dark:text-white text-sm">{formatCurrency(claim.garageQuote || claim.estimatedCost)}</p>
                  )}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingClaim(claim); setShowModal(true); }} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronRight size={15} /></button>
                    <button onClick={() => handleDelete(claim.id)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"><X size={15} /></button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="text-center py-24 text-slate-400">
              <ShieldAlert size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">Aucun sinistre déclaré</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <ClaimModal claim={editingClaim} vehicles={vehicles} clients={clients} companyId={companyId}
            onClose={() => { setShowModal(false); setEditingClaim(null); }}
            onSave={handleSave} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Claims;
