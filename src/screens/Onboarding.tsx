import { useState } from 'react';
import { Button } from '@/components/ui';

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  const slides = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v6m3-3v6m3-6v6m3-3v6m-9 6h12" />
        </svg>
      ),
      title: 'Reduce Food Waste',
      subtitle: 'Connect surplus food from events, restaurants, and temples with those who need it most.',
      bg: 'from-orange-400 to-orange-600',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: 'Four Roles, One Mission',
      subtitle: 'Donors, acceptors, volunteers, and event venues — all working together to fight hunger.',
      bg: 'from-amber-400 to-orange-600',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      title: 'Track Deliveries Live',
      subtitle: 'Volunteers collect and deliver food with real-time location tracking and AI surplus prediction.',
      bg: 'from-orange-500 to-red-600',
    },
  ];

  const current = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex justify-end p-4">
        <button onClick={onComplete} className="text-sm font-medium text-gray-400 hover:text-gray-600">
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className={`flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-to-br ${current.bg} text-white shadow-2xl mb-8 animate-scale-in`}>
          {current.icon}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-3 animate-slide-up">{current.title}</h1>
        <p className="text-base text-gray-500 text-center leading-relaxed max-w-sm animate-slide-up">{current.subtitle}</p>
      </div>

      <div className="flex justify-center gap-2 mb-8">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${i === step ? 'w-8 bg-orange-600' : 'w-2 bg-gray-300'}`}
          />
        ))}
      </div>

      <div className="px-8 pb-10 safe-bottom">
        <Button fullWidth size="lg" onClick={() => (isLast ? onComplete() : setStep(step + 1))}>
          {isLast ? 'Get Started' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
