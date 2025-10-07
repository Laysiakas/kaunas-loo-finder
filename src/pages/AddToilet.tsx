import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MapPin, Upload, X } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import LocationPicker from '@/components/LocationPicker';

const AddToilet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    type: 'free' as 'free' | 'paid',
    price: '',
    description: '',
    opening_hours: '',
  });
  const [accessibilityFeatures, setAccessibilityFeatures] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth?returnTo=/add-toilet');
        return;
      }
      setUserId(session.user.id);
    };
    checkAuth();

    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
        }
      );
    }
  }, [navigate]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('addToilet.error'),
          description: t('addToilet.imageSizeError'),
          variant: 'destructive',
        });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: address,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast({
        title: t('addToilet.error'),
        description: 'You must be logged in to add a toilet',
        variant: 'destructive',
      });
      return;
    }

    if (!imageFile) {
      toast({
        title: t('addToilet.error'),
        description: t('addToilet.photoVerificationDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (formData.latitude === 0 || formData.longitude === 0) {
      toast({
        title: t('addToilet.error'),
        description: t('addToilet.pinLocationRequired'),
        variant: 'destructive',
      });
      return;
    }

    // Validate input data
    if (formData.name.trim().length === 0 || formData.name.length > 200) {
      toast({
        title: t('addToilet.error'),
        description: 'Name must be between 1 and 200 characters',
        variant: 'destructive',
      });
      return;
    }

    if (formData.address.trim().length === 0 || formData.address.length > 500) {
      toast({
        title: t('addToilet.error'),
        description: 'Address must be between 1 and 500 characters',
        variant: 'destructive',
      });
      return;
    }

    if (formData.latitude < -90 || formData.latitude > 90 || formData.longitude < -180 || formData.longitude > 180) {
      toast({
        title: t('addToilet.error'),
        description: 'Invalid coordinates',
        variant: 'destructive',
      });
      return;
    }

    if (formData.description && formData.description.length > 1000) {
      toast({
        title: t('addToilet.error'),
        description: 'Description must be less than 1000 characters',
        variant: 'destructive',
      });
      return;
    }

    if (formData.opening_hours && formData.opening_hours.length > 100) {
      toast({
        title: t('addToilet.error'),
        description: 'Opening hours must be less than 100 characters',
        variant: 'destructive',
      });
      return;
    }

    if (formData.type === 'paid' && formData.price) {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price < 0 || price > 1000) {
        toast({
          title: t('addToilet.error'),
          description: 'Price must be between 0 and 1000',
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);

    try {
      // Upload image first
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('toilet-images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('toilet-images')
        .getPublicUrl(fileName);

      // Insert toilet data
      const { error } = await supabase.from('toilets').insert({
        name: formData.name,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        type: formData.type,
        price: formData.type === 'paid' && formData.price ? parseFloat(formData.price) : null,
        description: formData.description || null,
        opening_hours: formData.opening_hours || null,
        accessibility_features: accessibilityFeatures.length > 0 ? accessibilityFeatures : null,
        image_url: publicUrl,
        created_by: userId,
      });

      if (error) throw error;

      toast({
        title: t('addToilet.success'),
        description: t('addToilet.toiletAdded'),
      });

      navigate('/');
    } catch (error: any) {
      toast({
        title: t('addToilet.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAccessibility = (feature: string) => {
    setAccessibilityFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">{t('addToilet.title')}</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t('addToilet.title')}</CardTitle>
            <CardDescription>
              {t('addToilet.title')}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">{t('addToilet.name')}</Label>
                <Input
                  id="name"
                  placeholder={t('addToilet.namePlaceholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <LocationPicker
                onLocationSelect={handleLocationSelect}
                initialLat={formData.latitude !== 0 ? formData.latitude : undefined}
                initialLng={formData.longitude !== 0 ? formData.longitude : undefined}
              />

              <div className="space-y-2">
                <Label htmlFor="address">{t('addToilet.address')}</Label>
                <Input
                  id="address"
                  placeholder={t('addToilet.addressPlaceholder')}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>{t('addToilet.photoVerification')}</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t('addToilet.photoVerificationDesc')}
                </p>
                {!imagePreview ? (
                  <div className="relative">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Label
                      htmlFor="image"
                      className="flex items-center justify-center gap-2 h-32 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors"
                    >
                      <Upload className="h-6 w-6" />
                      <span>{t('addToilet.uploadImage')}</span>
                    </Label>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label>{t('addToilet.type')}</Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={(value: 'free' | 'paid') => setFormData({ ...formData, type: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="free" id="free" />
                    <Label htmlFor="free" className="font-normal cursor-pointer">{t('filter.free')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="paid" id="paid" />
                    <Label htmlFor="paid" className="font-normal cursor-pointer">{t('filter.paid')}</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.type === 'paid' && (
                <div className="space-y-2">
                  <Label htmlFor="price">{t('addToilet.price')}</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder={t('addToilet.pricePlaceholder')}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">{t('addToilet.description')}</Label>
                <Textarea
                  id="description"
                  placeholder={t('addToilet.descriptionPlaceholder')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opening_hours">{t('addToilet.openingHours')}</Label>
                <Input
                  id="opening_hours"
                  placeholder={t('addToilet.openingHoursPlaceholder')}
                  value={formData.opening_hours}
                  onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <Label>{t('addToilet.accessibility')}</Label>
                <div className="space-y-2">
                  {[
                    { key: 'Wheelchair accessible', label: t('addToilet.wheelchairAccessible') },
                    { key: 'Handrails', label: t('addToilet.handrails') },
                    { key: 'Baby changing station', label: t('addToilet.babyChangingStation') },
                    { key: 'Wide door', label: t('addToilet.wideDoor') }
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={accessibilityFeatures.includes(key)}
                        onCheckedChange={() => toggleAccessibility(key)}
                      />
                      <Label htmlFor={key} className="font-normal cursor-pointer">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  {t('addToilet.cancel')}
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? `${t('loading.loading')}` : t('addToilet.submit')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddToilet;
