import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Input, Select, Button, Card, Spinner, EmptyState, Toast, ConfirmDialog } from '@/components/ui';
import { type ScheduledEvent } from '@/types';
import { fromDatetimeLocal, toDatetimeLocal, formatDate } from '@/lib/utils';
import { ArrowLeft, Calendar, MapPin, Clock, Users, UtensilsCrossed, Edit2, Trash2, Plus, Building2 } from 'lucide-react';

export function HallDashboard({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [venueName, setVenueName] = useState('');
  const [venueType, setVenueType] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [expectedAttendance, setExpectedAttendance] = useState('');
  const [expectedMeals, setExpectedMeals] = useState('');
  const [expectedCategories, setExpectedCategories] = useState('');
  const [mealTime, setMealTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const venueTypeOptions = [
    { value: 'marriage_hall', label: 'Marriage Hall' },
    { value: 'temple', label: 'Temple' },
    { value: 'event_hall', label: 'Event Hall' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'community_hall', label: 'Community Hall' },
    { value: 'other', label: 'Other' },
  ];
  const eventTypeOptions = [
    { value: 'marriage', label: 'Marriage' },
    { value: 'religious', label: 'Religious Function' },
    { value: 'birthday', label: 'Birthday Party' },
    { value: 'corporate', label: 'Corporate Event' },
    { value: 'conference', label: 'Conference' },
    { value: 'community', label: 'Community Gathering' },
    { value: 'other', label: 'Other' },
  ];

  const loadEvents = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('organizer_id', profile.id)
      .order('event_date', { ascending: true });
    setEvents((data as ScheduledEvent[]) || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  function resetForm() {
    setVenueName(''); setVenueType(''); setEventName(''); setEventType('');
    setEventDate(''); setExpectedAttendance(''); setExpectedMeals('');
    setExpectedCategories(''); setMealTime(''); setLocation(''); setNotes('');
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSubmitLoading(true);

    const eventData = {
      organizer_id: profile.id,
      venue_name: venueName.trim(),
      venue_type: venueType,
      event_name: eventName.trim(),
      event_type: eventType,
      event_date: eventDate,
      expected_attendance: parseInt(expectedAttendance),
      expected_meals: expectedMeals ? parseInt(expectedMeals) : null,
      expected_categories: expectedCategories.trim() || null,
      meal_time: mealTime || null,
      location: location.trim(),
      notes: notes.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase.from('events').update(eventData).eq('id', editingId);
      if (error) {
        setToast({ message: error.message, type: 'error' });
      } else {
        setToast({ message: 'Event updated!', type: 'success' });
        setShowForm(false);
        resetForm();
        loadEvents();
      }
    } else {
      const { error } = await supabase.from('events').insert(eventData);
      if (error) {
        setToast({ message: error.message, type: 'error' });
      } else {
        setToast({ message: 'Event scheduled!', type: 'success' });
        setShowForm(false);
        resetForm();
        loadEvents();
      }
    }
    setSubmitLoading(false);
  }

  function startEdit(ev: ScheduledEvent) {
    setEditingId(ev.id);
    setVenueName(ev.venue_name);
    setVenueType(ev.venue_type);
    setEventName(ev.event_name);
    setEventType(ev.event_type);
    setEventDate(ev.event_date);
    setExpectedAttendance(String(ev.expected_attendance));
    setExpectedMeals(ev.expected_meals ? String(ev.expected_meals) : '');
    setExpectedCategories(ev.expected_categories || '');
    setMealTime(ev.meal_time || '');
    setLocation(ev.location);
    setNotes(ev.notes || '');
    setShowForm(true);
  }

  async function handleDelete() {
    if (!deleteId) return;
    await supabase.from('events').delete().eq('id', deleteId);
    setDeleteId(null);
    setToast({ message: 'Event cancelled', type: 'success' });
    loadEvents();
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!profile) return null;

  if (showForm) {
    return (
      <div className="px-4 pt-6 pb-4 animate-fade-in">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Event' : 'Schedule Event'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Venue Name" value={venueName} onChange={setVenueName} required placeholder="e.g. Grand Palace Hall" />
          <Select label="Venue Type" value={venueType} onChange={setVenueType} options={venueTypeOptions} required />
          <Input label="Event Name" value={eventName} onChange={setEventName} required placeholder="e.g. Sharma Wedding" />
          <Select label="Event Type" value={eventType} onChange={setEventType} options={eventTypeOptions} required />
          <Input label="Event Date" type="date" value={eventDate} onChange={setEventDate} required min={new Date().toISOString().split('T')[0]} />
          <Input label="Expected Attendance" type="number" value={expectedAttendance} onChange={setExpectedAttendance} required placeholder="500" min="1" />
          <Input label="Expected Meals (optional)" type="number" value={expectedMeals} onChange={setExpectedMeals} placeholder="600" min="1" />
          <Input label="Expected Food Categories (optional)" value={expectedCategories} onChange={setExpectedCategories} placeholder="e.g. Veg, Non-veg, Dessert" />
          <Input label="Approximate Meal Time (optional)" value={mealTime} onChange={setMealTime} placeholder="e.g. 7:00 PM - 10:00 PM" />
          <Input label="Location" value={location} onChange={setLocation} required placeholder="Full address of venue" />
          <Input label="Notes (optional)" value={notes} onChange={setNotes} multiline rows={2} placeholder="Additional information" />

          <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-2">
            <Calendar className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">Scheduled events are not guaranteed food donations. On the event date, you can publish confirmed surplus food separately.</p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }} type="button">Cancel</Button>
            <Button fullWidth type="submit" disabled={submitLoading}>
              {submitLoading ? 'Saving...' : editingId ? 'Update Event' : 'Schedule Event'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Hall / Temple Dashboard</h1>
        <p className="text-sm text-gray-500">Schedule and manage your events</p>
      </div>

      <button
        onClick={() => { resetForm(); setShowForm(true); }}
        className="w-full p-4 rounded-2xl bg-gradient-to-r from-orange-600 to-red-500 text-white shadow-lg shadow-orange-600/20 active:scale-[0.99] transition-transform flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <Plus className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="font-semibold">Schedule New Event</p>
            <p className="text-xs text-orange-100">Plan upcoming food events</p>
          </div>
        </div>
      </button>

      {events.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="No events scheduled"
          subtitle="Schedule an event to let acceptors plan ahead"
        />
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <Card key={ev.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{ev.event_name}</h3>
                  <p className="text-xs text-gray-500">{ev.venue_name} · {ev.venue_type}</p>
                </div>
                <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-1 rounded-full shrink-0">
                  {ev.event_type}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(ev.event_date)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
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
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" />
                <span>{ev.location}</span>
              </div>
              {ev.notes && <p className="text-xs text-gray-400 italic">{ev.notes}</p>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => startEdit(ev)}>
                  <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteId(ev.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Cancel
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Cancel Event?"
        message="This event will be permanently removed."
        confirmLabel="Cancel Event"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
