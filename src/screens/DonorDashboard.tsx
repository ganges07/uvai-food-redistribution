import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, Spinner, Button, StatusBadge, EmptyState } from '@/components/ui';
import { CATEGORY_LABELS, type FoodDonation, type Notification } from '@/types';
import { timeAgo, formatDateTime } from '@/lib/utils';
import { Plus, Clock, CheckCircle2, UtensilsCrossed, ChevronRight, Bike, Bell, Share2, Sparkles } from 'lucide-react';

export function DonorDashboard({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data: dons } = await supabase
      .from('food_donations')
      .select('*')
      .eq('donor_id', profile.id)
      .order('created_at', { ascending: false });
    setDonations((dons as FoodDonation[]) || []);

    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(3);
    setNotifications((notifs as Notification[]) || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!profile) return null;

  const total = donations.length;
  const active = donations.filter((d) => ['available', 'requested', 'accepted', 'assigned', 'ready_for_pickup'].includes(d.status)).length;
  const completed = donations.filter((d) => d.status === 'completed' || d.status === 'delivered').length;

  return (
    <div className="px-4 pt-6 pb-4 space-y-5 animate-fade-in">
      <div>
        <p className="text-sm text-gray-500">Welcome back,</p>
        <h1 className="text-2xl font-bold text-gray-900">{profile.full_name.split(' ')[0]}!</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<UtensilsCrossed className="h-5 w-5" />} label="Total" value={total} />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Active" value={active} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Done" value={completed} />
      </div>

      <button
        onClick={() => onNavigate('add-donation')}
        className="w-full p-4 rounded-2xl bg-gradient-to-r from-orange-600 to-red-500 text-white shadow-lg shadow-orange-600/20 active:scale-[0.99] transition-transform flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <Plus className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="font-semibold">Add Food Donation</p>
            <p className="text-xs text-orange-100">Share your surplus food</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-orange-600" />
          <p className="font-semibold text-orange-800 text-sm">Spread the Word</p>
        </div>
        <p className="text-xs text-orange-600 mb-3">Share UVAI with your community to reduce food waste together.</p>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: 'UVAI', text: 'Join UVAI to reduce food waste!', url: window.location.href });
            } else {
              navigator.clipboard?.writeText(window.location.href);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-600 text-white text-xs font-semibold active:scale-95 transition-transform"
        >
          <Share2 className="h-3.5 w-3.5" /> Share UVAI
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">My Donations</h2>
          {donations.length > 0 && (
            <button onClick={() => onNavigate('my-donations')} className="text-sm text-orange-600 font-medium">
              See all
            </button>
          )}
        </div>
        {donations.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed className="h-8 w-8" />}
            title="No donations yet"
            subtitle="Start by adding your first food donation"
            action={<Button size="sm" onClick={() => onNavigate('add-donation')}>Add Donation</Button>}
          />
        ) : (
          <div className="space-y-2.5">
            {donations.slice(0, 5).map((d) => (
              <Card key={d.id} onClick={() => onNavigate(`food-detail:${d.id}`)} className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 shrink-0">
                  <UtensilsCrossed className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{d.food_name}</p>
                  <p className="text-xs text-gray-500">
                    {d.quantity} {d.quantity_unit} · {d.is_vegetarian ? 'Veg' : 'Non-Veg'}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={d.status} />
                    {d.volunteer_id && <Bike className="h-3.5 w-3.5 text-cyan-600" />}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300" />
              </Card>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Notifications</h2>
            <button onClick={() => onNavigate('notifications')} className="text-sm text-orange-600 font-medium">See all</button>
          </div>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl ${n.is_read ? 'bg-gray-50' : 'bg-orange-50'}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 shrink-0">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                  <p className="text-xs text-gray-500 truncate">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg mx-auto mb-2 bg-orange-100 text-orange-700">
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </Card>
  );
}
