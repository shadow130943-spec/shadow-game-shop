import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: React.ReactNode;
  /** If true, users with the "reseller" role can also access this route. */
  allowReseller?: boolean;
}

export default function AdminRoute({ children, allowReseller = false }: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  useEffect(() => {
    if (!user) {
      setStatus('unauthorized');
      return;
    }

    const action = allowReseller ? 'verify_admin_or_reseller' : 'verify_admin';
    supabase.functions
      .invoke('admin-actions', { body: { action } })
      .then(({ data, error }) => {
        if (error || data?.error) {
          setStatus('unauthorized');
        } else {
          setStatus('authorized');
        }
      })
      .catch(() => setStatus('unauthorized'));
  }, [user, allowReseller]);

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
