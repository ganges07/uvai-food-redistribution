import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, Spinner, EmptyState, StatusBadge, Button } from '@/components/ui';
import { CATEGORY_LABELS, type FoodDonation, type ScheduledEvent, type Reservation } from '@/types';
import { formatDateTime, formatDate } from '@/lib/utils';
import { UtensilsCrossed, MapPin, Clock, Calendar, Search, ClipboardList } from 'lucide-react';

export function AcceptorDashboard({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'available' | 'events' | 'requests'>('available');
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [
      { data: dons },
      { data: evs },
      { data: res },
    ] = await Promise.all([
      supabase
        .from('food_donations')
        .select('*, donor:profiles!food_donations_donor_id_fkey(*)')
        .order('created_at', { ascending: false }),
      supabase
        .from('events')
        .select('*, organizer:profiles!events_organizer_id_fkey(*)')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true }),
      supabase
        .from('reservations')
        .select('*, food_donation:food_donations(*)')
        .eq('receiver_id', profile.id)
        .order('created_at', { ascending: false }),
    ]);
    setDonations((dons as FoodDonation[]) || []);
    setEvents((evs as ScheduledEvent[]) || []);
    setReservations((res as Reservation[]) || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!profile) return null;

  const now = new Date();
  const availableFood = donations.filter((d) => {
    const deadline = new Date(d.collection_deadline);
    if (deadline <= now) return false;
    if (d.status !== 'available') return false;
    if (search) {
      const q = search.toLowerCase();
      return d.food_name.toLowerCase().includes(q) || d.pickup_location.toLowerCase().includes(q) || (d.venue_name?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  const tabs = [
    { key: 'available' as const, label: 'Available Food', icon: UtensilsCrossed },
    { key: 'events' as const, label: 'Upcoming Events', icon: Calendar },
    { key: 'requests' as const, label: 'My Requests', icon: ClipboardList },
  ];

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Acceptor Dashboard</h1>
        <p className="text-sm text-gray-500">Find available food and upcoming events</p>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'available' && (
        <div className="space-y-3 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search food or location..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="bg-amber-50 rounded-xl p-3 flex items-start gap-2">
            <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Food safety is your responsibility. Verify preparation time, storage conditions, and food quality before consuming.
            </p>
          </div>

          {availableFood.length === 0 ? (
            <EmptyState
              icon={<UtensilsCrossed className="h-8 w-8" />}
              title="No food available"
              subtitle="Check back later for new donations"
            />
          ) : (
            availableFood.map((d) => (
              <Card key={d.id} onClick={() => onNavigate(`food-detail:${d.id}`)} className="overflow-hidden p-0">
                <div className="flex">
                  <div className="flex h-24 w-24 items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600 shrink-0">
                    <UtensilsCrossed className="h-8 w-8" />
                  </div>
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{d.food_name}</h3>
                      <span className={`text-xs font-bold shrink-0 ${d.is_vegetarian ? 'text-green-600' : 'text-red-500'}`}>
                        {d.is_vegetarian ? 'VEG' : 'NON-VEG'}
                      </span>
                    </div>
                    {d.venue_name && <p className="text-xs text-gray-500 mb-1">{d.venue_name}</p>}
                    <p className="text-xs text-gray-500">{CATEGORY_LABELS[d.category]}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="font-medium text-orange-700">{d.quantity} {d.quantity_unit}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[80px]">{d.pickup_location}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Clock className="h-3 w-3" />
                      <span>Safe until {formatDateTime(d.collection_deadline)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'events' && (
        <div className="space-y-3 animate-fade-in">
          <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-2">
            <Calendar className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Scheduled events are not guaranteed food donations. Surplus food is confirmed only when a donor publishes it on the event date.
            </p>
          </div>

          {events.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-8 w-8" />}
              title="No upcoming events"
              subtitle="Check back later for scheduled events"
            />
          ) : (
            events.map((ev) => (
              <Card key={ev.id}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{ev.event_name}</h3>
                    <p className="text-xs text-gray-500">{ev.venue_name} · {ev.venue_type}</p>
                  </div>
                  <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    {ev.event_type}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(ev.event_date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <UtensilsCrossed className="h-3 w-3" />
                    <span>{ev.expected_attendance} expected</span>
                  </div>
                  {ev.expected_meals && (
                    <div className="flex items-center gap-1">
                      <UtensilsCrossed className="h-3 w-3" />
                      <span>~{ev.expected_meals} meals</span>
                    </div>
                  )}
                  {ev.meal_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{ev.meal_time}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                  <MapPin className="h-3 w-3" />
                  <span>{ev.location}</span>
                </div>
                {ev.notes && <p className="text-xs text-gray-400 mt-2 italic">{ev.notes}</p>}
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-3 animate-fade-in">
          {reservations.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-8 w-8" />}
              title="No requests yet"
              subtitle="Browse available food to make a request"
              action={<Button size="sm" onClick={() => setTab('available')}>Browse Food</Button>}
            />
          ) : (
            reservations.map((r) => {
              const food = r.food_donation;
              if (!food) return null;
              return (
                <Card key={r.id} onClick={() => onNavigate(`food-detail:${food.id}`)} className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 shrink-0">
                    <UtensilsCrossed className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{food.food_name}</p>
                    <p className="text-xs text-gray-500">{r.requested_quantity} {food.quantity_unit} requested</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        r.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {r.status}
                      </span>
                      <StatusBadge status={food.status} />
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
