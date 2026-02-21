import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  ClipboardList, 
  Settings as SettingsIcon, 
  LogOut, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  ChevronRight, 
  ChevronLeft,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Calendar,
  User as UserIcon,
  Phone,
  Hash,
  RotateCcw,
  Trash,
  Users as UsersIcon,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatDate } from "./lib/utils";
import type { AuthRecord, AuthStatus, Stats, User, EmployeeStats } from "./types";

// --- Components ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost', size?: 'sm' | 'md' | 'lg' }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
      secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm",
      danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
      ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    };
    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const Badge = ({ status }: { status: AuthStatus }) => {
  const styles = {
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Denied: "bg-red-50 text-red-700 border-red-200",
    "Not Required": "bg-slate-50 text-slate-700 border-slate-200",
    "Follow Up": "bg-purple-50 text-purple-700 border-purple-200",
    Cancelled: "bg-slate-100 text-slate-600 border-slate-300",
    "Not Covered": "bg-orange-50 text-orange-700 border-orange-200",
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", styles[status])}>
      {status}
    </span>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'settings' | 'trash' | 'users'>('dashboard');
  const [records, setRecords] = useState<AuthRecord[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<AuthRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AuthRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AuthRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchRecords();
      fetchStats();
      fetchDeletedRecords();
      if (user.role === 'admin') fetchUsers();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    const res = await fetch("/api/records");
    if (res.ok) setRecords(await res.json());
  };

  const fetchStats = async () => {
    const res = await fetch("/api/records/stats");
    if (res.ok) setStats(await res.json());
  };

  const fetchDeletedRecords = async () => {
    const res = await fetch("/api/records/deleted");
    if (res.ok) setDeletedRecords(await res.json());
  };

  const fetchUsers = async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    } else {
      alert("Invalid credentials");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const handleDelete = async (id: number) => {
    setConfirmDialog({
      message: "Move this record to Trash?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/records/${id}`, { method: "DELETE" });
          if (res.ok) {
            await fetchRecords();
            await fetchStats();
            await fetchDeletedRecords();
          } else {
            console.error("Failed to delete record");
          }
        } catch (err) {
          console.error("Error deleting record:", err);
        }
      }
    });
  };

  const handleRestore = async (id: number) => {
    try {
      const res = await fetch(`/api/records/${id}/restore`, { method: "POST" });
      if (res.ok) {
        await fetchRecords();
        await fetchStats();
        await fetchDeletedRecords();
      }
    } catch (err) {
      console.error("Error restoring record:", err);
    }
  };

  const handlePermanentDelete = async (id: number) => {
    setConfirmDialog({
      message: "Permanently delete this record? This cannot be undone.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/records/${id}/permanent`, { method: "DELETE" });
          if (res.ok) {
            await fetchDeletedRecords();
          }
        } catch (err) {
          console.error("Error permanently deleting record:", err);
        }
      }
    });
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = 
      r.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.account_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.insurance_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.insurance.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white mb-4 shadow-lg shadow-indigo-200">
              <ClipboardList size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Authorization Tracker</h1>
            <p className="text-slate-500 mt-2">Sign in to access your dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <Input name="username" placeholder="admin" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <Input name="password" type="password" placeholder="••••••••" required />
            </div>
            <Button className="w-full" type="submit">Sign In</Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen">
        <div className="p-6">
          <div className="flex items-center gap-3 text-indigo-600 mb-8">
            <ClipboardList size={28} />
            <span className="font-bold text-xl tracking-tight text-slate-900">AuthTrack</span>
          </div>
          <nav className="space-y-1">
            <button 
              onClick={() => setView('dashboard')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                view === 'dashboard' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>
            <button 
              onClick={() => setView('trash')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                view === 'trash' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Trash size={18} />
              Trash
            </button>
            {user.role === 'admin' && (
              <button 
                onClick={() => setView('users')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  view === 'users' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <UsersIcon size={18} />
                Team Management
              </button>
            )}
            <button 
              onClick={() => setView('settings')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                view === 'settings' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <SettingsIcon size={18} />
              Settings
            </button>
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              {user.role === 'admin' ? <ShieldCheck size={16} className="text-indigo-600" /> : <UserIcon size={16} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.username}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {view === 'dashboard' ? (
          <div className="max-w-7xl mx-auto space-y-8">
            {/* ... dashboard content ... */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
                <p className="text-slate-500">Manage and track medical authorization requests</p>
              </div>
              <Button onClick={() => { setEditingRecord(null); setIsModalOpen(true); }} className="gap-2">
                <Plus size={18} />
                New Authorization
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-4">
              <StatCard title="Total" value={stats?.total || 0} icon={<FileText className="text-indigo-600" />} />
              <StatCard title="Pending" value={stats?.pending || 0} icon={<Clock className="text-amber-600" />} />
              <StatCard title="Approved" value={stats?.approved || 0} icon={<CheckCircle2 className="text-emerald-600" />} />
              <StatCard title="Denied" value={stats?.denied || 0} icon={<XCircle className="text-red-600" />} />
              <StatCard title="Not Required" value={stats?.not_required || 0} icon={<ShieldCheck className="text-slate-600" />} />
              <StatCard title="Follow Up" value={stats?.follow_up || 0} icon={<AlertCircle className="text-purple-600" />} />
              <StatCard title="Cancelled" value={stats?.cancelled || 0} icon={<XCircle className="text-slate-400" />} />
              <StatCard title="Not Covered" value={stats?.not_covered || 0} icon={<AlertCircle className="text-orange-600" />} />
              <StatCard title="Today" value={stats?.submitted_today || 0} icon={<Calendar className="text-blue-600" />} />
            </div>

            {/* Table Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  placeholder="Search patient, account, or ID..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-slate-400" />
                  <Select 
                    className="w-40"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Denied">Denied</option>
                    <option value="Not Required">Not Required</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Not Covered">Not Covered</option>
                  </Select>
                </div>
                <Button variant="secondary" className="gap-2" onClick={() => exportToCSV(filteredRecords)}>
                  <Download size={18} />
                  Export
                </Button>
              </div>
            </div>

            {/* Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-bottom border-slate-200">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Patient / Account</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Insurance / ID</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Visit / Doctor</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Notes</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Dates</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => setViewingRecord(record)}
                            className="text-left hover:text-indigo-600 transition-colors"
                          >
                            <div className="font-medium text-slate-900 group-hover:text-indigo-600">{record.patient_name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <Hash size={12} /> {record.account_number}
                              <span className="mx-1">•</span>
                              DOB: {formatDate(record.dob)}
                            </div>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900">{record.insurance}</div>
                          <div className="text-xs text-slate-500 mt-1">ID: {record.insurance_id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900">{record.visit_type}</div>
                          <div className="text-xs text-slate-500 mt-1 truncate max-w-[200px]">Dr. {record.doctor_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge status={record.status} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-500 max-w-[150px] truncate" title={record.notes}>
                            {record.notes || <span className="italic opacity-50">No notes</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-600">
                            <span className="font-medium">Worked:</span> {formatDate(record.date_worked)}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            Init: {formatDate(record.request_initiated)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => { setEditingRecord(record); setIsModalOpen(true); }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDelete(record.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Move to Trash"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRecords.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                            <Search size={32} className="text-slate-200" />
                            <p>No records found matching your criteria</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ) : view === 'trash' ? (
          <TrashView 
            records={deletedRecords} 
            onRestore={handleRestore} 
            onPermanentDelete={handlePermanentDelete} 
            isAdmin={user.role === 'admin'}
          />
        ) : view === 'users' ? (
          <UsersView 
            users={users} 
            onRefresh={fetchUsers} 
          />
        ) : (
          <SettingsView />
        )}
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <RecordModal 
            record={editingRecord} 
            onClose={() => setIsModalOpen(false)} 
            onSave={() => { fetchRecords(); fetchStats(); setIsModalOpen(false); }} 
          />
        )}
        {viewingRecord && (
          <ViewModal 
            record={viewingRecord} 
            onClose={() => setViewingRecord(null)} 
            onEdit={() => { setEditingRecord(viewingRecord); setViewingRecord(null); setIsModalOpen(true); }}
          />
        )}
        {confirmDialog && (
          <ConfirmModal 
            message={confirmDialog.message} 
            onConfirm={confirmDialog.onConfirm} 
            onClose={() => setConfirmDialog(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: number | string, icon: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
    </Card>
  );
}

function ViewModal({ record, onClose, onEdit }: { record: AuthRecord, onClose: () => void, onEdit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <UserIcon size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{record.patient_name}</h3>
              <p className="text-sm text-slate-500">Account: {record.account_number} • DOB: {formatDate(record.dob)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onEdit} className="gap-2">
              <Edit2 size={14} /> Edit
            </Button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-2">
              <XCircle size={24} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Section: Insurance */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Insurance Details</h4>
              <div className="space-y-3">
                <DetailItem label="Carrier" value={record.insurance} />
                <DetailItem label="ID Number" value={record.insurance_id} />
                <DetailItem label="P/R Status" value={record.p_r} />
                <DetailItem label="Portal" value={record.insurance_portal_name} />
              </div>
            </div>

            {/* Section: Request */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Request Info</h4>
              <div className="space-y-3">
                <DetailItem label="Visit Type" value={record.visit_type} />
                <DetailItem label="Doctor" value={`Dr. ${record.doctor_name}`} />
                <DetailItem label="Status" value={<Badge status={record.status} />} />
                <DetailItem label="Initiated" value={formatDate(record.request_initiated)} />
                <DetailItem label="Date Worked" value={formatDate(record.date_worked)} />
              </div>
            </div>

            {/* Section: Codes & Tracking */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tracking & Codes</h4>
              <div className="space-y-3">
                <DetailItem label="Procedure Codes" value={record.procedure_codes} />
                <DetailItem label="Dx Codes" value={record.dx_codes} />
                <DetailItem label="Auth/Case #" value={record.auth_case_number} />
                <DetailItem label="Ref #" value={record.ref_number} />
              </div>
            </div>

            {/* Section: Call Info */}
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 border-t border-slate-100">
               <DetailItem label="Rep Name" value={record.rep_name} />
               <DetailItem label="Phone Number" value={record.phone_number} />
               <DetailItem label="Call Time/Ref" value={record.call_time_spent} />
            </div>

            {/* Section: Notes */}
            <div className="md:col-span-3 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Checklist</h4>
                <div className="space-y-2">
                  {(() => {
                    try {
                      const checklist = JSON.parse(record.checklist || '{}');
                      return Object.entries(checklist).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <div className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center",
                            value ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"
                          )}>
                            {value && <ShieldCheck size={10} />}
                          </div>
                          <span className="capitalize text-slate-600">{key.replace(/_/g, ' ')}</span>
                        </div>
                      ));
                    } catch (e) {
                      return <span className="text-xs text-slate-400">No checklist data</span>;
                    }
                  })()}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Patient Notepad</h4>
                <div className="bg-slate-50 rounded-xl p-4 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap min-h-[100px]">
                  {record.notes || <span className="italic text-slate-400">No notes documented for this patient.</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="text-xs text-slate-400">
            Last updated: {new Date(record.updated_at).toLocaleString()}
          </div>
          <Button onClick={onClose}>Close View</Button>
        </div>
      </motion.div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">{label}</p>
      <div className="text-sm font-medium text-slate-900">{value || "—"}</div>
    </div>
  );
}

function RecordModal({ record, onClose, onSave }: { record: AuthRecord | null, onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState<Partial<AuthRecord>>(
    record || {
      status: "Pending",
      visit_type: "",
      insurance: "",
      insurance_id: "",
      patient_name: "",
      dob: "",
      account_number: "",
      p_r: "",
      doctor_name: "",
      procedure_codes: "",
      dx_codes: "",
      request_initiated: new Date().toISOString().split('T')[0],
      insurance_portal_name: "",
      rep_name: "",
      phone_number: "",
      auth_case_number: "",
      ref_number: "",
      date_worked: new Date().toISOString().split('T')[0],
      call_time_spent: "",
      notes: "",
      checklist: JSON.stringify({
        submitted: false,
        verified: false,
        notes_attached: false,
        follow_up_set: false
      })
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = record ? `/api/records/${record.id}` : "/api/records";
    const method = record ? "PUT" : "POST";
    
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">
            {record ? "Edit Authorization" : "New Authorization"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Patient Info */}
            <div className="space-y-4 md:col-span-3">
              <h4 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Patient Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Patient Name</label>
                  <Input value={formData.patient_name} onChange={e => setFormData({...formData, patient_name: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">DOB</label>
                  <Input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Account #</label>
                  <Input value={formData.account_number} onChange={e => setFormData({...formData, account_number: e.target.value})} required />
                </div>
              </div>
            </div>

            {/* Insurance Info */}
            <div className="space-y-4 md:col-span-3">
              <h4 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Insurance Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Insurance Company</label>
                  <Input value={formData.insurance} onChange={e => setFormData({...formData, insurance: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Insurance ID #</label>
                  <Input value={formData.insurance_id} onChange={e => setFormData({...formData, insurance_id: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">P/R (Primary/Secondary)</label>
                  <Select value={formData.p_r} onChange={e => setFormData({...formData, p_r: e.target.value})}>
                    <option value="">Select...</option>
                    <option value="Primary">Primary</option>
                    <option value="Secondary">Secondary</option>
                    <option value="Tertiary">Tertiary</option>
                  </Select>
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="space-y-4 md:col-span-3">
              <h4 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Request Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Visit Type</label>
                  <Input value={formData.visit_type} onChange={e => setFormData({...formData, visit_type: e.target.value})} placeholder="e.g. MRI, Surgery" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <Select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as AuthStatus})}>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Denied">Denied</option>
                    <option value="Not Required">Not Required</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Not Covered">Not Covered</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Doctor Name</label>
                  <Input value={formData.doctor_name} onChange={e => setFormData({...formData, doctor_name: e.target.value})} placeholder="e.g. Dr. Smith" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Procedure Codes</label>
                  <Input value={formData.procedure_codes} onChange={e => setFormData({...formData, procedure_codes: e.target.value})} placeholder="70551, 70553" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Dx Codes</label>
                  <Input value={formData.dx_codes} onChange={e => setFormData({...formData, dx_codes: e.target.value})} placeholder="M54.5, G44.2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Request Initiated</label>
                  <Input type="date" value={formData.request_initiated} onChange={e => setFormData({...formData, request_initiated: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Complete Notes / Portal Info */}
            <div className="space-y-4 md:col-span-3">
              <h4 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Complete Notes (Portal/Call Info)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Insurance Portal Name</label>
                  <Input value={formData.insurance_portal_name} onChange={e => setFormData({...formData, insurance_portal_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Rep Name</label>
                  <Input value={formData.rep_name} onChange={e => setFormData({...formData, rep_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Phone #</label>
                  <Input value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Auth/Case #</label>
                  <Input value={formData.auth_case_number} onChange={e => setFormData({...formData, auth_case_number: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Ref #</label>
                  <Input value={formData.ref_number} onChange={e => setFormData({...formData, ref_number: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Work Info */}
            <div className="space-y-4 md:col-span-3">
              <h4 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Work Tracking</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Date Worked</label>
                  <Input type="date" value={formData.date_worked} onChange={e => setFormData({...formData, date_worked: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Call Time Spent w/Ref#</label>
                  <Input value={formData.call_time_spent} onChange={e => setFormData({...formData, call_time_spent: e.target.value})} placeholder="e.g. 15 min - Ref#9876" />
                </div>
              </div>
            </div>

            {/* Notepad */}
            <div className="space-y-4 md:col-span-3">
              <h4 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Patient Notepad</h4>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Transaction Documentation</label>
                <textarea 
                  className="flex min-h-[120px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="Enter detailed notes about this transaction..."
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Authorization</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function SettingsView() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) {
      alert("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
    } else {
      alert("Failed to change password");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-500">Manage your account and app preferences</p>
      </div>

      <Card className="p-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Change Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
            <Input 
              type="password" 
              value={currentPassword} 
              onChange={e => setCurrentPassword(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <Input 
              type="password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              required 
            />
          </div>
          <Button type="submit">Update Password</Button>
        </form>
      </Card>

      <Card className="p-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Export Data</h3>
        <p className="text-sm text-slate-500 mb-6">Download all your authorization records in CSV format for backup or external analysis.</p>
        <Button variant="secondary" className="gap-2">
          <Download size={18} />
          Download Full CSV
        </Button>
      </Card>
    </div>
  );
}

function TrashView({ records, onRestore, onPermanentDelete, isAdmin }: { records: AuthRecord[], onRestore: (id: number) => void, onPermanentDelete: (id: number) => void, isAdmin: boolean }) {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Trash</h2>
        <p className="text-slate-500">Deleted records are stored here. {isAdmin ? "Only the administrator can delete them permanently." : "Contact an administrator to permanently delete records."}</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-bottom border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Patient / Account</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Insurance / ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Deleted On</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{record.patient_name}</div>
                    <div className="text-xs text-slate-500">{record.account_number}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">{record.insurance}</div>
                    <div className="text-xs text-slate-500">{record.insurance_id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge status={record.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {formatDate(record.updated_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-indigo-600 hover:bg-indigo-50 gap-1"
                        onClick={() => onRestore(record.id)}
                      >
                        <RotateCcw size={14} />
                        Restore
                      </Button>
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:bg-red-50 gap-1"
                          onClick={() => onPermanentDelete(record.id)}
                        >
                          <Trash2 size={14} />
                          Delete Permanently
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <p>Trash is empty</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function UsersView({ users, onRefresh }: { users: User[], onRefresh: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [isAdding, setIsAdding] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchEmployeeStats();
  }, []);

  const fetchEmployeeStats = async () => {
    try {
      const res = await fetch("/api/users/stats");
      if (res.ok) {
        setEmployeeStats(await res.json());
      }
    } catch (err) {
      console.error("Error fetching employee stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    if (res.ok) {
      setUsername("");
      setPassword("");
      setIsAdding(false);
      onRefresh();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to add user");
    }
  };

  const handleDeleteUser = async (id: number) => {
    setConfirmDialog({
      message: "Are you sure you want to remove this user?",
      onConfirm: async () => {
        const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
        if (res.ok) onRefresh();
        else {
          const data = await res.json();
          console.error(data.error || "Failed to delete user");
        }
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Team Management</h2>
          <p className="text-slate-500">Create and manage access for your employees</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="gap-2">
          <Plus size={18} />
          {isAdding ? "Cancel" : "Add Team Member"}
        </Button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-6 bg-indigo-50/50 border-indigo-100">
              <h3 className="text-sm font-semibold text-indigo-900 uppercase tracking-wider mb-4">New Team Member</h3>
              <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Username</label>
                  <Input value={username} onChange={e => setUsername(e.target.value)} required />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
                  <Select value={role} onChange={e => setRole(e.target.value as any)}>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </Select>
                </div>
                <Button type="submit">Create Account</Button>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Employee Performance</h3>
          <p className="text-sm text-slate-500">Submissions tracked by team member</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-bottom border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider text-center">Today</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider text-center">This Week</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider text-center">This Month</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider text-center">YTD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingStats ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading stats...</td>
                </tr>
              ) : employeeStats.map((stat) => (
                <tr key={stat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{stat.username}</div>
                    <div className="text-xs text-slate-500 capitalize">{stat.role}</div>
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-indigo-600">{stat.today}</td>
                  <td className="px-6 py-4 text-center">{stat.this_week}</td>
                  <td className="px-6 py-4 text-center">{stat.this_month}</td>
                  <td className="px-6 py-4 text-center">{stat.ytd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="pt-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Management</h3>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-bottom border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                        <UserIcon size={16} />
                      </div>
                      <span className="font-medium text-slate-900">{u.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                      u.role === 'admin' ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 text-slate-700 border-slate-200"
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.username !== 'admin' && (
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {confirmDialog && (
          <ConfirmModal 
            message={confirmDialog.message} 
            onConfirm={confirmDialog.onConfirm} 
            onClose={() => setConfirmDialog(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onClose }: { message: string, onConfirm: () => void, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
      >
        <h3 className="text-lg font-bold text-slate-900 mb-2">Confirm Action</h3>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => { onConfirm(); onClose(); }}>Confirm</Button>
        </div>
      </motion.div>
    </div>
  );
}

function exportToCSV(records: AuthRecord[]) {
  if (records.length === 0) return;
  
  const headers = [
    "Visit Type", "Insurance", "ID #", "Patient Name", "DOB", "Account #", 
    "P/R", "Doctor Name", "Procedure Codes", "Dx Codes", "Status", "Notes", "Request Initiated",
    "Insurance Portal", "Rep Name", "Phone", "Auth/Case #", "Ref #", "Date Worked", "Call Time"
  ];

  const rows = records.map(r => [
    r.visit_type, r.insurance, r.insurance_id, r.patient_name, r.dob, r.account_number,
    r.p_r, r.doctor_name, r.procedure_codes, r.dx_codes, r.status, r.notes, r.request_initiated,
    r.insurance_portal_name, r.rep_name, r.phone_number, r.auth_case_number, r.ref_number, r.date_worked, r.call_time_spent
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `authorizations_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
