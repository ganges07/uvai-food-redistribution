import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, Spinner, EmptyState, Button, DeliveryStatusBadge, Toast, ConfirmDialog } from '@/components/ui';
import { CATEGORY_LABELS, type Delivery, type FoodDonation } from '@/types';
import { timeAgo, formatDateTime } from '@/lib/utils';
import { Bike, MapPin, Clock, Package, Navigation, CheckCircle2, Truck, Play, Square } from 'lucide-react';

export function VolunteerDashboard({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'available' | 'active' | 'completed'>('available');
  const [availableDeliveries, setAvailableDeliveries] = useState<Delivery[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<Delivery[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<Delivery[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; delivery: Delivery } | null>(null);
  const [locationTracking, setLocationTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    const { data: active } = await supabase
      .from('deliveries')
      .select('*, food_donation:food_donations(*, donor:profiles!food_donations_donor_id_fkey(*), acceptor:profiles!food_donations_acceptor_id_fkey(*)), volunteer:profiles!deliveries_volunteer_id_fkey(*), acceptor:profiles!deliveries_acceptor_id_fkey(*)')
      .eq('volunteer_id', profile.id)
      .in('status', ['assigned', 'picked_up', 'in_transit'])
      .order('assigned_at', { ascending: false });
    setActiveDeliveries((active as Delivery[]) || []);

    const { data: completed } = await supabase
      .from('deliveries')
      .select('*, food_donation:food_donations(*)')
      .eq('volunteer_id', profile.id)
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false });
    setCompletedDeliveries((completed as Delivery[]) || []);

    const { data: available } = await supabase
      .from('deliveries')
      .select('*, food_donation:food_donations(*, donor:profiles!food_donations_donor_id_fkey(*)), acceptor:profiles!deliveries_acceptor_id_fkey(*)')
      .is('volunteer_id', null)
      .eq('status', 'assigned')
      .order('created_at', { ascending: false });
    setAvailableDeliveries((available as Delivery[]) || []);

    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-start location tracking when there are active deliveries
  useEffect(() => {
    if (activeDeliveries.length > 0 && !locationTracking) {
      startLocationTracking();
    } else if (activeDeliveries.length === 0 && locationTracking) {
      stopLocationTracking();
    }
  }, [activeDeliveries.length]);

  function startLocationTracking() {
    if (!navigator.geolocation || !profile) return;
    if (!activeDeliveries.length) return;

    setToast({ message: 'Starting location sharing for active deliveries...', type: 'info' });

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const now = new Date().toISOString();
        for (const d of activeDeliveries) {
          await supabase
            .from('deliveries')
            .update({
              delivery_lat: latitude,
              delivery_lng: longitude,
              location_updated_at: now,
            })
            .eq('id', d.id);
          await supabase
            .from('food_donations')
            .update({
              delivery_lat: latitude,
              delivery_lng: longitude,
              location_updated_at: now,
            })
            .eq('id', d.food_post_id);
        }
      },
      (err) => {
        setToast({ message: `Location error: ${err.message}`, type: 'error' });
        setLocationTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    setLocationTracking(true);
  }

  function stopLocationTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocationTracking(false);
  }

  async function acceptDelivery(delivery: Delivery) {
    if (!profile) return;
    const { error } = await supabase
      .from('deliveries')
      .update({ volunteer_id: profile.id, status: 'assigned' })
      .eq('id', delivery.id)
      .is('volunteer_id', null);

    if (error) {
      setToast({ message: 'Could not accept - it may have been taken by another volunteer', type: 'error' });
    } else {
      await supabase.from('food_donations').update({ status: 'assigned', volunteer_id: profile.id, volunteer_assigned_at: new Date().toISOString() }).eq('id', delivery.food_post_id);
      await supabase.from('notifications').insert([
        { user_id: delivery.acceptor_id, title: 'Volunteer Assigned', message: 'A volunteer has accepted your delivery!', type: 'volunteer_assigned', related_id: delivery.food_post_id },
        { user_id: delivery.food_donation?.donor_id || '', title: 'Volunteer Assigned', message: 'A volunteer has been assigned to your donation.', type: 'volunteer_assigned', related_id: delivery.food_post_id },
      ]);
      setToast({ message: 'Delivery accepted!', type: 'success' });
      loadData();
    }
    setConfirmAction(null);
  }

  async function updateDeliveryStatus(delivery: Delivery, newStatus: 'picked_up' | 'in_transit' | 'delivered') {
    const updates: Record<string, string | null> = { status: newStatus };
    if (newStatus === 'picked_up') updates.picked_up_at = new Date().toISOString();
    if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString();

    await supabase.from('deliveries').update(updates).eq('id', delivery.id);

    if (newStatus === 'picked_up') {
      await supabase.from('food_donations').update({ status: 'collected' }).eq('id', delivery.food_post_id);
    } else if (newStatus === 'delivered') {
      await supabase.from('food_donations').update({ status: 'delivered', delivery_completed_at: new Date().toISOString() }).eq('id', delivery.food_post_id);
      stopLocationTracking();
      await supabase.from('notifications').insert([
        { user_id: delivery.acceptor_id, title: 'Delivery Completed', message: 'Your food has been delivered!', type: 'delivery_update', related_id: delivery.food_post_id },
        { user_id: delivery.food_donation?.donor_id || '', title: 'Delivery Completed', message: 'Your donation has been delivered.', type: 'delivery_update', related_id: delivery.food_post_id },
      ]);
    }

    setToast({ message: `Status updated to ${newStatus.replace('_', ' ')}`, type: 'success' });
    loadData();
    setConfirmAction(null);
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!profile) return null;

  const tabs = [
    { key: 'available' as const, label: 'Available', count: availableDeliveries.length },
    { key: 'active' as const, label: 'My Deliveries', count: activeDeliveries.length },
    { key: 'completed' as const, label: 'Completed', count: completedDeliveries.length },
  ];

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Volunteer Dashboard</h1>
        <p className="text-sm text-gray-500">Collect and deliver food to those in need</p>
      </div>

      {locationTracking && (
        <div className="mb-4 bg-cyan-50 rounded-xl p-3 flex items-center gap-2">
          <Navigation className="h-4 w-4 text-cyan-600 animate-pulse" />
          <p className="text-xs text-cyan-700 font-medium">Location sharing is active for your deliveries</p>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t.label} {t.count > 0 && `(${t.count})`}
          </button>
        ))}
      </div>

      {tab === 'available' && (
        <div className="space-y-3 animate-fade-in">
          {availableDeliveries.length === 0 ? (
            <EmptyState
              icon={<Bike className="h-8 w-8" />}
              title="No deliveries available"
              subtitle="Check back later for new delivery tasks"
            />
          ) : (
            availableDeliveries.map((d) => (
              <DeliveryCard
                key={d.id}
                delivery={d}
                action={
                  <Button size="sm" onClick={() => setConfirmAction({ type: 'accept', delivery: d })}>
                    Accept Delivery
                  </Button>
                }
              />
            ))
          )}
        </div>
      )}

      {tab === 'active' && (
        <div className="space-y-3 animate-fade-in">
          {activeDeliveries.length === 0 ? (
            <EmptyState
              icon={<Bike className="h-8 w-8" />}
              title="No active deliveries"
              subtitle="Accept a delivery task to get started"
              action={<Button size="sm" onClick={() => setTab('available')}>Find Deliveries</Button>}
            />
          ) : (
            activeDeliveries.map((d) => (
              <DeliveryCard
                key={d.id}
                delivery={d}
                action={
                  <div className="flex gap-2 flex-wrap">
                    {d.status === 'assigned' && (
                      <Button size="sm" onClick={() => setConfirmAction({ type: 'picked_up', delivery: d })}>
                        <Package className="h-3.5 w-3.5 mr-1" /> Mark Picked Up
                      </Button>
                    )}
                    {d.status === 'picked_up' && (
                      <Button size="sm" onClick={() => updateDeliveryStatus(d, 'in_transit')}>
                        <Truck className="h-3.5 w-3.5 mr-1" /> Start Transit
                      </Button>
                    )}
                    {d.status === 'in_transit' && (
                      <Button size="sm" variant="secondary" onClick={() => setConfirmAction({ type: 'delivered', delivery: d })}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Delivered
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => onNavigate(`track:${d.food_post_id}`)}>
                      <Navigation className="h-3.5 w-3.5 mr-1" /> Track
                    </Button>
                  </div>
                }
              />
            ))
          )}
        </div>
      )}

      {tab === 'completed' && (
        <div className="space-y-3 animate-fade-in">
          {completedDeliveries.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-8 w-8" />}
              title="No completed deliveries"
              subtitle="Your completed deliveries will appear here"
            />
          ) : (
            completedDeliveries.map((d) => (
              <DeliveryCard key={d.id} delivery={d} />
            ))
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        title={
          confirmAction?.type === 'accept' ? 'Accept Delivery?' :
          confirmAction?.type === 'picked_up' ? 'Mark as Picked Up?' :
          'Mark as Delivered?'
        }
        message={
          confirmAction?.type === 'accept' ? 'You will be responsible for collecting and delivering this food.' :
          confirmAction?.type === 'picked_up' ? 'Confirm you have collected the food from the donor.' :
          'Confirm the food has been delivered to the acceptor.'
        }
        confirmLabel={
          confirmAction?.type === 'accept' ? 'Accept' :
          confirmAction?.type === 'picked_up' ? 'Picked Up' : 'Delivered'
        }
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === 'accept') acceptDelivery(confirmAction.delivery);
          else updateDeliveryStatus(confirmAction.delivery, confirmAction.type as 'picked_up' | 'delivered');
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

function DeliveryCard({ delivery, action }: { delivery: Delivery; action?: React.ReactNode }) {
  const food = delivery.food_donation;
  if (!food) return null;
  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 shrink-0">
          <Bike className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{food.food_name}</p>
          <p className="text-xs text-gray-500">{food.quantity} {food.quantity_unit} · {CATEGORY_LABELS[food.category]}</p>
          <div className="mt-1"><DeliveryStatusBadge status={delivery.status} /></div>
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-orange-500" />
          <span><strong>Pickup:</strong> {delivery.pickup_location}</span>
        </div>
        {delivery.destination_location && (
          <div className="flex items-center gap-2">
            <Navigation className="h-3.5 w-3.5 text-cyan-500" />
            <span><strong>Drop:</strong> {delivery.destination_location}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          <span>Assigned {timeAgo(delivery.assigned_at)}</span>
        </div>
        {delivery.delivery_lat && delivery.delivery_lng && (
          <div className="flex items-center gap-2 text-cyan-600">
            <Navigation className="h-3.5 w-3.5" />
            <span>Location updated {delivery.location_updated_at ? timeAgo(delivery.location_updated_at) : 'unknown'}</span>
          </div>
        )}
      </div>

      {action && <div>{action}</div>}
    </Card>
  );
}
