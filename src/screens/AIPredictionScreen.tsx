import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Input, Select, Button, Card, Spinner, Toast } from '@/components/ui';
import { type ScheduledEvent, type AIPrediction } from '@/types';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Database, Info } from 'lucide-react';

export function AIPredictionScreen({ onBack }: { onBack: () => void }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [history, setHistory] = useState<AIPrediction[]>([]);
  const [events, setEvents] = useState<ScheduledEvent[]>([]);

  const [venueName, setVenueName] = useState('');
  const [eventType, setEventType] = useState('');
  const [attendance, setAttendance] = useState('');
  const [expectedMeals, setExpectedMeals] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');

  const eventTypeOptions = [
    { value: 'marriage', label: 'Marriage' },
    { value: 'religious', label: 'Religious Function' },
    { value: 'birthday', label: 'Birthday Party' },
    { value: 'corporate', label: 'Corporate Event' },
    { value: 'conference', label: 'Conference' },
    { value: 'community', label: 'Community Gathering' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    async function loadHistory() {
      if (!profile) return;
      const { data: preds } = await supabase
        .from('ai_predictions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setHistory((preds as AIPrediction[]) || []);

      const { data: evs } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', profile.id)
        .order('event_date', { ascending: true });
      setEvents((evs as ScheduledEvent[]) || []);
    }
    loadHistory();
  }, [profile]);

  function loadFromEvent(evId: string) {
    setSelectedEventId(evId);
    const ev = events.find((e) => e.id === evId);
    if (ev) {
      setVenueName(ev.venue_name);
      setEventType(ev.event_type);
      setAttendance(String(ev.expected_attendance));
      setExpectedMeals(ev.expected_meals ? String(ev.expected_meals) : '');
    }
  }

  // Heuristic surplus prediction model (labeled as preliminary estimate)
  // Based on industry research: 15-25% of food at events is typically wasted
  // Without sufficient historical data, this is a preliminary estimate
  function predictSurplus(att: number, meals: number, evType: string): {
    min: number; max: number; avg: number; risk: string; recommendation: string;
  } {
    const expectedMealsCount = meals > 0 ? meals : Math.ceil(att * 1.2);

    // Waste factors by event type (industry averages)
    const wasteFactors: Record<string, { min: number; max: number }> = {
      marriage: { min: 0.18, max: 0.28 },
      religious: { min: 0.12, max: 0.20 },
      birthday: { min: 0.15, max: 0.25 },
      corporate: { min: 0.10, max: 0.18 },
      conference: { min: 0.08, max: 0.15 },
      community: { min: 0.10, max: 0.20 },
      other: { min: 0.12, max: 0.22 },
    };

    const factor = wasteFactors[evType] || wasteFactors.other;
    const leftoverMin = Math.round(expectedMealsCount * factor.min);
    const leftoverMax = Math.round(expectedMealsCount * factor.max);
    const leftoverAvg = Math.round((leftoverMin + leftoverMax) / 2);

    const wasteRatio = leftoverAvg / expectedMealsCount;
    let risk = 'low';
    if (wasteRatio >= 0.20) risk = 'high';
    else if (wasteRatio >= 0.15) risk = 'medium';

    let recommendation = '';
    if (risk === 'high') {
      recommendation = 'High surplus predicted. Prepare a redistribution plan — notify nearby acceptors and arrange volunteers in advance. Consider reducing food preparation by 15-20%.';
    } else if (risk === 'medium') {
      recommendation = 'Moderate surplus expected. Have a backup redistribution plan ready and notify 2-3 nearby organizations.';
    } else {
      recommendation = 'Low surplus predicted. Monitor on the event day and publish surplus food if available.';
    }

    return { min: leftoverMin, max: leftoverMax, avg: leftoverAvg, risk, recommendation };
  }

  async function handlePredict(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const att = parseInt(attendance);
    if (!att || att <= 0) {
      setToast({ message: 'Please enter valid attendance', type: 'error' });
      return;
    }

    setLoading(true);
    const meals = expectedMeals ? parseInt(expectedMeals) : 0;
    const result = predictSurplus(att, meals, eventType || 'other');

    const { data, error } = await supabase.from('ai_predictions').insert({
      user_id: profile.id,
      venue_name: venueName.trim() || 'Unknown Venue',
      event_type: eventType || 'other',
      expected_attendance: att,
      expected_meals: meals || null,
      predicted_leftover_min: result.min,
      predicted_leftover_max: result.max,
      predicted_leftover_avg: result.avg,
      risk_level: result.risk,
      recommendation: result.recommendation,
      is_preliminary: true,
    }).select().single();

    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setPrediction(data as AIPrediction);
      setToast({ message: 'Prediction generated!', type: 'success' });
      // Refresh history
      const { data: preds } = await supabase
        .from('ai_predictions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setHistory((preds as AIPrediction[]) || []);
    }
    setLoading(false);
  }

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-md">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Food Surplus Prediction</h1>
            <p className="text-xs text-gray-500">Estimate leftover food after events</p>
          </div>
        </div>
      </div>

      {/* Preliminary estimate disclaimer */}
      <div className="bg-amber-50 rounded-xl p-3 flex items-start gap-2 mb-4">
        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          This is a <strong>preliminary estimate</strong> based on industry waste factors, not a trained ML model. Predictions will improve as actual leftover data is collected from past events.
        </p>
      </div>

      {/* Load from events */}
      {events.length > 0 && (
        <div className="mb-4">
          <Select
            label="Load from your scheduled events (optional)"
            value={selectedEventId}
            onChange={loadFromEvent}
            options={events.map((e) => ({ value: e.id, label: `${e.event_name} - ${e.venue_name}` }))}
          />
        </div>
      )}

      <form onSubmit={handlePredict} className="space-y-4">
        <Input label="Venue Name" value={venueName} onChange={setVenueName} required placeholder="e.g. Grand Palace Hall" />
        <Select label="Event Type" value={eventType} onChange={setEventType} options={eventTypeOptions} required />
        <Input label="Expected Attendance" type="number" value={attendance} onChange={setAttendance} required placeholder="500" min="1" />
        <Input label="Expected Meals (optional)" type="number" value={expectedMeals} onChange={setExpectedMeals} placeholder="600" min="1" />
        <Button fullWidth type="submit" disabled={loading}>
          {loading ? 'Predicting...' : 'Generate Prediction'}
        </Button>
      </form>

      {/* Prediction result */}
      {prediction && (
        <Card className="mt-6 space-y-4 border-2 border-orange-200 bg-orange-50/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            <p className="font-semibold text-gray-900">Prediction Result</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-white rounded-xl p-3">
              <p className="text-2xl font-bold text-orange-600">{prediction.predicted_leftover_min}</p>
              <p className="text-xs text-gray-500">Min meals</p>
            </div>
            <div className="text-center bg-white rounded-xl p-3">
              <p className="text-2xl font-bold text-orange-700">{prediction.predicted_leftover_avg}</p>
              <p className="text-xs text-gray-500">Avg meals</p>
            </div>
            <div className="text-center bg-white rounded-xl p-3">
              <p className="text-2xl font-bold text-red-500">{prediction.predicted_leftover_max}</p>
              <p className="text-xs text-gray-500">Max meals</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">Waste Risk Level</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mt-1 ${
                prediction.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                prediction.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>
                {prediction.risk_level.charAt(0).toUpperCase() + prediction.risk_level.slice(1)} Risk
              </span>
            </div>
          </div>

          {prediction.recommendation && (
            <div className="flex items-start gap-2 bg-white rounded-xl p-3">
              <Lightbulb className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Recommendation</p>
                <p className="text-sm text-gray-600">{prediction.recommendation}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3">
            <Database className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600">
              This prediction is based on statistical estimates. After your event, record the actual leftover quantity to improve future predictions.
            </p>
          </div>
        </Card>
      )}

      {/* Prediction history */}
      {history.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold text-gray-900 mb-3">Recent Predictions</h2>
          <div className="space-y-2">
            {history.map((p) => (
              <Card key={p.id} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 shrink-0">
                  <Brain className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{p.venue_name}</p>
                  <p className="text-xs text-gray-500">
                    ~{p.predicted_leftover_avg} meals leftover · {p.risk_level} risk
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  p.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                  p.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {p.risk_level}
                </span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
