import { useState, useEffect, useCallback } from 'react';
import { useAuth, getActiveRole, clearActiveRole } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, Button, Input, Modal, EmptyState, StatusBadge, Toast } from '@/components/ui';
import { ROLE_LABELS, CATEGORY_LABELS, type FoodDonation, type Reservation, type Feedback, type UserRole } from '@/types';
import { getInitials, formatDate, timeAgo } from '@/lib/utils';
import { User, Edit2, LogOut, Star, ChevronRight, FileText, Heart, RefreshCw, Brain, BarChart3, QrCode } from 'lucide-react';

interface ProfileScreenProps {
  onNavigate: (tab: string) => void;
  onSwitchRole: () => void;
}

export function ProfileScreen({ onNavigate, onSwitchRole }: ProfileScreenProps) {
  const { profile, signOut, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'donations' | 'reservations'>('info');
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editOrgName, setEditOrgName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');

  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const activeRole = getActiveRole() as UserRole;

  const loadData = useCallback(async () => {
    if (!profile) return;
    if (activeRole === 'donor' || profile.role === 'admin') {
      const { data } = await supabase
        .from('food_donations')
        .select('*')
        .eq('donor_id', profile.id)
        .order('created_at', { ascending: false });
      setDonations((data as FoodDonation[]) || []);
    }
    if (activeRole === 'acceptor') {
      const { data } = await supabase
        .from('reservations')
        .select('*, food_donation:food_donations(*)')
        .eq('receiver_id', profile.id)
        .order('created_at', { ascending: false });
      setReservations((data as Reservation[]) || []);
    }
    const { data: fb } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setFeedback((fb as Feedback[]) || []);
  }, [profile, activeRole]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (profile) {
      setEditName(profile.full_name);
      setEditPhone(profile.phone || '');
      setEditOrgName(profile.organization_name || '');
      setEditAddress(profile.address || '');
      setEditBio(profile.bio || '');
      setEditWhatsapp(profile.whatsapp_number || '');
    }
  }, [profile]);

  async function handleSave() {
    if (!profile) return;
    setLoading(true);
    await supabase
      .from('profiles')
      .update({
        full_name: editName,
        phone: editPhone || null,
        organization_name: editOrgName || null,
        address: editAddress || null,
        bio: editBio || null,
        whatsapp_number: editWhatsapp || null,
      })
      .eq('id', profile.id);
    await refreshProfile();
    setLoading(false);
    setEditing(false);
    setToast({ message: 'Profile updated!', type: 'success' });
  }

  async function handleSubmitFeedback() {
    if (!profile) return;
    setFeedbackLoading(true);
    await supabase.from('feedback').insert({
      user_id: profile.id,
      rating: feedbackRating,
      comment: feedbackComment.trim() || null,
      feedback_type: 'platform',
    });
    setFeedbackLoading(false);
    setShowFeedback(false);
    setFeedbackComment('');
    setFeedbackRating(5);
    setToast({ message: 'Feedback submitted!', type: 'success' });
    loadData();
  }

  if (!profile) return null;

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center gap-4 mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white text-xl font-bold shadow-lg">
          {getInitials(profile.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{profile.full_name}</h1>
          <p className="text-sm text-gray-500 truncate">{profile.email}</p>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 mt-1">
            {ROLE_LABELS[activeRole] || profile.role}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'info' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Info
        </button>
        {activeRole === 'donor' && (
          <button
            onClick={() => setActiveTab('donations')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'donations' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Donations
          </button>
        )}
        {activeRole === 'acceptor' && (
          <button
            onClick={() => setActiveTab('reservations')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'reservations' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Requests
          </button>
        )}
      </div>

      {activeTab === 'info' && (
        <div className="space-y-3 animate-fade-in">
          <Card className="space-y-3">
            <InfoRow label="Organization" value={profile.organization_name || 'Not set'} />
            <InfoRow label="Phone" value={profile.phone || 'Not set'} />
            <InfoRow label="WhatsApp" value={profile.whatsapp_number || 'Not set'} />
            <InfoRow label="Address" value={profile.address || 'Not set'} />
            {profile.bio && <InfoRow label="Bio" value={profile.bio} />}
            <InfoRow label="Member Since" value={formatDate(profile.created_at)} />
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button variant="outline" onClick={() => setShowFeedback(true)}>
              <Star className="h-4 w-4 mr-1" /> Feedback
            </Button>
          </div>

          <Button variant="outline" fullWidth onClick={() => onNavigate('ai-prediction')}>
            <Brain className="h-4 w-4 mr-2" /> AI Surplus Prediction
          </Button>
          <Button variant="outline" fullWidth onClick={() => onNavigate('impact')}>
            <BarChart3 className="h-4 w-4 mr-2" /> Impact Dashboard
          </Button>
          <Button variant="outline" fullWidth onClick={() => onNavigate('qr-code')}>
            <QrCode className="h-4 w-4 mr-2" /> App QR Code
          </Button>
          <Button variant="ghost" fullWidth onClick={() => onNavigate('faq')}>
            <FileText className="h-4 w-4 mr-2" /> FAQ & Help
          </Button>
          <Button variant="ghost" fullWidth onClick={() => onNavigate('privacy')}>
            <FileText className="h-4 w-4 mr-2" /> Privacy Policy & Terms
          </Button>

          <Button variant="secondary" fullWidth onClick={() => { clearActiveRole(); onSwitchRole(); }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Switch Role
          </Button>
          <Button variant="danger" fullWidth onClick={signOut}>
            <LogOut className="h-4 w-4 mr-1" /> Sign Out
          </Button>
        </div>
      )}

      {activeTab === 'donations' && (
        <div className="space-y-2.5 animate-fade-in">
          {donations.length === 0 ? (
            <EmptyState icon={<User className="h-8 w-8" />} title="No donations yet" />
          ) : (
            donations.map((d) => (
              <Card key={d.id} onClick={() => onNavigate(`food-detail:${d.id}`)} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{d.food_name}</p>
                  <p className="text-xs text-gray-500">{d.quantity} {d.quantity_unit} · {CATEGORY_LABELS[d.category]}</p>
                  <div className="mt-1"><StatusBadge status={d.status} /></div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300" />
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'reservations' && (
        <div className="space-y-2.5 animate-fade-in">
          {reservations.length === 0 ? (
            <EmptyState icon={<User className="h-8 w-8" />} title="No requests yet" />
          ) : (
            reservations.map((r) => (
              <Card key={r.id} onClick={() => onNavigate(`food-detail:${r.food_donation_id}`)} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{r.food_donation?.food_name || 'Food item'}</p>
                  <p className="text-xs text-gray-500">{r.requested_quantity} units · {timeAgo(r.created_at)}</p>
                  <span className={`text-xs font-semibold ${r.status === 'pending' ? 'text-amber-600' : r.status === 'accepted' ? 'text-green-600' : 'text-red-600'}`}>
                    {r.status}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300" />
              </Card>
            ))
          )}
        </div>
      )}

      {feedback.length > 0 && (
        <div className="mt-4">
          <h2 className="font-semibold text-gray-900 mb-2">Your Feedback</h2>
          {feedback.map((f) => (
            <Card key={f.id} className="mb-2">
              <div className="flex items-center gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < f.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                ))}
              </div>
              {f.comment && <p className="text-sm text-gray-600">{f.comment}</p>}
            </Card>
          ))}
        </div>
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Profile">
        <div className="space-y-4">
          <Input label="Full Name" value={editName} onChange={setEditName} />
          <Input label="Phone" value={editPhone} onChange={setEditPhone} type="tel" />
          <Input label="Organization Name" value={editOrgName} onChange={setEditOrgName} />
          <Input label="WhatsApp Number" value={editWhatsapp} onChange={setEditWhatsapp} type="tel" />
          <Input label="Address" value={editAddress} onChange={setEditAddress} />
          <Input label="Bio" value={editBio} onChange={setEditBio} multiline rows={2} />
          <Button fullWidth onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Modal>

      <Modal open={showFeedback} onClose={() => setShowFeedback(false)} title="Share Feedback">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Rating</p>
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} onClick={() => setFeedbackRating(i + 1)}>
                  <Star className={`h-8 w-8 ${i < feedbackRating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
          </div>
          <Input label="Comment (optional)" value={feedbackComment} onChange={setFeedbackComment} multiline rows={3} placeholder="Tell us about your experience..." />
          <Button fullWidth onClick={handleSubmitFeedback} disabled={feedbackLoading}>
            {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <p className="text-sm text-gray-500 shrink-0">{label}</p>
      <p className="text-sm font-medium text-gray-900 text-right">{value}</p>
    </div>
  );
}
