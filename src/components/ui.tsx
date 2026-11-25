import { type ReactNode } from 'react';
import { type FoodStatus, type DeliveryStatus } from '@/types';
import { STATUS_LABELS, DELIVERY_STATUS_LABELS } from '@/types';

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };
  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizes[size]} animate-spin rounded-full border-2 border-orange-200 border-t-orange-600`}
      />
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-white">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/30">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v6m3-3v6m3-6v6m3-3v6m-9 6h12" />
          </svg>
        </div>
        <Spinner size="md" />
        <p className="text-sm text-orange-700 font-medium">Loading UVAI...</p>
      </div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  fullWidth,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit';
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}) {
  const variants = {
    primary: 'bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800 shadow-sm shadow-orange-600/20',
    secondary: 'bg-orange-100 text-orange-700 hover:bg-orange-200 active:bg-orange-300',
    outline: 'border-2 border-orange-600 text-orange-700 hover:bg-orange-50 active:bg-orange-100',
    ghost: 'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
    danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm shadow-red-500/20',
  };
  const sizes = {
    sm: 'px-3 py-2 text-sm rounded-lg',
    md: 'px-4 py-3 text-sm rounded-xl',
    lg: 'px-6 py-3.5 text-base rounded-xl',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-white p-4 shadow-sm border border-gray-100 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function StatusBadge({ status }: { status: FoodStatus }) {
  const colors: Record<FoodStatus, string> = {
    available: 'bg-orange-100 text-orange-700',
    requested: 'bg-amber-100 text-amber-700',
    accepted: 'bg-blue-100 text-blue-700',
    assigned: 'bg-cyan-100 text-cyan-700',
    ready_for_pickup: 'bg-teal-100 text-teal-700',
    collected: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
    expired: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colors[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const colors: Record<DeliveryStatus, string> = {
    assigned: 'bg-cyan-100 text-cyan-700',
    picked_up: 'bg-blue-100 text-blue-700',
    in_transit: 'bg-amber-100 text-amber-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colors[status]}`}>
      {DELIVERY_STATUS_LABELS[status]}
    </span>
  );
}

export function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  error,
  multiline,
  rows = 3,
  min,
  max,
  step,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  multiline?: boolean;
  rows?: number;
  min?: string;
  max?: string;
  step?: string;
}) {
  const baseClass = `w-full px-4 py-3 rounded-xl border bg-white text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
    error ? 'border-red-300' : 'border-gray-200'
  }`;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className={baseClass}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          step={step}
          className={baseClass}
        />
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`w-full px-4 py-3 rounded-xl border bg-white text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
          error ? 'border-red-300' : 'border-gray-200'
        }`}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function EmptyState({ icon, title, subtitle, action }: { icon: ReactNode; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 text-orange-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-400 mb-3">
        <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
        </svg>
      </div>
      <p className="text-sm text-gray-600 mb-3">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />
      <div
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto animate-slide-up safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-500" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'error' | 'info'; onClose: () => void }) {
  const colors = {
    success: 'bg-orange-600',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] animate-slide-up safe-top">
      <div className={`${colors[type]} text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-[90vw]`}>
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="opacity-80 hover:opacity-100">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  danger = false,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl p-6 mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 mb-5">{message}</p>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} fullWidth onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
