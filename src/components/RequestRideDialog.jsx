import React, { useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import AddressAutocomplete from './AddressAutocomplete';

const RequestRideDialog = ({ open, onOpenChange, userLocation }) => {
  const { profile } = useOutletContext();
  const [requestType, setRequestType] = useState('now');

  // El destino ahora será un objeto con dirección y coordenadas
  const [destination, setDestination] = useState(null);

  const [scheduledDate, setScheduledDate] = useState(null);
  const [scheduledTime, setScheduledTime] = useState(''); // Estado para la hora HH:mm
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Callback para manejar la selección de un lugar
  const handleDestinationSelect = useCallback((place) => {
    if (place) setDestination({ address: place.address, coordinates: place.coordinates });
    else setDestination(null);
  }, []);

  const handleRequestSubmit = async () => {
    if (!profile) {
      toast.error('Error', { description: 'No se pudo encontrar tu perfil.' });
      return;
    }
    if (!userLocation) {
      toast.error('Error', { description: 'No se pudo obtener tu ubicación actual.' });
      return;
    }
    // Verificación de destino mejorada
    if (!destination || !destination.coordinates) {
      toast.error('Error', { description: 'Por favor, elige un destino válido de la lista.' });
      return;
    }

    let departureTime;
    if (requestType === 'later') {
      if (!scheduledDate || !scheduledTime) {
        toast.error('Error', { description: 'Debes elegir una fecha y hora para un viaje programado.' });
        return;
      }
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const combinedDateTime = new Date(scheduledDate);
      combinedDateTime.setHours(hours, minutes, 0, 0);

      if (combinedDateTime < new Date()) {
        toast.error('Error', { description: 'No puedes programar un viaje en el pasado.' });
        return;
      }
      departureTime = combinedDateTime;
    } else {
      departureTime = serverTimestamp();
    }

    setIsSubmitting(true);
    try {
      const newRequest = {
        passengerId: profile.uid,
        passengerName: profile.name,
        passengerPhotoURL: profile.photoURL || null,
        origin: new GeoPoint(userLocation.lat, userLocation.lng),
        destinationName: destination.address,
        destination: new GeoPoint(destination.coordinates.lat, destination.coordinates.lng),
        requestType,
        departureTime,
        status: 'pending',
        createdAt: serverTimestamp(),
        notes,
      };

      await addDoc(collection(db, 'rideRequests'), newRequest);
      toast.success('¡Tu solicitud ha sido publicada!');
      onOpenChange(false);
    } catch (error) {
      console.error("Error al publicar la solicitud:", error);
      toast.error('Error al publicar', { description: 'Hubo un problema al guardar tu solicitud. Inténtalo de nuevo.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullScheduledDate = () => {
    if (!scheduledDate) return null;
    if (!scheduledTime) return scheduledDate;
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const combined = new Date(scheduledDate);
    combined.setHours(hours, minutes);
    return combined;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>¿A dónde quieres ir?</DialogTitle>
          <DialogDescription>
            Publica una solicitud para que los conductores cercanos la vean.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="destination" className="text-right">Destino</Label>
            <div className="col-span-3">
              <AddressAutocomplete
                value={destination?.address}
                placeholder="Ej: Aeropuerto, Centro Comercial..."
                onChange={handleDestinationSelect}
              />
            </div>
          </div>

          <RadioGroup defaultValue="now" onValueChange={setRequestType} className="flex justify-center space-x-4 pt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="now" id="r-now" />
              <Label htmlFor="r-now">Ahora</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="later" id="r-later" />
              <Label htmlFor="r-later">Más tarde</Label>
            </div>
          </RadioGroup>

          {requestType === 'later' && (
            <div className="flex flex-col items-center gap-2 animate-in fade-in-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-[280px] justify-start text-left font-normal',
                      !scheduledDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fullScheduledDate()
                      ? format(fullScheduledDate(), 'PPP HH:mm')
                      : <span>Elige fecha y hora</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    initialFocus
                    fromDate={new Date()}
                  />
                  <div className="p-2 border-t border-border">
                    <Label htmlFor="time-input" className="text-sm">Hora de salida</Label>
                    <Input
                      id="time-input"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full mt-1"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">Notas</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="(Opcional) Ej: Llevo una maleta"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleRequestSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Publicando...' : 'Publicar Solicitud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestRideDialog;
