import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, List, Plus, Search, User, LogOut, Filter, Star, Navigation2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ToiletMap from '@/components/ToiletMap';
import ToiletCard from '@/components/ToiletCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  const handleViewDetails = (toilet: any) => {
    setSelectedToilet(toilet);
    setDetailsOpen(true);
  };

  const handleGetDirections = (toilet: any) => {
    const coords = `${toilet.latitude},${toilet.longitude}`;
    navigator.clipboard.writeText(coords);
    toast({
      title: 'Coordinates Copied!',
      description: `${coords} - Open your maps app and paste these coordinates`,
    });
  };

  const copyCoordinates = () => {
    if (selectedToilet) {
      const coords = `${selectedToilet.latitude},${selectedToilet.longitude}`;
      navigator.clipboard.writeText(coords);
      toast({
        title: 'Coordinates Copied!',
        description: coords,
      });
    }
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
                      onViewDetails={() => handleViewDetails(toilet)}
                      onGetDirections={() => handleGetDirections(toilet)}
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
                    onViewDetails={() => handleViewDetails(toilet)}
                    onGetDirections={() => handleGetDirections(toilet)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Toilet Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          {selectedToilet && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <SheetTitle className="text-2xl">{selectedToilet.name}</SheetTitle>
                    <SheetDescription className="flex items-center gap-1 mt-2">
                      <MapPin className="h-4 w-4" />
                      {selectedToilet.address}
                    </SheetDescription>
                  </div>
                  <Badge 
                    variant={selectedToilet.type === 'free' ? 'default' : 'secondary'}
                    className={selectedToilet.type === 'free' ? 'bg-success text-lg px-4 py-2' : 'bg-warning text-lg px-4 py-2'}
                  >
                    {selectedToilet.type === 'free' ? 'Free' : `€${selectedToilet.price}`}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {selectedToilet.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground">{selectedToilet.description}</p>
                  </div>
                )}

                {selectedToilet.opening_hours && (
                  <div>
                    <h3 className="font-semibold mb-2">Opening Hours</h3>
                    <p className="text-muted-foreground">{selectedToilet.opening_hours}</p>
                  </div>
                )}

                {selectedToilet.accessibility_features && selectedToilet.accessibility_features.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Accessibility Features</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedToilet.accessibility_features.map((feature: string, idx: number) => (
                        <Badge key={idx} variant="outline">{feature}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Location</h3>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={copyCoordinates}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Coordinates: {selectedToilet.latitude.toFixed(6)}, {selectedToilet.longitude.toFixed(6)}
                    </Button>
                    <Button 
                      className="w-full"
                      onClick={() => handleGetDirections(selectedToilet)}
                    >
                      <Navigation2 className="h-4 w-4 mr-2" />
                      Get Directions
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Index;
