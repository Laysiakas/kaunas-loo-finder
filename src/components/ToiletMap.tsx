import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

interface Toilet {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'free' | 'paid';
  price?: number;
}

interface ToiletMapProps {
  toilets: Toilet[];
  onToiletSelect?: (toilet: Toilet) => void;
  selectedToiletId?: string;
  directionsTo?: { lat: number; lng: number } | null;
  onDirectionsCalculated?: (duration: string, distance: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  pinnedLocation?: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number } | null;
}

const ToiletMap = ({ toilets, onToiletSelect, selectedToiletId, directionsTo, onDirectionsCalculated, onMapClick, pinnedLocation, userLocation: propUserLocation }: ToiletMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const directionsRendererRef = useRef<any>(null);
  const pinnedMarkerRef = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setUserLocation({ lat: 54.8985, lng: 23.9036 });
        }
      );
    } else {
      setUserLocation({ lat: 54.8985, lng: 23.9036 });
    }
  }, []);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_SUPABASE_URL ? 'AIzaSyCXmVzAuTFb1qdjCarQHuCVhAP_GJctmBs' : '';
    
    if (!apiKey) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsMapLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !userLocation || !window.google) return;

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: userLocation,
      zoom: 14,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ],
      gestureHandling: 'greedy',
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    // Add user location marker
    new window.google.maps.Marker({
      position: userLocation,
      map: googleMapRef.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      title: 'Your Location'
    });

    // Add click listener for dropping pins
    googleMapRef.current.addListener('click', (e: any) => {
      if (onMapClick) {
        onMapClick(e.latLng.lat(), e.latLng.lng());
      }
    });
  }, [isMapLoaded, userLocation]);

  useEffect(() => {
    if (!googleMapRef.current || !window.google) return;

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    toilets.forEach((toilet) => {
      const marker = new window.google.maps.Marker({
        position: { lat: toilet.latitude, lng: toilet.longitude },
        map: googleMapRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: toilet.type === 'free' ? '#10b981' : '#f59e0b',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: toilet.name
      });

      marker.addListener('click', () => {
        onToiletSelect?.(toilet);
        googleMapRef.current?.panTo({ lat: toilet.latitude, lng: toilet.longitude });
      });

      markersRef.current.push(marker);
    });
  }, [toilets, onToiletSelect]);

  useEffect(() => {
    if (!googleMapRef.current || !selectedToiletId) return;

    const selectedToilet = toilets.find(t => t.id === selectedToiletId);
    if (selectedToilet) {
      googleMapRef.current.panTo({ 
        lat: selectedToilet.latitude, 
        lng: selectedToilet.longitude 
      });
      googleMapRef.current.setZoom(16);
    }
  }, [selectedToiletId, toilets]);

  useEffect(() => {
    if (!googleMapRef.current || !window.google || !directionsTo) {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      return;
    }

    // Use pinned location as origin if available, otherwise use user location
    const startLocation = pinnedLocation || propUserLocation || userLocation;
    
    if (!startLocation) return;

    // Clear previous directions
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }

    // Create new directions renderer
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      map: googleMapRef.current,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#0ea5e9',
        strokeWeight: 5,
      }
    });

    // Calculate route
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: startLocation,
        destination: directionsTo,
        travelMode: window.google.maps.TravelMode.WALKING,
      },
      (result: any, status: any) => {
        if (status === 'OK' && result) {
          directionsRendererRef.current?.setDirections(result);
          
          // Zoom to fit the route
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(startLocation);
          bounds.extend(directionsTo);
          googleMapRef.current?.fitBounds(bounds, { padding: 80 });
          
          // Send route info only once
          const route = result.routes[0];
          const leg = route.legs[0];
          if (onDirectionsCalculated) {
            onDirectionsCalculated(leg.duration.text, leg.distance.text);
          }
        }
      }
    );
  }, [directionsTo?.lat, directionsTo?.lng, pinnedLocation?.lat, pinnedLocation?.lng, propUserLocation?.lat, propUserLocation?.lng, userLocation?.lat, userLocation?.lng]);

  // Handle pinned location marker
  useEffect(() => {
    if (!googleMapRef.current || !window.google) return;

    // Remove previous pin
    if (pinnedMarkerRef.current) {
      pinnedMarkerRef.current.setMap(null);
      pinnedMarkerRef.current = null;
    }

    // Add new pin if location is set
    if (pinnedLocation) {
      pinnedMarkerRef.current = new window.google.maps.Marker({
        position: pinnedLocation,
        map: googleMapRef.current,
        icon: {
          url: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 24 24" fill="%23ef4444" stroke="%23ffffff" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="%23ffffff"/></svg>',
          scaledSize: new window.google.maps.Size(32, 40),
          anchor: new window.google.maps.Point(16, 40),
        },
        title: 'Search Location',
        animation: window.google.maps.Animation.DROP,
      });

      // Focus on pinned location with smooth animation
      googleMapRef.current.panTo(pinnedLocation);
      googleMapRef.current.setZoom(15);
      
      // Ensure focus by setting center after a brief delay
      setTimeout(() => {
        if (googleMapRef.current && pinnedLocation) {
          googleMapRef.current.setCenter(pinnedLocation);
        }
      }, 100);
    }
  }, [pinnedLocation]);

  return (
    <div ref={mapRef} className="relative w-full h-[400px] bg-secondary rounded-xl overflow-hidden">
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <MapPin className="h-12 w-12 text-primary mx-auto animate-pulse" />
            <p className="text-sm text-muted-foreground">{t('loading.map')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToiletMap;
