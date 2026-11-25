import { useState, useEffect } from 'react';
import { useAuth, getActiveRole } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Onboarding } from '@/screens/Onboarding';
import { AuthScreen } from '@/screens/AuthScreen';
import { RoleSelection } from '@/screens/RoleSelection';
import { DonorDashboard } from '@/screens/DonorDashboard';
import { AcceptorDashboard } from '@/screens/AcceptorDashboard';
import { VolunteerDashboard } from '@/screens/VolunteerDashboard';
import { HallDashboard } from '@/screens/HallDashboard';
import { AddDonation } from '@/screens/AddDonation';
import { FoodDetail } from '@/screens/FoodDetail';
import { DeliveryTracking } from '@/screens/DeliveryTracking';
import { AIPredictionScreen } from '@/screens/AIPredictionScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { ImpactDashboard } from '@/screens/ImpactDashboard';
import { Notifications } from '@/screens/Notifications';
import { AdminDashboard } from '@/screens/AdminDashboard';
import { InfoPage } from '@/screens/InfoPage';
import { QRCodeScreen } from '@/screens/QRCodeScreen';
import { FullPageLoader } from '@/components/ui';
import type { UserRole } from '@/types';
import { Home, Search, Plus, User, ClipboardList, Shield, BarChart3, Bike, Building2, Bell, Brain, Heart, QrCode } from 'lucide-react';

const ONBOARDING_KEY = 'uvai-onboarded';

export default function App() {
  const { session, profile, loading } = useAuth();
  const [onboarded, setOnboarded] = useState(false);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [screen, setScreen] = useState<string>('dashboard');
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(ONBOARDING_KEY);
    if (stored) setOnboarded(true);
    const role = getActiveRole() as UserRole | null;
    if (role) setActiveRole(role);
  }, []);

  useEffect(() => {
    if (profile && activeRole) {
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)
        .then(({ count }) => setUnreadCount(count || 0));
    }
  }, [profile, activeRole, screen]);

  function navigate(tab: string) {
    if (tab.startsWith('food-detail:')) {
      const id = tab.split(':')[1];
      setSelectedDonationId(id);
      setScreen('food-detail');
    } else if (tab.startsWith('track:')) {
      const id = tab.split(':')[1];
      setSelectedDonationId(id);
      setScreen('track');
    } else {
      setScreen(tab);
    }
  }

  function handleRoleSelected(role: UserRole) {
    setActiveRole(role);
    setScreen('dashboard');
  }

  function handleSwitchRole() {
    setActiveRole(null);
  }

  if (loading) return <FullPageLoader />;

  if (!onboarded) {
    return <Onboarding onComplete={() => { localStorage.setItem(ONBOARDING_KEY, 'true'); setOnboarded(true); }} />;
  }

  if (!session || !profile) {
    return <AuthScreen />;
  }

  // Role selection screen (shown when no active role)
  if (!activeRole) {
    return <RoleSelection onRoleSelected={handleRoleSelected} />;
  }

  const role = activeRole;

  // Parse food-detail / track navigation
  const navItems = getNavItems(role, unreadCount);
  const showBottomNav = ['dashboard', 'marketplace', 'add-donation', 'reservations', 'profile', 'admin', 'ai-prediction', 'qr-code', 'notifications', 'my-donations', 'impact'].includes(screen) ||
    (role === 'volunteer' && screen === 'dashboard') ||
    (role === 'hall' && screen === 'dashboard');

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
          {/* Dashboard per role */}
          {screen === 'dashboard' && role === 'donor' && <DonorDashboard onNavigate={navigate} />}
          {screen === 'dashboard' && role === 'acceptor' && <AcceptorDashboard onNavigate={navigate} />}
          {screen === 'dashboard' && role === 'volunteer' && <VolunteerDashboard onNavigate={navigate} />}
          {screen === 'dashboard' && role === 'hall' && <HallDashboard onNavigate={navigate} />}
          {screen === 'dashboard' && role === 'admin' && <AdminDashboard onSelectDonation={(id) => navigate(`food-detail:${id}`)} />}

          {/* Donor: my-donations view */}
          {screen === 'my-donations' && role === 'donor' && <DonorDashboard onNavigate={navigate} />}

          {/* Marketplace (acceptor browse) */}
          {screen === 'marketplace' && role === 'acceptor' && <AcceptorDashboard onNavigate={navigate} />}

          {/* Add donation (donor only) */}
          {screen === 'add-donation' && role === 'donor' && (
            <AddDonation onBack={() => setScreen('dashboard')} onSuccess={() => setScreen('dashboard')} />
          )}

          {/* Food detail */}
          {screen === 'food-detail' && selectedDonationId && (
            <FoodDetail donationId={selectedDonationId} onBack={() => setScreen('dashboard')} onNavigate={navigate} />
          )}

          {/* Delivery tracking */}
          {screen === 'track' && selectedDonationId && (
            <DeliveryTracking foodId={selectedDonationId} onBack={() => setScreen('dashboard')} />
          )}

          {/* AI prediction */}
          {screen === 'ai-prediction' && <AIPredictionScreen onBack={() => setScreen('profile')} />}

          {/* Reservations (legacy, for acceptor requests view) */}
          {screen === 'reservations' && role === 'acceptor' && <AcceptorDashboard onNavigate={navigate} />}

          {/* Profile */}
          {screen === 'profile' && <ProfileScreen onNavigate={navigate} onSwitchRole={handleSwitchRole} />}

          {/* Impact */}
          {screen === 'impact' && <ImpactDashboard onBack={() => setScreen('profile')} />}

          {/* Notifications */}
          {screen === 'notifications' && <Notifications onBack={() => setScreen('dashboard')} />}

          {/* Admin */}
          {screen === 'admin' && role === 'admin' && <AdminDashboard onSelectDonation={(id) => navigate(`food-detail:${id}`)} />}

          {/* FAQ & Privacy */}
          {screen === 'faq' && <InfoPage type="faq" onBack={() => setScreen('profile')} />}
          {screen === 'privacy' && <InfoPage type="privacy" onBack={() => setScreen('profile')} />}

          {/* QR Code */}
          {screen === 'qr-code' && <QRCodeScreen onBack={() => setScreen('profile')} />}
        </div>

        {showBottomNav && (
          <BottomNav items={navItems} active={screen} onNavigate={navigate} />
        )}
      </div>
    </div>
  );
}

function getNavItems(role: UserRole, unreadCount: number) {
  if (role === 'donor') {
    return [
      { key: 'dashboard', label: 'Home', icon: Home },
      { key: 'add-donation', label: 'Add', icon: Plus, primary: true },
      { key: 'my-donations', label: 'My Food', icon: ClipboardList },
      { key: 'notifications', label: 'Alerts', icon: Bell, badge: unreadCount },
      { key: 'profile', label: 'Profile', icon: User },
    ];
  }
  if (role === 'acceptor') {
    return [
      { key: 'dashboard', label: 'Home', icon: Home },
      { key: 'marketplace', label: 'Browse', icon: Search },
      { key: 'reservations', label: 'Requests', icon: ClipboardList, badge: unreadCount },
      { key: 'profile', label: 'Profile', icon: User },
    ];
  }
  if (role === 'volunteer') {
    return [
      { key: 'dashboard', label: 'Deliveries', icon: Bike },
      { key: 'notifications', label: 'Alerts', icon: Bell, badge: unreadCount },
      { key: 'profile', label: 'Profile', icon: User },
    ];
  }
  if (role === 'hall') {
    return [
      { key: 'dashboard', label: 'Events', icon: Building2 },
      { key: 'ai-prediction', label: 'AI Predict', icon: Brain },
      { key: 'notifications', label: 'Alerts', icon: Bell, badge: unreadCount },
      { key: 'profile', label: 'Profile', icon: User },
    ];
  }
  return [
    { key: 'dashboard', label: 'Home', icon: Home },
    { key: 'admin', label: 'Manage', icon: Shield },
    { key: 'impact', label: 'Impact', icon: BarChart3 },
    { key: 'profile', label: 'Profile', icon: User },
  ];
}

function BottomNav({
  items,
  active,
  onNavigate,
}: {
  items: { key: string; label: string; icon: typeof Home; primary?: boolean; badge?: number }[];
  active: string;
  onNavigate: (key: string) => void;
}) {
  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-100 safe-bottom z-40">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key || (item.key === 'dashboard' && active === 'my-donations');
          if (item.primary) {
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className="flex flex-col items-center -mt-6"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/30 active:scale-95 transition-transform">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-orange-600 mt-1">{item.label}</span>
              </button>
            );
          }
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-orange-600' : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
