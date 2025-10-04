import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NearbySearchRequest {
  latitude: number;
  longitude: number;
  radius?: number; // in meters, default 5000 (5km)
}

interface Toilet {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  place_id?: string;
  rating?: number;
  source: 'google' | 'osm' | 'datagovlt' | 'user';
}

// Fetch from OpenStreetMap Overpass API
async function fetchOSMToilets(lat: number, lng: number, radius: number): Promise<Toilet[]> {
  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  const query = `
    [out:json];
    (
      node["amenity"="toilets"](around:${radius},${lat},${lng});
      way["amenity"="toilets"](around:${radius},${lat},${lng});
    );
    out center;
  `;

  try {
    const response = await fetch(overpassUrl, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    const data = await response.json();
    
    return (data.elements || []).map((element: any) => ({
      name: element.tags?.name || 'Public Toilet',
      address: element.tags?.['addr:street'] 
        ? `${element.tags['addr:street']} ${element.tags['addr:housenumber'] || ''}, ${element.tags['addr:city'] || 'Lithuania'}`
        : 'Lithuania',
      latitude: element.lat || element.center?.lat,
      longitude: element.lon || element.center?.lon,
      place_id: `osm_${element.type}_${element.id}`,
      source: 'osm' as const,
    })).filter((t: Toilet) => t.latitude && t.longitude);
  } catch (error) {
    // Only log in development/testing - errors are handled gracefully
    if (Deno.env.get('DENO_DEPLOYMENT_ID')) {
      console.error('OSM fetch error:', error);
    }
    return [];
  }
}

// Fetch from Google Maps API
async function fetchGoogleToilets(lat: number, lng: number, radius: number): Promise<Toilet[]> {
  if (!GOOGLE_MAPS_API_KEY) return [];

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.append('location', `${lat},${lng}`);
  url.searchParams.append('radius', radius.toString());
  url.searchParams.append('keyword', 'toilet OR restroom OR WC');
  url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    return (data.results || []).map((place: any) => ({
      name: place.name,
      address: place.vicinity,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      place_id: place.place_id,
      rating: place.rating,
      source: 'google' as const,
    }));
  } catch (error) {
    // Only log in development/testing - errors are handled gracefully
    if (Deno.env.get('DENO_DEPLOYMENT_ID')) {
      console.error('Google Maps fetch error:', error);
    }
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, radius = 5000 }: NearbySearchRequest = await req.json();

    // Validate coordinates
    if (!latitude || !longitude || 
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate radius
    if (radius < 100 || radius > 50000) {
      return new Response(
        JSON.stringify({ error: 'Radius must be between 100 and 50000 meters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch from multiple sources in parallel
    const [osmToilets, googleToilets] = await Promise.all([
      fetchOSMToilets(latitude, longitude, radius),
      fetchGoogleToilets(latitude, longitude, radius),
    ]);

    // Combine and deduplicate toilets
    const allToilets = [...osmToilets, ...googleToilets];
    
    // Remove duplicates based on proximity (within 50 meters)
    const uniqueToilets: Toilet[] = [];
    const isDuplicate = (t1: Toilet, t2: Toilet) => {
      const distance = Math.sqrt(
        Math.pow(t1.latitude - t2.latitude, 2) + 
        Math.pow(t1.longitude - t2.longitude, 2)
      ) * 111000; // Rough conversion to meters
      return distance < 50;
    };

    for (const toilet of allToilets) {
      if (!uniqueToilets.some(t => isDuplicate(t, toilet))) {
        uniqueToilets.push(toilet);
      }
    }

    return new Response(
      JSON.stringify({ toilets: uniqueToilets }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
