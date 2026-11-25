import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, Spinner, EmptyState } from '@/components/ui';
import { type FoodDonation } from '@/types';
import { estimateKg } from '@/lib/utils';
import { TrendingUp, UtensilsCrossed, CheckCircle2, Leaf, Award, ArrowLeft, BarChart3 } from 'lucide-react';

export function ImpactDashboard({ onBack }: { onBack: () => void }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [allDonations, setAllDonations] = useState<FoodDonation[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: all } = await supabase
      .from('food_donations')
      .select('*')
      .order('created_at', { ascending: false });
    setAllDonations((all as FoodDonation[]) || []);

    if (profile?.role === 'donor') {
      const { data: mine } = await supabase
        .from('food_donations')
        .select('*')
        .eq('donor_id', profile.id)
        .order('created_at', { ascending: false });
      setDonations((mine as FoodDonation[]) || []);
    } else {
      setDonations((all as FoodDonation[]) || []);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const totalDonations = donations.length;
  const completed = donations.filter((d) => d.status === 'completed').length;
  const active = donations.filter((d) => ['available', 'requested', 'accepted', 'ready_for_pickup', 'collected'].includes(d.status)).length;

  const totalKg = donations
    .filter((d) => d.status === 'completed')
    .reduce((sum, d) => sum + estimateKg(d.quantity, d.quantity_unit), 0);

  const allTotalKg = allDonations
    .filter((d) => d.status === 'completed')
    .reduce((sum, d) => sum + estimateKg(d.quantity, d.quantity_unit), 0);

  const platformCompleted = allDonations.filter((d) => d.status === 'completed').length;

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d;
  });

  const monthlyStats = last6Months.map((month) => {
    const monthDonations = donations.filter((d) => {
      const dd = new Date(d.created_at);
      return dd.getMonth() === month.getMonth() && dd.getFullYear() === month.getFullYear();
    });
    return {
      month: month.toLocaleString('default', { month: 'short' }),
      total: monthDonations.length,
      completed: monthDonations.filter((d) => d.status === 'completed').length,
    };
  });

  const maxMonthly = Math.max(...monthlyStats.map((m) => m.total), 1);

  const mealsServed = Math.round(totalKg / 0.4);

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Impact Dashboard</h1>
          <p className="text-sm text-gray-500">See the difference you're making</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-600 to-red-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-600/20 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Leaf className="h-5 w-5" />
          <p className="text-sm font-medium text-orange-100">Food Waste Prevented</p>
        </div>
        <p className="text-4xl font-bold">{totalKg.toFixed(1)} kg</p>
        <p className="text-sm text-orange-100 mt-2">
          That's approximately {mealsServed} meals served!
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatTile icon={<UtensilsCrossed className="h-5 w-5" />} label="Donations" value={totalDonations} />
        <StatTile icon={<CheckCircle2 className="h-5 w-5" />} label="Completed" value={completed} />
        <StatTile icon={<TrendingUp className="h-5 w-5" />} label="Active" value={active} />
      </div>

      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-orange-600" />
          <p className="font-semibold text-gray-900">Monthly Donations</p>
        </div>
        <div className="flex items-end justify-between gap-2 h-32">
          {monthlyStats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div className="flex flex-col items-center w-full">
                <div
                  className="w-full max-w-[32px] rounded-t-lg bg-orange-500 transition-all"
                  style={{ height: `${(stat.total / maxMonthly) * 100}px` }}
                />
                <div
                  className="w-full max-w-[32px] rounded-b-lg bg-orange-200"
                  style={{ height: `${(stat.completed / maxMonthly) * 100}px` }}
                />
              </div>
              <p className="text-xs text-gray-500">{stat.month}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500" /> Total
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-200" /> Completed
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="text-center">
          <Award className="h-8 w-8 text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{completed}</p>
          <p className="text-xs text-gray-500">Lives Touched</p>
        </Card>
        <Card className="text-center">
          <Leaf className="h-8 w-8 text-orange-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{(totalKg * 2.5).toFixed(0)}</p>
          <p className="text-xs text-gray-500">kg CO₂ Saved</p>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <p className="font-semibold text-orange-800 mb-1">Platform Impact</p>
        <p className="text-sm text-orange-600">
          The UVAI community has completed {platformCompleted} donations and saved {allTotalKg.toFixed(1)} kg of food from going to waste.
        </p>
      </Card>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 mx-auto mb-2">
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </Card>
  );
}
