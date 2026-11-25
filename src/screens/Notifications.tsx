import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, Spinner, EmptyState, Button } from '@/components/ui';
import { type Notification } from '@/types';
import { timeAgo } from '@/lib/utils';
import { Bell, CheckCheck, Trash2, ArrowLeft } from 'lucide-react';

export function Notifications({ onBack }: { onBack: () => void }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadNotifications = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function markAllRead() {
    if (!profile) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    loadNotifications();
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    loadNotifications();
  }

  async function deleteNotification(id: string) {
    await supabase.from('notifications').delete().eq('id', id);
    loadNotifications();
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-orange-600 font-medium">{unreadCount} unread</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title="No notifications"
          subtitle="You'll be notified about reservation requests and updates here"
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`flex items-start gap-3 ${!n.is_read ? 'border-orange-200 bg-orange-50' : ''}`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
                n.is_read ? 'bg-gray-100 text-gray-400' : 'bg-orange-600 text-white'
              }`}>
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.is_read ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>
                  {n.title}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
              </div>
              <div className="flex flex-col gap-1">
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)} className="p-1.5 rounded-lg hover:bg-white/50 text-orange-600">
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => deleteNotification(n.id)} className="p-1.5 rounded-lg hover:bg-white/50 text-gray-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
