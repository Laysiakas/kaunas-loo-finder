import { MapPin, Star, Navigation, Euro, Clock, Accessibility } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ToiletCardProps {
  toilet: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    type: 'free' | 'paid';
    price?: number;
    description?: string;
    opening_hours?: string;
    accessibility_features?: string[];
  };
  averageRating?: number;
  totalReviews?: number;
  onViewDetails?: () => void;
  onGetDirections?: () => void;
}

const ToiletCard = ({ toilet, averageRating, totalReviews, onViewDetails, onGetDirections }: ToiletCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onViewDetails}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg">{toilet.name}</CardTitle>
            <CardDescription className="flex items-center gap-1 text-sm">
              <MapPin className="h-3 w-3" />
              {toilet.address}
            </CardDescription>
          </div>
          <Badge 
            variant={toilet.type === 'free' ? 'default' : 'secondary'}
            className={toilet.type === 'free' ? 'bg-success hover:bg-success/90' : 'bg-warning hover:bg-warning/90'}
          >
            {toilet.type === 'free' ? 'Free' : `€${toilet.price}`}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {averageRating !== undefined && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(averageRating)
                      ? 'fill-warning text-warning'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {averageRating.toFixed(1)} ({totalReviews || 0} reviews)
            </span>
          </div>
        )}
        
        {toilet.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {toilet.description}
          </p>
        )}
        
        <div className="flex flex-wrap gap-2">
          {toilet.opening_hours && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {toilet.opening_hours}
            </div>
          )}
          
          {toilet.accessibility_features && toilet.accessibility_features.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Accessibility className="h-3 w-3" />
              Accessible
            </div>
          )}
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onGetDirections?.();
            }}
          >
            <Navigation className="h-4 w-4 mr-1" />
            Directions
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails?.();
            }}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ToiletCard;
