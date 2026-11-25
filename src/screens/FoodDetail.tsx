import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, Button, Spinner, StatusBadge, Modal, Input, EmptyState, Toast } from '@/components/ui';
import { CATEGORY_LABELS, STATUS_LABELS, type FoodDonation, type Reservation, type Profile } from '@/types';
import { formatDateTime, estimateKg } from '@/lib/utils';
import { ArrowLeft, MapPin, Clock, Package, MessageCircle, Phone, Check, Navigation, Bike, Calendar, Info } from 'lucide-react';

export function FoodDetail({
  donationId,
  onBack,
  onNavigate,
}: {
  donationId: string;
  onBack: () => void;
  onNavigate: (tab: string) => void;
}) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [donation, setDonation] = useState<FoodDonation | null>(null);
  const [donor, setDonor] = useState<Profile | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveMessage, setReserveMessage] = useState('');
  const [reserveQty, setReserveQty] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const activeRole = localStorage.getItem('uvai-active-role');

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('food_donations')
      .select('*, donor:profiles!food_donations_donor_id_fkey(*), receiver:profiles!food_donations_reserved_by_fkey(*)')
      .eq('id', donationId)
      .maybeSingle();

    if (data) {
      const d = data as FoodDonation;
      setDonation(d);
      setDonor(d.donor || null);

      if (activeRole === 'acceptor' && profile) {
        const { data: res } = await supabase
          .from('reservations')
          .select('*')
          .eq('food_donation_id', donationId)
          .eq('receiver_id', profile.id)
          .maybeSingle();
        setReservation((res as Reservation) || null);
      }
    }
    setLoading(false);
  }, [donationId, profile, activeRole]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleReserve() {
    if (!profile || !donation) return;
    setActionLoading(true);

    // Check for duplicate requests
    const { data: existing } = await supabase
      .from('reservations')
      .select('id')
      .eq('food_donation_id', donation.id)
      .eq('receiver_id', profile.id)
      .maybeSingle();

    if (existing) {
      setToast({ message: 'You have already requested this food', type: 'error' });
      setActionLoading(false);
      return;
    }

    const qty = Math.min(parseInt(reserveQty) || donation.quantity, donation.quantity);

    const { error: resError } = await supabase.from('reservations').insert({
      food_donation_id: donation.id,
      receiver_id: profile.id,
      message: reserveMessage.trim() || null,
      requested_quantity: qty,
      status: 'pending',
    });

    if (resError) {
      setToast({ message: resError.message, type: 'error' });
      setActionLoading(false);
      return;
    }

    await supabase
      .from('food_donations')
      .update({ status: 'requested', reserved_by: profile.id, acceptor_id: profile.id })
      .eq('id', donation.id);

    await supabase.from('notifications').insert({
      user_id: donation.donor_id,
      title: 'New Food Request',
      message: `${profile.full_name} requested your food: ${donation.food_name}`,
      type: 'reservation_request',
      related_id: donation.id,
    });

    setActionLoading(false);
    setShowReserveModal(false);
    setToast({ message: 'Request sent successfully!', type: 'success' });
    loadData();
  }

  async function acceptReservation() {
    if (!donation || !profile) return;
    setActionLoading(true);
    await supabase.from('reservations').update({ status: 'accepted' }).eq('food_donation_id', donation.id);
    await supabase.from('food_donations').update({ status: 'accepted' }).eq('id', donation.id);

    // Create a delivery task for volunteers
    await supabase.from('deliveries').insert({
      food_post_id: donation.id,
      acceptor_id: donation.acceptor_id || donation.reserved_by || profile.id,
      status: 'assigned',
      pickup_location: donation.pickup_location,
    });

    await supabase.from('notifications').insert({
      user_id: donation.reserved_by || '',
      title: 'Request Accepted',
      message: `Your request for ${donation.food_name} has been accepted! A volunteer will be assigned.`,
      type: 'reservation_status',
      related_id: donation.id,
    });

    setActionLoading(false);
    setToast({ message: 'Request accepted! Volunteer delivery task created.', type: 'success' });
    loadData();
  }

  async function rejectReservation() {
    if (!donation) return;
    setActionLoading(true);
    await supabase.from('reservations').update({ status: 'rejected' }).eq('food_donation_id', donation.id);
    await supabase.from('food_donations').update({ status: 'available', reserved_by: null, acceptor_id: null }).eq('id', donation.id);

    await supabase.from('notifications').insert({
      user_id: donation.reserved_by || '',
      title: 'Request Declined',
      message: `Your request for ${donation.food_name} was declined.`,
      type: 'reservation_status',
      related_id: donation.id,
    });

    setActionLoading(false);
    setToast({ message: 'Request declined', type: 'error' });
    loadData();
  }

  async function markReadyForPickup() {
    if (!donation) return;
    setActionLoading(true);
    await supabase.from('food_donations').update({ status: 'ready_for_pickup' }).eq('id', donation.id);
    if (donation.reserved_by) {
      await supabase.from('notifications').insert({
        user_id: donation.reserved_by,
        title: 'Food Ready for Pickup',
        message: `${donation.food_name} is ready for pickup at ${donation.pickup_location}`,
        type: 'donation_update',
        related_id: donation.id,
      });
    }
    setActionLoading(false);
    setToast({ message: 'Marked as ready for pickup', type: 'success' });
    loadData();
  }

  if (loading) {
    return (
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Food Details</h1>
        </div>
        <div className="flex justify-center py-20"><Spinner /></div>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
        </div>
        <EmptyState icon={<Package className="h-8 w-8" />} title="Donation not found" />
        <Button fullWidth onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  const isOwner = profile?.id === donation.donor_id;
  const isAcceptor = activeRole === 'acceptor';
  const hasReservation = !!reservation;

  return (
    <div className="pb-4 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="px-4 pt-6 flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Food Details</h1>
      </div>

      <div className="px-4 space-y-4">
        {donation.image_url ? (
          <img src={donation.image_url} alt={donation.food_name} className="w-full h-48 object-cover rounded-2xl" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center text-orange-400">
            <Package className="h-16 w-16" />
          </div>
        )}

        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h2 className="text-xl font-bold text-gray-900">{donation.food_name}</h2>
            <StatusBadge status={donation.status} />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500">{CATEGORY_LABELS[donation.category]}</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${donation.is_vegetarian ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {donation.is_vegetarian ? 'VEG' : 'NON-VEG'}
            </span>
          </div>
        </div>

        {(donation.event_name || donation.venue_name) && (
          <Card className="space-y-1.5">
            {donation.event_name && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-orange-600" />
                <span className="text-gray-700">{donation.event_name}</span>
              </div>
            )}
            {donation.venue_name && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-orange-600" />
                <span className="text-gray-700">{donation.venue_name}</span>
              </div>
            )}
            {donation.event_type && (
              <p className="text-xs text-gray-500 ml-6">Event type: {donation.event_type}</p>
            )}
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <p className="text-2xl font-bold text-orange-700">{donation.quantity}</p>
            <p className="text-xs text-gray-500">{donation.quantity_unit}</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-orange-700">{estimateKg(donation.quantity, donation.quantity_unit)}</p>
            <p className="text-xs text-gray-500">est. kg saved</p>
          </Card>
        </div>

        {donation.description && (
          <Card>
            <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
            <p className="text-sm text-gray-600">{donation.description}</p>
          </Card>
        )}

        <Card className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-700">Pickup Location</p>
              <p className="text-sm text-gray-600">{donation.pickup_location}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-700">Prepared At</p>
              <p className="text-sm text-gray-600">{formatDateTime(donation.preparation_time)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-700">Safe Consumption Deadline</p>
              <p className="text-sm text-gray-600">{formatDateTime(donation.collection_deadline)}</p>
            </div>
          </div>
          {donation.storage_info && (
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">Storage Info</p>
                <p className="text-sm text-gray-600">{donation.storage_info}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Food safety warning */}
        <div className="bg-amber-50 rounded-xl p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Food safety is your responsibility. Verify preparation time, storage conditions, and food quality before consuming. Do not consume food past its safe consumption deadline.
          </p>
        </div>

        {donor && (
          <Card>
            <p className="text-sm font-medium text-gray-700 mb-3">Donor Information</p>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-700 font-semibold">
                {donor.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{donor.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{donor.organization_name || 'Individual donor'}</p>
              </div>
            </div>
            {(donor.whatsapp_number || donor.phone) && (
              <div className="flex gap-2 mt-3">
                {donor.whatsapp_number && (
                  <a
                    href={`https://wa.me/${donor.whatsapp_number.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-100 text-green-700 text-sm font-semibold hover:bg-green-200 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                )}
                {donor.phone && (
                  <a href={`tel:${donor.phone}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-100 text-blue-700 text-sm font-semibold hover:bg-blue-200 transition-colors">
                    <Phone className="h-4 w-4" />
                    Call
                  </a>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Volunteer info */}
        {donation.volunteer_id && (
          <Card className="bg-cyan-50 border-cyan-200">
            <div className="flex items-center gap-3">
              <Bike className="h-6 w-6 text-cyan-600" />
              <div>
                <p className="text-sm font-medium text-cyan-800">Volunteer Assigned</p>
                <p className="text-xs text-cyan-600">A volunteer is handling the collection and delivery</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onNavigate(`track:${donation.id}`)} className="ml-auto">
                <Navigation className="h-3.5 w-3.5 mr-1" /> Track
              </Button>
            </div>
          </Card>
        )}

        {/* Donor actions */}
        {isOwner && donation.status === 'requested' && (
          <div className="flex gap-3">
            <Button variant="danger" onClick={rejectReservation} disabled={actionLoading} fullWidth>
              Decline
            </Button>
            <Button onClick={acceptReservation} disabled={actionLoading} fullWidth>
              Accept Request
            </Button>
          </div>
        )}

        {isOwner && donation.status === 'accepted' && (
          <Button fullWidth onClick={markReadyForPickup} disabled={actionLoading}>
            Mark Ready for Pickup
          </Button>
        )}

        {/* Acceptor actions */}
        {isAcceptor && donation.status === 'available' && !hasReservation && (
          <Button fullWidth size="lg" onClick={() => setShowReserveModal(true)}>
            Request This Food
          </Button>
        )}

        {isAcceptor && hasReservation && (
          <Card className="text-center">
            <p className="text-sm text-gray-600">
              You have {reservation.status === 'pending' ? 'a pending request' : `a ${reservation.status} request`} for this food.
            </p>
          </Card>
        )}

        {/* Track delivery button */}
        {donation.status !== 'available' && donation.status !== 'expired' && (
          <Button fullWidth variant="outline" onClick={() => onNavigate(`track:${donation.id}`)}>
            <Navigation className="h-4 w-4 mr-2" /> Track Delivery
          </Button>
        )}

        {donation.status === 'delivered' && (
          <Card className="text-center bg-green-50 border-green-200">
            <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-semibold text-green-800">Food Delivered</p>
            <p className="text-sm text-green-600">Thank you for reducing food waste!</p>
          </Card>
        )}
      </div>

      <Modal open={showReserveModal} onClose={() => setShowReserveModal(false)} title="Request Food">
        <div className="space-y-4">
          <Input
            label="Requested Quantity"
            type="number"
            value={reserveQty}
            onChange={setReserveQty}
            placeholder={`${donation.quantity}`}
            min="1"
            max={String(donation.quantity)}
          />
          <Input
            label="Message to Donor (optional)"
            value={reserveMessage}
            onChange={setReserveMessage}
            multiline
            rows={3}
            placeholder="Tell the donor about your organization and needs..."
          />
          <Button fullWidth onClick={handleReserve} disabled={actionLoading}>
            {actionLoading ? 'Sending...' : 'Send Request'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
