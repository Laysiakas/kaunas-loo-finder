import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

// Handle deep link authentication for native apps
if (Capacitor.isNativePlatform()) {
  CapacitorApp.addListener('appUrlOpen', async (data) => {
    const url = data.url;
    
    // Check if this is an auth callback
    if (url.includes('callback')) {
      const hashParams = new URLSearchParams(url.split('#')[1] || '');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
