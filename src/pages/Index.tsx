import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, List, Plus, Search, User, LogOut, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ToiletMap from '@/components/ToiletMap';
import ToiletCard from '@/components/ToiletCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [toilets, setToilets] = useState<any[]>([]);
  const [nearbyToilets, setNearbyToilets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [selectedToilet, setSelectedToilet] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchToilets();
      getUserLocation();
    }
  }, [user]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          fetchNearbyToilets(location.lat, location.lng);
        },
        () => {
          const defaultLocation = { lat: 54.8985, lng: 23.9036 };
          setUserLocation(defaultLocation);
          fetchNearbyToilets(defaultLocation.lat, defaultLocation.lng);
        }
      );
    } else {
      const defaultLocation = { lat: 54.8985, lng: 23.9036 };
      setUserLocation(defaultLocation);
      fetchNearbyToilets(defaultLocation.lat, defaultLocation.lng);
    }
  };

  const fetchNearbyToilets = async (latitude: number, longitude: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-nearby-toilets', {
        body: { latitude, longitude, radius: 2000 }
      });

      if (error) throw error;
      
      const formattedToilets = data?.toilets?.map((toilet: any) => ({
        id: toilet.place_id,
        name: toilet.name,
        address: toilet.address,
        latitude: toilet.latitude,
        longitude: toilet.longitude,
        type: 'free',
        rating: toilet.rating,
      })) || [];
      
      setNearbyToilets(formattedToilets);
    } catch (error: any) {
      console.error('Error fetching nearby toilets:', error);
    }
  };

  const fetchToilets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('toilets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setToilets(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const getFilteredToilets = () => {
    const allToilets = [...toilets, ...nearbyToilets];
    let filtered = allToilets;

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredToilets = getFilteredToilets();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">CityP</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate('/add-toilet')}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Toilet</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Search and Filter */}
      <div className="container mx-auto px-4 py-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search toilets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
          >
            All
          </Button>
          <Button
            variant={typeFilter === 'free' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('free')}
            className={typeFilter === 'free' ? 'bg-success hover:bg-success/90' : ''}
          >
            Free
          </Button>
          <Button
            variant={typeFilter === 'paid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('paid')}
            className={typeFilter === 'paid' ? 'bg-warning hover:bg-warning/90' : ''}
          >
            Paid
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-6">
        <Tabs defaultValue="map" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="map" className="gap-2">
              <MapPin className="h-4 w-4" />
              Map
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              List
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="map" className="space-y-4">
            <ToiletMap
              toilets={filteredToilets}
              onToiletSelect={setSelectedToilet}
              selectedToiletId={selectedToilet?.id}
            />
            
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            )}
            
            {!loading && filteredToilets.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No toilets found</p>
              </div>
            )}
            
            {!loading && filteredToilets.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">
                  Nearby Toilets ({filteredToilets.length})
                </h2>
                <div className="grid gap-3">
                  {filteredToilets.slice(0, 5).map((toilet) => (
                    <ToiletCard
                      key={toilet.id}
                      toilet={toilet}
                      onGetDirections={() => {
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${toilet.latitude},${toilet.longitude}`,
                          '_blank'
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="list" className="space-y-3">
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            )}
            
            {!loading && filteredToilets.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No toilets found</p>
                <Button onClick={() => navigate('/add-toilet')} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Toilet
                </Button>
              </div>
            )}
            
            {!loading && filteredToilets.length > 0 && (
              <div className="grid gap-3">
                {filteredToilets.map((toilet) => (
                  <ToiletCard
                    key={toilet.id}
                    toilet={toilet}
                    onGetDirections={() => {
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${toilet.latitude},${toilet.longitude}`,
                        '_blank'
                      );
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
