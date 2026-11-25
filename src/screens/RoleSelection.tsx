import { useState } from 'react';
import { useAuth, setActiveRole } from '@/context/AuthContext';
import { Button, Card } from '@/components/ui';
import type { UserRole } from '@/types';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/types';
import { Heart, Search, Bike, Building2, ArrowRight, RefreshCw, User, LogOut } from 'lucide-react';

const ROLE_ICONS: Record<Exclude<UserRole, 'admin'>, typeof Heart> = {
  donor: Heart,
  acceptor: Search,
  volunteer: Bike,
  hall: Building2,
};

const ROLE_GRADIENTS: Record<Exclude<UserRole, 'admin'>, string> = {
  donor: 'from-orange-400 to-orange-600',
  acceptor: 'from-amber-400 to-orange-500',
  volunteer: 'from-teal-400 to-cyan-600',
  hall: 'from-orange-500 to-red-500',
};

interface RoleSelectionProps {
  onRoleSelected: (role: UserRole) => void;
}

export function RoleSelection({ onRoleSelected }: RoleSelectionProps) {
  const { profile, signOut } = useAuth();
  const [selected, setSelected] = useState<Exclude<UserRole, 'admin'> | null>(null);

  const roles: Exclude<UserRole, 'admin'>[] = ['donor', 'acceptor', 'volunteer', 'hall'];

  function handleConfirm() {
    if (!selected) return;
    setActiveRole(selected);
    onRoleSelected(selected);
  }

  function handleSwitchRole() {
    setSelected(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-white max-w-md mx-auto">
      <div className="px-6 pt-10 pb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Choose Your Role</h1>
            <p className="text-sm text-gray-500">Select how you want to participate today</p>
          </div>
          <button
            onClick={signOut}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6 text-xs text-gray-400">
          <User className="h-3.5 w-3.5" />
          <span>{profile?.email}</span>
        </div>

        <div className="space-y-3">
          {roles.map((role) => {
            const Icon = ROLE_ICONS[role];
            const isSelected = selected === role;
            return (
              <button
                key={role}
                onClick={() => setSelected(role)}
                className={`w-full text-left transition-all ${isSelected ? 'scale-[1.02]' : 'scale-100'}`}
              >
                <Card className={`flex items-center gap-4 ${isSelected ? 'border-orange-500 border-2 bg-orange-50' : 'border-gray-100'}`}>
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${ROLE_GRADIENTS[role]} text-white shadow-md shrink-0`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">{ROLE_LABELS[role]}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{ROLE_DESCRIPTIONS[role]}</p>
                  </div>
                  {isSelected && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-white">
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </Card>
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-2">
          {selected && (
            <Button fullWidth size="lg" onClick={handleConfirm}>
              Continue as {ROLE_LABELS[selected]} <ArrowRight className="h-5 w-5 ml-1 inline" />
            </Button>
          )}
          <div className="text-center">
            <button
              onClick={handleSwitchRole}
              className="text-sm text-orange-600 font-medium hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Switch role anytime
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          You can switch between roles anytime without creating a new account
        </p>
      </div>
    </div>
  );
}
