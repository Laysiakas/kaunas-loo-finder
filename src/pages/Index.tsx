import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, List, Plus, Search, User, LogOut, Filter, Star, Navigation2, Copy, Clock, ArrowUpDown, X, Smartphone, Languages, Crosshair } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ToiletMap from '@/components/ToiletMap';
import ToiletCard from '@/components/ToiletCard';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [toilets, setToilets] = useState<any[]>([]);
  const [nearbyToilets, setNearbyToilets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance');
  const [selectedToilet, setSelectedToilet] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [directionsTo, setDirectionsTo] = useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ duration: string; distance: string } | null>(null);
  const [pinnedLocation, setPinnedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [addressSearch, setAddressSearch] = useState('');

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
          // Default to Vilnius (capital of Lithuania) if geolocation fails
          const defaultLocation = { lat: 54.6872, lng: 25.2797 };
          setUserLocation(defaultLocation);
          fetchNearbyToilets(defaultLocation.lat, defaultLocation.lng);
        }
      );
    } else {
      // Default to Vilnius (capital of Lithuania)
      const defaultLocation = { lat: 54.6872, lng: 25.2797 };
      setUserLocation(defaultLocation);
      fetchNearbyToilets(defaultLocation.lat, defaultLocation.lng);
    }
  };

  const fetchNearbyToilets = async (latitude: number, longitude: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-nearby-toilets', {
        body: { latitude, longitude, radius: 5000 } // 5km radius
      });

      if (error) throw error;
      
      const formattedToilets = data?.toilets?.map((toilet: any) => ({
        id: toilet.place_id,
        name: toilet.name,
        address: toilet.address,
        latitude: toilet.latitude,
        longitude: toilet.longitude,
        type: 'free',
        rating: toilet.rating || 0,
        distance: userLocation ? calculateDistance(
          userLocation.lat,
          userLocation.lng,
          toilet.latitude,
          toilet.longitude
        ) : 0,
      })) || [];
      
      setNearbyToilets(formattedToilets);
    } catch (error: any) {
      console.error('Error fetching nearby toilets:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
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
    // Use pinned location for distance calculation if available, otherwise use user location
    const referenceLocation = pinnedLocation || userLocation;
    
    if (!referenceLocation) return [];

    const allToilets = [...toilets, ...nearbyToilets].map(toilet => {
      const distance = calculateDistance(
        referenceLocation.lat,
        referenceLocation.lng,
        toilet.latitude,
        toilet.longitude
      );
      return {
        ...toilet,
        distance
      };
    });

    // Filter to only show toilets within 5km radius
    let filtered = allToilets.filter(t => (t.distance || 0) <= 5);

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by distance or rating
    if (sortBy === 'distance') {
      filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    // Return all toilets within radius (no limit)
    return filtered;
  };

  const handleViewDetails = (toilet: any) => {
    setSelectedToilet(toilet);
    setDetailsOpen(true);
  };

  const handleMarkerClick = (toilet: any) => {
    setSelectedToilet(toilet);
    setDetailsOpen(true);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setPinnedLocation({ lat, lng });
    fetchNearbyToilets(lat, lng);
  };

  const handleAddressSearch = async () => {
    if (!addressSearch.trim()) return;

    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ address: addressSearch }, (results: any, status: any) => {
        if (status === 'OK' && results[0]) {
          const location = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          };
          setPinnedLocation(location);
          fetchNearbyToilets(location.lat, location.lng);
          toast({
            title: t('search.locationFound'),
            description: results[0].formatted_address,
          });
        } else {
          toast({
            title: t('search.locationNotFound'),
            description: t('search.tryDifferentAddress'),
            variant: 'destructive',
          });
        }
      });
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const handleClearPin = () => {
    setPinnedLocation(null);
    if (userLocation) {
      fetchNearbyToilets(userLocation.lat, userLocation.lng);
    }
  };

  const handleFocusMyLocation = () => {
    setPinnedLocation(null);
    if (userLocation) {
      fetchNearbyToilets(userLocation.lat, userLocation.lng);
      // Trigger map to pan to user location by updating a state or similar
      toast({
        title: t('location.focusedOnYou'),
        description: t('location.showingNearbyToilets'),
      });
    }
  };

  const handleGetDirections = (toilet: any) => {
    setDirectionsTo({ lat: toilet.latitude, lng: toilet.longitude });
    setSelectedToilet(toilet);
    setDetailsOpen(false);
    setRouteInfo(null);
  };

  const handleCancelNavigation = () => {
    setDirectionsTo(null);
    setRouteInfo(null);
  };

  const openInGoogleMaps = (toilet: any) => {
    const startLocation = pinnedLocation || userLocation;
    
    if (!startLocation) {
      toast({
        title: t('location.required'),
        description: t('location.enableServices'),
        variant: 'destructive',
      });
      return;
    }

    const destination = `${toilet.latitude},${toilet.longitude}`;
    const origin = `${startLocation.lat},${startLocation.lng}`;
    
    // Detect platform
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;
    
    // On desktop, just copy coordinates instead of trying to open Google Maps
    if (!isMobile) {
      navigator.clipboard.writeText(destination);
      toast({
        title: t('location.coordinatesCopied'),
        description: `${destination} - ${t('location.useInApp')}`,
      });
      return;
    }
    
    // Mobile deep linking - platform specific
    if (isIOS) {
      // Use Apple Maps for iOS devices
      window.location.href = `maps://?saddr=${origin}&daddr=${destination}&dirflg=w`;
      toast({
        title: t('navigation.openingAppleMaps'),
        description: t('navigation.launching'),
      });
    } else if (isAndroid) {
      // Use Google Maps for Android devices
      window.location.href = `google.navigation:q=${destination}&mode=w`;
      
      // Fallback to geo intent if Google Maps navigation doesn't work
      setTimeout(() => {
        window.location.href = `geo:0,0?q=${destination}(${encodeURIComponent(toilet.name)})`;
      }, 500);
      
      toast({
        title: t('navigation.openingGoogleMaps'),
        description: t('navigation.launching'),
      });
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    toast({
      title: t('settings.language'),
      description: lng === 'lt' ? t('settings.lithuanian') : t('settings.english'),
    });
  };

  const copyCoordinates = () => {
    if (selectedToilet) {
      const locationInfo = `${selectedToilet.name}\n${selectedToilet.address}\n${t('details.coordinates')}: ${selectedToilet.latitude},${selectedToilet.longitude}`;
      navigator.clipboard.writeText(locationInfo);
      toast({
        title: t('location.copied'),
        description: t('location.addressCopied'),
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
            <h1 className="text-xl font-bold">{t('app.name')}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            
            <Button
              size="sm"
              onClick={() => navigate('/add-toilet')}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('nav.addToilet')}</span>
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
                  {t('nav.signOut')}
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
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 items-center flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
          >
            {t('filter.all')}
          </Button>
          <Button
            variant={typeFilter === 'free' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('free')}
            className={typeFilter === 'free' ? 'bg-success hover:bg-success/90' : ''}
          >
            {t('filter.free')}
          </Button>
          <Button
            variant={typeFilter === 'paid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('paid')}
            className={typeFilter === 'paid' ? 'bg-warning hover:bg-warning/90' : ''}
          >
            {t('filter.paid')}
          </Button>

          <div className="w-px h-6 bg-border mx-1" />
          
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={sortBy === 'distance' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('distance')}
          >
            {t('filter.distance')}
          </Button>
          <Button
            variant={sortBy === 'rating' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('rating')}
          >
            {t('filter.rating')}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-6">
        {!directionsTo ? (
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
              {/* Address Search */}
              <div className="bg-card p-4 rounded-lg border space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder={t('search.enterAddress')}
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
                    className="flex-1"
                  />
                  <Button onClick={handleAddressSearch} size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={handleFocusMyLocation} 
                    size="sm" 
                    variant="outline"
                    title={t('location.focusMyLocation')}
                  >
                    <Crosshair className="h-4 w-4" />
                  </Button>
                  {pinnedLocation && (
                    <Button onClick={handleClearPin} size="sm" variant="outline">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {pinnedLocation && (
                  <p className="text-sm text-muted-foreground">
                    {t('search.showingResultsFor')}: {pinnedLocation.lat.toFixed(5)}, {pinnedLocation.lng.toFixed(5)}
                  </p>
                )}
              </div>

              <ToiletMap
                toilets={filteredToilets}
                onToiletSelect={handleMarkerClick}
                selectedToiletId={selectedToilet?.id}
                directionsTo={directionsTo}
                onDirectionsCalculated={(duration, distance) => {
                  setRouteInfo({ duration, distance });
                }}
                onMapClick={handleMapClick}
                pinnedLocation={pinnedLocation}
                userLocation={userLocation}
              />
              
              {loading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              )}
              
              {!loading && filteredToilets.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{t('search.noResults')}</p>
                </div>
              )}
              
              {!loading && filteredToilets.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">
                    {pinnedLocation 
                      ? `${t('toilet.within5km')} (${filteredToilets.length})`
                      : `${t('toilet.nearby')} (${filteredToilets.length})`
                    }
                  </h2>
                  <div className="grid gap-3 max-h-[600px] overflow-y-auto pr-2">
                    {filteredToilets.map((toilet) => (
                      <ToiletCard
                        key={toilet.id}
                        toilet={toilet}
                        onViewDetails={() => handleViewDetails(toilet)}
                        onGetDirections={() => handleGetDirections(toilet)}
                        onNavigateInApp={() => openInGoogleMaps(toilet)}
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
                  <p className="text-muted-foreground">{t('search.noResults')}</p>
                  <Button onClick={() => navigate('/add-toilet')} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('toilet.addFirst')}
                  </Button>
                </div>
              )}
              
              {!loading && filteredToilets.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">
                    {pinnedLocation 
                      ? `${t('toilet.within5km')} (${filteredToilets.length})`
                      : `${t('toilet.nearby')} (${filteredToilets.length})`
                    }
                  </h2>
                  <div className="grid gap-3 max-h-[700px] overflow-y-auto pr-2">
                    {filteredToilets.map((toilet) => (
                      <ToiletCard
                        key={toilet.id}
                        toilet={toilet}
                        onViewDetails={() => handleViewDetails(toilet)}
                        onGetDirections={() => handleGetDirections(toilet)}
                        onNavigateInApp={() => openInGoogleMaps(toilet)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </div>

      {/* Full Screen Navigation Mode */}
      {directionsTo && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="absolute inset-0">
            <ToiletMap
              toilets={filteredToilets}
              onToiletSelect={setSelectedToilet}
              selectedToiletId={selectedToilet?.id}
              directionsTo={directionsTo}
              onDirectionsCalculated={(duration, distance) => {
                setRouteInfo({ duration, distance });
              }}
            />
          </div>

          {/* Navigation Info Panel - Floating at Bottom */}
          {routeInfo && selectedToilet && (
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
              <div className="relative">
                {/* Blur backdrop */}
                <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" />
                
                <div className="relative pointer-events-auto">
                  <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Navigation2 className="h-5 w-5" />
                      <div>
                        <p className="font-bold text-lg">{routeInfo.duration}</p>
                        <p className="text-xs opacity-90">{routeInfo.distance} • Walking</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleCancelNavigation}
                      className="text-primary-foreground hover:bg-primary-foreground/20"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div className="bg-card/95 backdrop-blur-md p-4 border-t">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold">{selectedToilet.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedToilet.address}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge 
                            variant={selectedToilet.type === 'free' ? 'default' : 'secondary'}
                            className={selectedToilet.type === 'free' ? 'bg-success' : 'bg-warning'}
                          >
                            {selectedToilet.type === 'free' ? 'Free' : `€${selectedToilet.price}`}
                          </Badge>
                          {selectedToilet.rating && selectedToilet.rating > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="h-3 w-3 fill-warning text-warning" />
                              <span>{selectedToilet.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        <Button 
                          className="w-full mt-3 gap-2"
                          onClick={() => openInGoogleMaps(selectedToilet)}
                        >
                          <Smartphone className="h-4 w-4" />
                          {/iPhone|iPad|iPod/.test(navigator.userAgent) 
                            ? 'Open in Apple Maps' 
                            : /Android/.test(navigator.userAgent)
                            ? 'Open in Google Maps'
                            : 'Copy Coordinates'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
                    <h3 className="font-semibold mb-2">{t('details.description')}</h3>
                    <p className="text-muted-foreground">{selectedToilet.description}</p>
                  </div>
                )}

                {selectedToilet.opening_hours && (
                  <div>
                    <h3 className="font-semibold mb-2">{t('details.openingHours')}</h3>
                    <p className="text-muted-foreground">{selectedToilet.opening_hours}</p>
                  </div>
                )}

                {selectedToilet.accessibility_features && selectedToilet.accessibility_features.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">{t('details.accessibilityFeatures')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedToilet.accessibility_features.map((feature: string, idx: number) => (
                        <Badge key={idx} variant="outline">{feature}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">{t('details.location')}</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">{selectedToilet.address}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('details.coordinates')}: {selectedToilet.latitude.toFixed(6)}, {selectedToilet.longitude.toFixed(6)}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={copyCoordinates}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {t('details.copyFullAddress')}
                    </Button>
                    <Button 
                      className="w-full"
                      onClick={() => handleGetDirections(selectedToilet)}
                    >
                      <Navigation2 className="h-4 w-4 mr-2" />
                      {t('navigation.getDirections')}
                    </Button>
                    <Button 
                      className="w-full gap-2"
                      onClick={() => openInGoogleMaps(selectedToilet)}
                    >
                      <Smartphone className="h-4 w-4" />
                      {/iPhone|iPad|iPod/.test(navigator.userAgent) 
                        ? t('navigation.openInAppleMaps')
                        : /Android/.test(navigator.userAgent)
                        ? t('navigation.openInGoogleMaps')
                        : t('navigation.copyCoordinates')}
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
