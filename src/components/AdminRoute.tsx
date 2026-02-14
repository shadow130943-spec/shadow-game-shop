import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  useEffect(() => {
    if (!user) {
      setStatus('unauthorized');
      return;
    }

    supabase.functions
      .invoke('admin-actions', { body: { action: 'verify_admin' } })
      .then(({ data, error }) => {
        if (error || data?.error) {
          setStatus('unauthorized');
        } else {
          setStatus('authorized');
        }
      })
      .catch(() => setStatus('unauthorized'));
  }, [user]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse font-gaming text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
