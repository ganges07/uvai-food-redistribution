import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, Spinner, EmptyState, StatusBadge, Button } from '@/components/ui';
import { type Profile, type FoodDonation, type Reservation, type FoodStatus } from '@/types';
import { ROLE_LABELS, STATUS_LABELS } from '@/types';
import { formatDateTime, timeAgo, estimateKg } from '@/lib/utils';
import { Users, UtensilsCrossed, ClipboardList, TrendingUp, CheckCircle2, Clock, Leaf } from 'lucide-react';

export function AdminDashboard({ onSelectDonation }: { onSelectDonation: (id: string) => void }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'listings' | 'requests'>('stats');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: u }, { data: d }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('food_donations').select('*, donor:profiles!food_donations_donor_id_fkey(*)').order('created_at', { ascending: false }),
      supabase.from('reservations').select('*, food_donation:food_donations(*), receiver:profiles!reservations_receiver_id_fkey(*)').order('created_at', { ascending: false }),
    ]);
    setUsers((u as Profile[]) || []);
    setDonations((d as FoodDonation[]) || []);
    setReservations((r as Reservation[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (profile?.role !== 'admin') {
    return (
      <div className="px-4 pt-6">
        <EmptyState icon={<Users className="h-8 w-8" />} title="Access denied" subtitle="Admin role required" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const totalKg = donations
    .filter((d) => d.status === 'completed')
    .reduce((sum, d) => sum + estimateKg(d.quantity, d.quantity_unit), 0);

  const tabs = [
    { key: 'stats' as const, label: 'Stats', icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'users' as const, label: 'Users', icon: <Users className="h-4 w-4" /> },
    { key: 'listings' as const, label: 'Listings', icon: <UtensilsCrossed className="h-4 w-4" /> },
    { key: 'requests' as const, label: 'Requests', icon: <ClipboardList className="h-4 w-4" /> },
  ];

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
      <p className="text-sm text-gray-500 mb-4">Platform overview and management</p>

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t.key ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'stats' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-gradient-to-br from-orange-600 to-red-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-600/20">
            <div className="flex items-center gap-2 mb-1">
              <Leaf className="h-5 w-5" />
              <p className="text-sm font-medium text-orange-100">Total Impact</p>
            </div>
            <p className="text-4xl font-bold">{totalKg.toFixed(1)} kg</p>
            <p className="text-sm text-orange-100 mt-2">Food saved from waste</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Users className="h-5 w-5" />} label="Total Users" value={users.length} color="blue" />
            <StatCard icon={<UtensilsCrossed className="h-5 w-5" />} label="Total Listings" value={donations.length} color="orange" />
            <StatCard icon={<ClipboardList className="h-5 w-5" />} label="Reservations" value={reservations.length} color="amber" />
            <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Completed" value={donations.filter((d) => d.status === 'completed').length} color="orange" />
          </div>

          <Card>
            <p className="font-semibold text-gray-900 mb-3">User Breakdown</p>
            <div className="space-y-2">
              <UserBreakdownRow label="Donors" count={users.filter((u) => u.role === 'donor').length} total={users.length} color="bg-orange-500" />
              <UserBreakdownRow label="Acceptors" count={users.filter((u) => u.role === 'acceptor').length} total={users.length} color="bg-amber-500" />
              <UserBreakdownRow label="Volunteers" count={users.filter((u) => u.role === 'volunteer').length} total={users.length} color="bg-cyan-500" />
              <UserBreakdownRow label="Halls/Temples" count={users.filter((u) => u.role === 'hall').length} total={users.length} color="bg-red-500" />
              <UserBreakdownRow label="Admins" count={users.filter((u) => u.role === 'admin').length} total={users.length} color="bg-purple-500" />
            </div>
          </Card>

          <Card>
            <p className="font-semibold text-gray-900 mb-3">Listing Status</p>
            <div className="space-y-2">
              {(['available', 'requested', 'accepted', 'ready_for_pickup', 'collected', 'completed', 'expired'] as FoodStatus[]).map((s) => {
                const count = donations.filter((d) => d.status === s).length;
                if (count === 0) return null;
                return (
                  <div key={s} className="flex items-center justify-between">
                    <StatusBadge status={s} />
                    <span className="text-sm font-semibold text-gray-700">{count}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-2.5 animate-fade-in">
          {users.length === 0 ? (
            <EmptyState icon={<Users className="h-8 w-8" />} title="No users registered" />
          ) : (
            users.map((u) => (
              <Card key={u.id} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-700 font-semibold text-sm">
                  {u.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{u.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  <p className="text-xs text-gray-400">{u.organization_name || 'No organization'}</p>
                </div>
                <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                  {ROLE_LABELS[u.role]}
                </span>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'listings' && (
        <div className="space-y-2.5 animate-fade-in">
          {donations.length === 0 ? (
            <EmptyState icon={<UtensilsCrossed className="h-8 w-8" />} title="No food listings" />
          ) : (
            donations.map((d) => (
              <Card key={d.id} onClick={() => onSelectDonation(d.id)} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 shrink-0">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{d.food_name}</p>
                  <p className="text-xs text-gray-500">{d.quantity} {d.quantity_unit} · {d.donor?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-gray-400">{timeAgo(d.created_at)}</p>
                </div>
                <StatusBadge status={d.status} />
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-2.5 animate-fade-in">
          {reservations.length === 0 ? (
            <EmptyState icon={<ClipboardList className="h-8 w-8" />} title="No reservation requests" />
          ) : (
            reservations.map((r) => (
              <Card key={r.id} onClick={() => r.food_donation && onSelectDonation(r.food_donation.id)} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900 truncate">{r.food_donation?.food_name || 'Food item'}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    r.status === 'accepted' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {r.requested_quantity} units · {r.receiver?.full_name || 'Unknown receiver'}
                </p>
                <p className="text-xs text-gray-400">{timeAgo(r.created_at)}</p>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-orange-100 text-orange-700',
    orange: 'bg-orange-100 text-orange-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  return (
    <Card className="text-center">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg mx-auto mb-2 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </Card>
  );
}

function UserBreakdownRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
