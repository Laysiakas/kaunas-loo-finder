import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AddToilet from "./pages/AddToilet";
import NotFound from "./pages/NotFound";

// Export helper to check if running in native mode
export const isNativeMode = () => Capacitor.isNativePlatform();


const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Handle deep link auth callback in native app
    if (isNativeMode()) {
      CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
        console.log('Deep link received:', url);
        
        // Check if this is a Supabase auth callback
        if (url.includes('#access_token=') || url.includes('?access_token=')) {
          // Extract the hash/query params from the URL
          const urlParts = url.split('#');
          const hashParams = urlParts[1] || '';
          
          // Parse the auth response
          const params = new URLSearchParams(hashParams);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          
          if (access_token && refresh_token) {
            // Set the session with the tokens
            await supabase.auth.setSession({
              access_token,
              refresh_token
            });
            console.log('Auth session set successfully');
          }
        }
      });
    }
    
    return () => {
      if (isNativeMode()) {
        CapacitorApp.removeAllListeners();
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/add-toilet" element={<AddToilet />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
