import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NearbySearchRequest {
  latitude: number;
  longitude: number;
  radius?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, radius = 1500 }: NearbySearchRequest = await req.json();

    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.append('location', `${latitude},${longitude}`);
    url.searchParams.append('radius', radius.toString());
    url.searchParams.append('keyword', 'toilet OR restroom OR WC');
    url.searchParams.append('key', GOOGLE_MAPS_API_KEY!);

    const response = await fetch(url.toString());
    const data = await response.json();

    const toilets = data.results?.map((place: any) => ({
      name: place.name,
      address: place.vicinity,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      place_id: place.place_id,
      rating: place.rating,
    })) || [];

    return new Response(
      JSON.stringify({ toilets }),
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
