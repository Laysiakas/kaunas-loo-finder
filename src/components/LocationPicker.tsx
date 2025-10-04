import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "./ui/card";

// Declare google maps types
declare global {
  interface Window {
    google: any;
  }
}

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}

const LocationPicker = ({ onLocationSelect, initialLat, initialLng }: LocationPickerProps) => {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const geocoderRef = useRef<any>(null);

  useEffect(() => {
    // Check if script already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true));
      return;
    }

    const apiKey = import.meta.env.VITE_SUPABASE_URL ? 'AIzaSyCXmVzAuTFb1qdjCarQHuCVhAP_GJctmBs' : '';
    if (!apiKey) return;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const defaultCenter = { 
      lat: initialLat || 54.8985, 
      lng: initialLng || 23.9036 
    };

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 15,
      mapTypeControl: false,
    });

    geocoderRef.current = new window.google.maps.Geocoder();

    // Add initial marker if coordinates provided
    if (initialLat && initialLng) {
      markerRef.current = new window.google.maps.Marker({
        position: defaultCenter,
        map: mapInstanceRef.current,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
      });

      markerRef.current.addListener("dragend", handleMarkerDragEnd);
    }

    // Add click listener to place marker
    mapInstanceRef.current.addListener("click", (e: any) => {
      if (e.latLng) {
        placeMarker(e.latLng);
      }
    });
  }, [isLoaded, initialLat, initialLng]);

  const handleMarkerDragEnd = () => {
    if (markerRef.current) {
      const position = markerRef.current.getPosition();
      if (position) {
        getAddressFromLatLng(position.lat(), position.lng());
      }
    }
  };

  const placeMarker = (location: any) => {
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    markerRef.current = new window.google.maps.Marker({
      position: location,
      map: mapInstanceRef.current,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
    });

    markerRef.current.addListener("dragend", handleMarkerDragEnd);

    getAddressFromLatLng(location.lat(), location.lng());
  };

  const getAddressFromLatLng = (lat: number, lng: number) => {
    if (!geocoderRef.current) return;

    geocoderRef.current.geocode(
      { location: { lat, lng } },
      (results, status) => {
        if (status === "OK" && results && results[0]) {
          onLocationSelect(lat, lng, results[0].formatted_address);
        } else {
          onLocationSelect(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      }
    );
  };

  return (
    <Card className="p-4 space-y-2">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{t('addToilet.pinLocation')}</h3>
        <p className="text-xs text-muted-foreground">
          {t('addToilet.pinLocationDesc')}
        </p>
      </div>
      <div 
        ref={mapRef} 
        className="w-full h-[400px] rounded-md border"
      />
    </Card>
  );
};

export default LocationPicker;
