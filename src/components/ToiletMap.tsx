import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
}

const ToiletMap = ({ toilets, onToiletSelect, selectedToiletId }: ToiletMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Default to Kaunas center if geolocation fails
          setUserLocation({ lat: 54.8985, lng: 23.9036 });
        }
      );
    } else {
      setUserLocation({ lat: 54.8985, lng: 23.9036 });
    }
  }, []);

  // For now, show a simple map placeholder
  // In production, integrate with Google Maps or Mapbox
  return (
    <div ref={mapRef} className="relative w-full h-[400px] bg-secondary rounded-xl overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-2">
          <MapPin className="h-12 w-12 text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">
            Map integration will be added
          </p>
          <p className="text-xs text-muted-foreground">
            {userLocation ? `Location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Getting location...'}
          </p>
        </div>
      </div>
      
      {/* Toilet markers overlay */}
      <div className="absolute top-4 left-4 space-y-2 max-h-[calc(100%-2rem)] overflow-y-auto">
        {toilets.slice(0, 5).map((toilet) => (
          <button
            key={toilet.id}
            onClick={() => onToiletSelect?.(toilet)}
            className={`flex items-center gap-2 px-3 py-2 bg-card rounded-lg shadow-lg hover:shadow-xl transition-all ${
              selectedToiletId === toilet.id ? 'ring-2 ring-primary' : ''
            }`}
          >
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="text-left text-sm">
              <div className="font-medium">{toilet.name}</div>
              <Badge variant={toilet.type === 'free' ? 'default' : 'secondary'} className="text-xs">
                {toilet.type === 'free' ? 'Free' : `€${toilet.price}`}
              </Badge>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ToiletMap;
