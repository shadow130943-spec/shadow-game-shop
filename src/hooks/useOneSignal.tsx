import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import OneSignal from 'react-onesignal';

// This will be your OneSignal App ID - set it in your OneSignal dashboard
// The actual value comes from the environment, but react-onesignal needs it at init time
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || 'ea765c7a-4990-44fe-bec8-50dd75c302ca';

export function useOneSignal() {
  const { user, isAdmin } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !ONESIGNAL_APP_ID) return;

    const initOneSignal = async () => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: { scope: '/' },
          serviceWorkerPath: '/OneSignalSDKWorker.js',
        });
        initialized.current = true;
      } catch (err) {
        console.error('OneSignal init error:', err);
      }
    };

    initOneSignal();
  }, []);

  useEffect(() => {
    if (!initialized.current || !user) return;

    const tagUser = async () => {
      try {
        await OneSignal.login(user.id);
        if (isAdmin) {
          await OneSignal.User.addTag('role', 'admin');
        }
      } catch (err) {
        console.error('OneSignal tag error:', err);
      }
    };

    tagUser();
  }, [user, isAdmin]);
}
