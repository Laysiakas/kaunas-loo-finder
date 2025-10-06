import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.kaunasloofinder',
  appName: 'Kaunas Loo Finder',
  webDir: 'dist',
  server: {
    url: 'https://37513d19-f032-4b07-b950-c1adc2fb2cd3.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    CapacitorApp: {
      appUrlScheme: 'com.example.kaunasloofinder'
    }
  }
};

export default config;
