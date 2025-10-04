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
import { ArrowLeft, MapPin } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

const AddToilet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    type: 'free' as 'free' | 'paid',
    price: '',
    description: '',
    opening_hours: '',
  });
  const [accessibilityFeatures, setAccessibilityFeatures] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
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
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          }));
        }
      );
    }
  }, [navigate]);

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

    setLoading(true);

    try {
      const { error } = await supabase.from('toilets').insert({
        name: formData.name,
        address: formData.address,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        type: formData.type,
        price: formData.type === 'paid' && formData.price ? parseFloat(formData.price) : null,
        description: formData.description || null,
        opening_hours: formData.opening_hours || null,
        accessibility_features: accessibilityFeatures.length > 0 ? accessibilityFeatures : null,
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">{t('addToilet.latitude')}</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="54.8985"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="longitude">{t('addToilet.longitude')}</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="23.9036"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    required
                  />
                </div>
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
                  {['Wheelchair accessible', 'Handrails', 'Baby changing station', 'Wide door'].map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Checkbox
                        id={feature}
                        checked={accessibilityFeatures.includes(feature)}
                        onCheckedChange={() => toggleAccessibility(feature)}
                      />
                      <Label htmlFor={feature} className="font-normal cursor-pointer">
                        {feature}
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
