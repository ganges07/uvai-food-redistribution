import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, Button, Spinner, EmptyState, DeliveryStatusBadge, StatusBadge } from '@/components/ui';
import { CATEGORY_LABELS, type FoodDonation, type Delivery } from '@/types';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { ArrowLeft, MapPin, Clock, Navigation, Package, Phone, MessageCircle, ExternalLink, Bike, AlertCircle } from 'lucide-react';

export function DeliveryTracking({
  foodId,
  onBack,
}: {
  foodId: string;
  onBack: () => void;
}) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [donation, setDonation] = useState<FoodDonation | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    const { data: food } = await supabase
      .from('food_donations')
      .select('*, donor:profiles!food_donations_donor_id_fkey(*), acceptor:profiles!food_donations_acceptor_id_fkey(*), volunteer:profiles!food_donations_volunteer_id_fkey(*)')
      .eq('id', foodId)
      .maybeSingle();

    if (!food) {
      setError('Food donation not found');
      setLoading(false);
      return;
    }

    const fd = food as FoodDonation;
    setDonation(fd);

    // Access control: only the donor, acceptor, or assigned volunteer can view tracking
    const isDonor = profile.id === fd.donor_id;
    const isAcceptor = profile.id === fd.acceptor_id || profile.id === fd.reserved_by;
    const isVolunteer = profile.id === fd.volunteer_id;
    const isAdmin = profile.role === 'admin';

    if (!isDonor && !isAcceptor && !isVolunteer && !isAdmin) {
      setError('You are not authorized to view this delivery tracking information.');
      setLoading(false);
      return;
    }

    const { data: del } = await supabase
      .from('deliveries')
      .select('*, volunteer:profiles!deliveries_volunteer_id_fkey(*), acceptor:profiles!deliveries_acceptor_id_fkey(*)')
      .eq('food_post_id', foodId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setDelivery((del as Delivery) || null);
    setLoading(false);
  }, [foodId, profile]);

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time subscription for delivery updates
  useEffect(() => {
    if (!foodId) return;
    const channel = supabase
      .channel(`delivery-${foodId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries', filter: `food_post_id=eq.${foodId}` }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_donations', filter: `id=eq.${foodId}` }, () => {
        loadData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [foodId, loadData]);

  if (loading) {
    return (
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Delivery Tracking</h1>
        </div>
        <div className="flex justify-center py-20"><Spinner /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 pt-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Delivery Tracking</h1>
        </div>
        <EmptyState
          icon={<AlertCircle className="h-8 w-8" />}
          title="Access Denied"
          subtitle={error}
          action={<Button onClick={onBack}>Go Back</Button>}
        />
      </div>
    );
  }

  if (!donation) return null;

  const hasLocation = delivery?.delivery_lat && delivery?.delivery_lng;
  const mapUrl = hasLocation
    ? `https://www.google.com/maps?q=${delivery!.delivery_lat},${delivery!.delivery_lng}`
    : null;
  const pickupMapUrl = `https://www.google.com/maps?q=${encodeURIComponent(donation.pickup_location)}`;

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Delivery Tracking</h1>
      </div>

      <div className="space-y-4">
        {/* Food info */}
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 shrink-0">
              <Package className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{donation.food_name}</p>
              <p className="text-xs text-gray-500">{donation.quantity} {donation.quantity_unit} · {CATEGORY_LABELS[donation.category]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={donation.status} />
            {delivery && <DeliveryStatusBadge status={delivery.status} />}
          </div>
        </Card>

        {/* Delivery status timeline */}
        {delivery && (
          <Card>
            <p className="text-sm font-medium text-gray-700 mb-4">Delivery Progress</p>
            <div className="space-y-0">
              {[
                { label: 'Assigned to Volunteer', done: true, time: delivery.assigned_at },
                { label: 'Picked Up', done: ['picked_up', 'in_transit', 'delivered'].includes(delivery.status), time: delivery.picked_up_at },
                { label: 'In Transit', done: ['in_transit', 'delivered'].includes(delivery.status), time: null },
                { label: 'Delivered', done: delivery.status === 'delivered', time: delivery.delivered_at },
              ].map((step, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                      step.done ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      {step.done && <span className="text-xs">✓</span>}
                    </div>
                    {idx < 3 && <div className={`w-0.5 h-6 ${step.done ? 'bg-orange-600' : 'bg-gray-200'}`} />}
                  </div>
                  <div>
                    <p className={`text-sm ${step.done ? 'font-medium text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                    {step.time && <p className="text-xs text-gray-400">{formatDateTime(step.time)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Live location */}
        {delivery && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Volunteer Location</p>
              {hasLocation && delivery.location_updated_at && (
                <span className="text-xs text-cyan-600 flex items-center gap-1">
                  <Navigation className="h-3 w-3 animate-pulse" />
                  Updated {timeAgo(delivery.location_updated_at)}
                </span>
              )}
            </div>
            {hasLocation ? (
              <div className="space-y-3">
                <div className="bg-cyan-50 rounded-xl p-4 text-center">
                  <Navigation className="h-8 w-8 text-cyan-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-cyan-700">
                    {delivery.delivery_lat!.toFixed(4)}, {delivery.delivery_lng!.toFixed(4)}
                  </p>
                  <p className="text-xs text-cyan-500 mt-1">Live location available</p>
                </div>
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-100 text-orange-700 text-sm font-semibold hover:bg-orange-200 transition-colors"
                  >
                    <MapPin className="h-4 w-4" /> View on Google Maps
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Location not available yet</p>
                <p className="text-xs text-gray-400 mt-1">The volunteer's location will appear here when they start sharing.</p>
              </div>
            )}
          </Card>
        )}

        {/* Pickup & destination */}
        <Card className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Pickup Location</p>
              <p className="text-sm text-gray-600">{donation.pickup_location}</p>
              <a href={pickupMapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 font-medium mt-1 inline-flex items-center gap-1">
                Open in Maps <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          {delivery?.destination_location && (
            <div className="flex items-start gap-3">
              <Navigation className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">Delivery Destination</p>
                <p className="text-sm text-gray-600">{delivery.destination_location}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-700">Safe Until</p>
              <p className="text-sm text-gray-600">{formatDateTime(donation.collection_deadline)}</p>
            </div>
          </div>
        </Card>

        {/* Volunteer info */}
        {delivery?.volunteer && (
          <Card>
            <p className="text-sm font-medium text-gray-700 mb-3">Assigned Volunteer</p>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 shrink-0">
                <Bike className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{delivery.volunteer.full_name}</p>
                <p className="text-xs text-gray-500">Volunteer</p>
              </div>
            </div>
            {delivery.volunteer.phone && (
              <div className="flex gap-2 mt-3">
                <a href={`tel:${delivery.volunteer.phone}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-100 text-blue-700 text-sm font-semibold">
                  <Phone className="h-4 w-4" /> Call
                </a>
                {delivery.volunteer.whatsapp_number && (
                  <a
                    href={`https://wa.me/${delivery.volunteer.whatsapp_number.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-100 text-green-700 text-sm font-semibold"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                )}
              </div>
            )}
          </Card>
        )}

        {/* No delivery assigned yet */}
        {!delivery && donation.status !== 'completed' && donation.status !== 'expired' && (
          <Card className="text-center">
            <Bike className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">No volunteer assigned yet</p>
            <p className="text-xs text-gray-500 mt-1">A volunteer will be assigned to collect and deliver this food.</p>
          </Card>
        )}

        {/* Safety warning */}
        <div className="bg-amber-50 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Always verify food quality and safety upon collection. Do not consume food that appears spoiled or has been stored improperly.
          </p>
        </div>
      </div>
    </div>
  );
}
