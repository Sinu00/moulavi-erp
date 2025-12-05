'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { voucherAPI, cityMasterAPI, locationMasterAPI, transportRouteMasterAPI, transportMasterAPI } from '@/lib/api';
import { Loader2, Plus, Minus, Trash2, MapPin, Truck } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RouteType } from '@/types';

interface QuickVoucherFormProps {
  onSuccess: () => void;
}

interface HotelSchedule {
  number: number;
  cityId?: string;
  cityName?: string;
  locationId?: string;
  location: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  days: number;
  brn?: string;
}

interface MovementDetail {
  sr: number;
  route: string;
  date: string;
  time: string;
  fromCityId?: string;
  from: string;
  fromLocationId?: string;
  fromLocation: string;
  toCityId?: string;
  to: string;
  toLocationId?: string;
  toLocation: string;
  driverDetails1?: string;
  driverDetails2?: string;
  vehicleNumber?: string;
}

interface FlightDetail {
  type: 'AA' | 'AD';
  date: string;
  carrier: string;
  number: string;
  fromLocationId?: string;
  from: string;
  toLocationId?: string;
  to: string;
  etd: string;
  eta: string;
}

interface TransportOption {
  transportId: string;
  routeId: string;
  quantity: number;
}

export function QuickVoucherForm({ onSuccess }: QuickVoucherFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(true);
  
  // Master Data
  const [cities, setCities] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [transports, setTransports] = useState<any[]>([]);
  const [locationsByCity, setLocationsByCity] = useState<Map<string, any[]>>(new Map());
  const [hotelsByCity, setHotelsByCity] = useState<Map<string, any[]>>(new Map());
  const [airports, setAirports] = useState<any[]>([]);
  const [ziyaraths, setZiyaraths] = useState<any[]>([]);
  
  // Route Selection
  const [selectedRouteType, setSelectedRouteType] = useState<RouteType | 'all'>('all');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [loadingTransports, setLoadingTransports] = useState(false);
  
  const [formData, setFormData] = useState({
    reservationDate: new Date().toISOString().split('T')[0],
    guestName: '',
    guestMobile: '',
    groupCode: '',
    paxCount: 1,
    hotelSchedules: [] as HotelSchedule[],
    movementDetails: [] as MovementDetail[],
    flightDetails: [] as FlightDetail[],
    transportOptions: [] as TransportOption[],
  });

  // Load Master Data
  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      setLoadingMasters(true);
      const [citiesRes, locationsRes, routesRes] = await Promise.all([
        cityMasterAPI.getActive(),
        locationMasterAPI.getActive(),
        transportRouteMasterAPI.getActive(),
      ]);
      
      const citiesData = citiesRes.data?.cityMasters || citiesRes.data || [];
      const locationsData = locationsRes.data?.locationMasters || locationsRes.data || [];
      const routesData = routesRes.data?.transportRouteMasters || routesRes.data || [];
      
      setCities(citiesData);
      setLocations(locationsData);
      
      // Load all routes (not just fulltrip)
      setRoutes(routesData);
      
      // Group locations by city and type
      const locationsByCityMap = new Map<string, any[]>();
      const hotelsByCityMap = new Map<string, any[]>();
      const airportsList: any[] = [];
      const ziyarathsList: any[] = [];
      
      locationsData.forEach((loc: any) => {
        const cityKey = (loc.city || loc.cityMaster?.name || '').toLowerCase().trim();
        
        if (!locationsByCityMap.has(cityKey)) {
          locationsByCityMap.set(cityKey, []);
        }
        locationsByCityMap.get(cityKey)!.push(loc);
        
        if (loc.locationType === 'HOTEL') {
          if (!hotelsByCityMap.has(cityKey)) {
            hotelsByCityMap.set(cityKey, []);
          }
          hotelsByCityMap.get(cityKey)!.push(loc);
        } else if (loc.locationType === 'AIRPORT') {
          airportsList.push(loc);
        } else if (loc.locationType === 'ZIYARAT') {
          ziyarathsList.push(loc);
        }
      });
      
      setLocationsByCity(locationsByCityMap);
      setHotelsByCity(hotelsByCityMap);
      setAirports(airportsList);
      setZiyaraths(ziyarathsList);
    } catch (error) {
      console.error('Error loading master data:', error);
      toast.error('Failed to load master data');
    } finally {
      setLoadingMasters(false);
    }
  };

  // Filter routes by selected route type
  const filteredRoutes = routes.filter((route: any) => {
    if (selectedRouteType === 'all') return true;
    return route.routeType === selectedRouteType;
  });

  // Load transports when route is selected
  useEffect(() => {
    const loadTransportsForRoute = async () => {
      if (!selectedRouteId) {
        setTransports([]);
        return;
      }

      setLoadingTransports(true);
      try {
        const response = await transportMasterAPI.getByRoute(selectedRouteId);
        const transportsData = response.data.transportMasters || [];
        setTransports(transportsData);
      } catch (error: any) {
        console.error('Error loading transports:', error);
        toast.error('Failed to load transport vehicles');
        setTransports([]);
      } finally {
        setLoadingTransports(false);
      }
    };

    loadTransportsForRoute();
  }, [selectedRouteId]);

  // Helper functions

  const getHotelsForCity = (cityName: string) => {
    if (!cityName) return [];
    const cityKey = cityName.toLowerCase().trim();
    return hotelsByCity.get(cityKey) || [];
  };

  const findZiyarathByCity = (cityName: string) => {
    const normalizedCity = cityName.toLowerCase().trim();
    return ziyaraths.find((z: any) => 
      (z.city || '').toLowerCase().trim() === normalizedCity
    );
  };

  // Helper: Check if a city is Makkah or Madinah
  const isZiyarathCity = (cityName: string): boolean => {
    const normalized = cityName.toLowerCase().trim();
    return normalized === 'makkah' || normalized === 'madinah' || normalized === 'madina';
  };

  // Helper: Find city center location for a city
  const getCityCenterForCity = (cityName: string) => {
    const normalizedCity = cityName.toLowerCase().trim();
    return locations.find((loc: any) => {
      const locCity = (loc.city || loc.cityMaster?.name || '').toLowerCase().trim();
      const locName = (loc.name || '').toLowerCase();
      return locCity === normalizedCity && 
             (locName.includes('city center') || loc.code?.endsWith('CC'));
    });
  };

  const calculateDays = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const diffTime = Math.abs(outDate.getTime() - inDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Time calculation helpers
  const subtractHours = (timeString: string, hours: number): string => {
    if (!timeString) return '12:00';
    const [h, m] = timeString.split(':').map(Number);
    let totalMinutes = h * 60 + m;
    totalMinutes -= hours * 60;
    
    // Handle negative (previous day)
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60; // Add 24 hours
    }
    
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

  const calculateZiyarathDate = (checkInDate: string): string => {
    const base = new Date(checkInDate);
    base.setDate(base.getDate() + 2);
    // Skip Friday (day 5) -> move to Saturday (day 6)
    if (base.getUTCDay() === 5) {
      base.setDate(base.getDate() + 1);
    }
    return base.toISOString().split('T')[0];
  };

  const calculateMovementTime = (
    fromCity: string,
    toLocation: string,
    departureFlightTime?: string
  ): string => {
    if (!departureFlightTime) return '12:00';
    
    const fromCityLower = fromCity.toLowerCase().trim();
    const toLocationLower = toLocation.toLowerCase().trim();
    
    // Makkah city to Jeddah airport: 6 hours prior
    if (fromCityLower === 'makkah' && toLocationLower.includes('jeddah') && toLocationLower.includes('airport')) {
      return subtractHours(departureFlightTime, 6);
    }
    
    // Makkah city to airport: 12 hours prior
    if (fromCityLower === 'makkah' && toLocationLower.includes('airport')) {
      return subtractHours(departureFlightTime, 12);
    }
    
    // Madina city to Medina airport: 15 hours prior
    if ((fromCityLower === 'madinah' || fromCityLower === 'madina') && toLocationLower.includes('medina') && toLocationLower.includes('airport')) {
      return subtractHours(departureFlightTime, 15);
    }
    
    // Makkah city to Madina airport: 12 hours prior
    if (fromCityLower === 'makkah' && (toLocationLower.includes('madinah') || toLocationLower.includes('madina'))) {
      return subtractHours(departureFlightTime, 12);
    }
    
    return '12:00';
  };


  // Format route display
  const formatRouteDisplay = (route: any): string => {
    const cities = [
      route.city1?.name,
      route.city2?.name,
      route.city3?.name,
      route.city4?.name,
    ].filter(Boolean);
    return cities.join(' → ');
  };

  // Generate movements based on route type
  const generateMovementsForRoute = (
    route: any,
    routeCities: any[],
    arrivalDate: string,
    departureDate: string,
    arrivalFlightData?: FlightDetail,
    departureFlightData?: FlightDetail
  ): { movements: MovementDetail[]; hotels: HotelSchedule[] } => {
    const movements: MovementDetail[] = [];
    let movementIndex = 0;
    let hotels: HotelSchedule[] = [];
    const routeType = route.routeType;

    if (routeType === 'fulltrip') {
      // Full trip: Airport → Hotel 1 → Ziyarath 1 → Hotel 2 → Ziyarath 2 → Airport
      const totalDays = calculateDays(arrivalDate, departureDate);
      const daysPerCity = Math.floor(totalDays / Math.max(routeCities.length - 1, 1));

      // Hotels for middle cities only (exclude first and last)
      const hotelCities = routeCities.length >= 3
        ? routeCities.slice(1, -1)
        : [];

      hotels = hotelCities.map((city: any, idx: number) => {
        const checkInDate = new Date(arrivalDate);
        checkInDate.setDate(checkInDate.getDate() + (idx * daysPerCity));
        const checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + daysPerCity);

        return {
          number: idx + 1,
          cityId: city.id,
          cityName: city.name,
          locationId: '',
          location: city.name,
          hotelName: '',
          checkIn: checkInDate.toISOString().split('T')[0],
          checkOut: checkOutDate.toISOString().split('T')[0],
          days: daysPerCity,
        };
      });

      // 1) Arrival airport → first hotel
      const arrivalAirportId = arrivalFlightData?.fromLocationId;
      if (arrivalAirportId && hotels.length > 0) {
        const arrivalAirport = airports.find(a => a.id === arrivalAirportId);
        const firstHotel = hotels[0];
        
        if (arrivalAirport && firstHotel.cityId && firstHotel.cityName) {
          movements.push({
            sr: movementIndex + 1,
            route: '',
            date: arrivalDate,
            time: arrivalFlightData?.etd ? subtractHours(arrivalFlightData.etd, 1) : '12:00',
            fromCityId: arrivalAirport.cityId,
            from: arrivalAirport.city || '',
            fromLocationId: arrivalAirport.id,
            fromLocation: arrivalAirport.name || '',
            toCityId: firstHotel.cityId,
            to: firstHotel.cityName,
            toLocationId: '',
            toLocation: '',
          });
          movementIndex++;
        }
      }

      // 2) For each hotel: Hotel → Ziyarath (if applicable) → Next Hotel
      for (let i = 0; i < hotels.length; i++) {
        const currentHotel = hotels[i];
        const isLastHotel = i === hotels.length - 1;
        
        if (!currentHotel.cityName) continue;

        const hasZiyarath = isZiyarathCity(currentHotel.cityName);
        const ziyarathLocation = hasZiyarath ? findZiyarathByCity(currentHotel.cityName) : null;
        
        if (hasZiyarath && ziyarathLocation && currentHotel.checkIn) {
          const ziyarathDate = calculateZiyarathDate(currentHotel.checkIn);
          const ziyarathTime = currentHotel.cityName.toLowerCase().trim() === 'makkah' ? '08:00' : '14:00';
          
          movements.push({
            sr: movementIndex + 1,
            route: '',
            date: ziyarathDate,
            time: ziyarathTime,
            fromCityId: currentHotel.cityId,
            from: currentHotel.cityName,
            fromLocationId: '',
            fromLocation: '',
            toCityId: currentHotel.cityId,
            to: currentHotel.cityName,
            toLocationId: ziyarathLocation.id,
            toLocation: ziyarathLocation.name,
          });
          movementIndex++;
        }

        // Move to next hotel
        if (!isLastHotel) {
          const nextHotel = hotels[i + 1];
          if (nextHotel.cityId && nextHotel.cityName) {
            const movementDate = hasZiyarath && currentHotel.checkIn 
              ? calculateZiyarathDate(currentHotel.checkIn)
              : currentHotel.checkOut || arrivalDate;
            
            movements.push({
              sr: movementIndex + 1,
              route: '',
              date: movementDate,
              time: '12:00',
              fromCityId: currentHotel.cityId,
              from: currentHotel.cityName,
              fromLocationId: '',
              fromLocation: '',
              toCityId: nextHotel.cityId,
              to: nextHotel.cityName,
              toLocationId: '',
              toLocation: '',
            });
            movementIndex++;
          }
        }
      }

      // 3) Last hotel → departure airport
      const departureAirportId = departureFlightData?.toLocationId;
      if (departureAirportId && hotels.length > 0) {
        const departureAirport = airports.find(a => a.id === departureAirportId);
        const lastHotel = hotels[hotels.length - 1];
        const departureTime = departureFlightData?.etd || '12:00';
        
        if (departureAirport && lastHotel.cityId && lastHotel.cityName) {
          movements.push({
            sr: movementIndex + 1,
            route: '',
            date: departureDate,
            time: calculateMovementTime(lastHotel.cityName || '', departureAirport.name || '', departureTime),
            fromCityId: lastHotel.cityId,
            from: lastHotel.cityName || '',
            fromLocationId: '',
            fromLocation: '',
            toCityId: departureAirport.cityId,
            to: departureAirport.city || '',
            toLocationId: departureAirport.id,
            toLocation: departureAirport.name || '',
          });
          movementIndex++;
        }
      }
    } else if (routeType === 'airporttocity') {
      // Airport to City: Airport → City Center
      const arrivalAirportId = arrivalFlightData?.fromLocationId;
      const destinationCity = routeCities[1];
      
      if (arrivalAirportId && destinationCity) {
        const arrivalAirport = airports.find(a => a.id === arrivalAirportId);
        const cityCenter = getCityCenterForCity(destinationCity.name);
        
        if (arrivalAirport && cityCenter) {
          movements.push({
            sr: movementIndex + 1,
            route: '',
            date: arrivalDate,
            time: arrivalFlightData?.etd ? subtractHours(arrivalFlightData.etd, 1) : '12:00',
            fromCityId: arrivalAirport.cityId,
            from: arrivalAirport.city || '',
            fromLocationId: arrivalAirport.id,
            fromLocation: arrivalAirport.name || '',
            toCityId: destinationCity.id,
            to: destinationCity.name,
            toLocationId: cityCenter.id,
            toLocation: cityCenter.name,
          });
        }
      }
    } else if (routeType === 'citytocity') {
      // City to City: City Center → City Center
      const sourceCity = routeCities[0];
      const destinationCity = routeCities[1];
      
      if (sourceCity && destinationCity) {
        const sourceCityCenter = getCityCenterForCity(sourceCity.name);
        const destCityCenter = getCityCenterForCity(destinationCity.name);
        
        if (sourceCityCenter && destCityCenter) {
          movements.push({
            sr: movementIndex + 1,
            route: '',
            date: arrivalDate,
            time: '12:00',
            fromCityId: sourceCity.id,
            from: sourceCity.name,
            fromLocationId: sourceCityCenter.id,
            fromLocation: sourceCityCenter.name,
            toCityId: destinationCity.id,
            to: destinationCity.name,
            toLocationId: destCityCenter.id,
            toLocation: destCityCenter.name,
          });
        }
      }
    } else if (routeType === 'citytoairport') {
      // City to Airport: City Center → Airport
      const sourceCity = routeCities[0];
      const departureAirportId = departureFlightData?.toLocationId;
      
      if (sourceCity && departureAirportId) {
        const sourceCityCenter = getCityCenterForCity(sourceCity.name);
        const departureAirport = airports.find(a => a.id === departureAirportId);
        const departureTime = departureFlightData?.etd || '12:00';
        
        if (sourceCityCenter && departureAirport) {
          movements.push({
            sr: movementIndex + 1,
            route: '',
            date: departureDate,
            time: calculateMovementTime(sourceCity.name, departureAirport.name || '', departureTime),
            fromCityId: sourceCity.id,
            from: sourceCity.name,
            fromLocationId: sourceCityCenter.id,
            fromLocation: sourceCityCenter.name,
            toCityId: departureAirport.cityId,
            to: departureAirport.city || '',
            toLocationId: departureAirport.id,
            toLocation: departureAirport.name || '',
          });
        }
      }
    }

    return { movements, hotels };
  };

  // Auto-prefill from route
  const handleRouteSelect = (routeId: string) => {
    const route = routes.find((r: any) => r.id === routeId);
    if (!route) return;

    setSelectedRouteId(routeId);

    // Extract cities from route
    const routeCities = [
      route.city1,
      route.city2,
      route.city3,
      route.city4,
    ].filter(Boolean);

    if (routeCities.length < 2) {
      toast.error('Route must have at least 2 cities');
      return;
    }

    // Get arrival and departure dates from flights
    const arrivalFlightData = formData.flightDetails.find(f => f.type === 'AA');
    const departureFlightData = formData.flightDetails.find(f => f.type === 'AD');
    const arrivalDate = arrivalFlightData?.date || formData.reservationDate;
    const departureDate = departureFlightData?.date || formData.reservationDate;

    // Generate movements and hotels
    const { movements, hotels } = generateMovementsForRoute(
      route,
      routeCities,
      arrivalDate,
      departureDate,
      arrivalFlightData,
      departureFlightData
    );

    // Update form data
    setFormData(prev => ({
      ...prev,
      hotelSchedules: hotels,
      movementDetails: movements,
    }));

    toast.success('Route pre-filled successfully');
  };

  const handleSubmit = async () => {
    if (!formData.guestName || !formData.paxCount) {
      toast.error('Guest name and passenger count are required');
      return;
    }

    try {
      setSubmitting(true);
      await voucherAPI.createQuickVoucher({
        guestName: formData.guestName,
        guestMobile: formData.guestMobile,
        groupCode: formData.groupCode,
        paxCount: formData.paxCount,
        reservationDate: formData.reservationDate,
        hotelSchedules: formData.hotelSchedules.map((hs, idx) => ({
          number: idx + 1,
          location: hs.cityName || hs.location || '', // City name (CityMaster)
          hotelName: hs.hotelName || '', // Hotel name (LocationMaster)
          checkIn: hs.checkIn,
          checkOut: hs.checkOut,
          days: calculateDays(hs.checkIn, hs.checkOut),
          brn: hs.brn || null,
        })),
        movementDetails: formData.movementDetails.map(m => ({
          sr: m.sr,
          route: null, // Backend will generate route numbers dynamically
          date: m.date,
          time: m.time,
          from: m.from || '',
          fromLocation: m.fromLocation || '',
          fromLocationId: m.fromLocationId || null,
          to: m.to || '',
          toLocation: m.toLocation || '',
          toLocationId: m.toLocationId || null,
          driverDetails1: m.driverDetails1 || null,
          driverDetails2: m.driverDetails2 || null,
          vehicleNumber: m.vehicleNumber || null,
        })),
        flightDetails: formData.flightDetails.map(f => {
          // Get airport name from locations array using the location ID
          let arrivalAirport = '';
          let departureAirport = '';
          
          if (f.type === 'AA' && f.fromLocationId) {
            const airport = airports.find(a => a.id === f.fromLocationId);
            arrivalAirport = airport?.name || airport?.code || f.from || '';
          }
          
          if (f.type === 'AD' && f.toLocationId) {
            const airport = airports.find(a => a.id === f.toLocationId);
            departureAirport = airport?.name || airport?.code || f.to || '';
          }
          
          return {
            type: f.type,
            date: f.date,
            carrier: f.carrier,
            number: f.number,
            // For AA: from is arrival airport name, to is JED; For AD: from is JED, to is departure airport name
            from: f.type === 'AA' ? (arrivalAirport || f.from || '') : 'JED',
            to: f.type === 'AD' ? (departureAirport || f.to || '') : 'JED',
            arrivalAirportId: f.type === 'AA' ? (f.fromLocationId || null) : null,
            arrivalAirport: f.type === 'AA' ? arrivalAirport : undefined,
            departureAirportId: f.type === 'AD' ? (f.toLocationId || null) : null,
            departureAirport: f.type === 'AD' ? departureAirport : undefined,
            etd: f.etd || '',
            eta: f.eta || '',
          };
        }),
        transportOptions: formData.transportOptions,
      });

      toast.success('Quick voucher created successfully');
      onSuccess();
      
      // Reset form
      setFormData({
        reservationDate: new Date().toISOString().split('T')[0],
        guestName: '',
        guestMobile: '',
        groupCode: '',
        paxCount: 1,
        hotelSchedules: [],
        movementDetails: [],
        flightDetails: [],
        transportOptions: [],
      });
      setSelectedRouteId(null);
      setSelectedRouteType('all');
    } catch (error: any) {
      console.error('Error creating quick voucher:', error);
      toast.error(error?.response?.data?.error || 'Failed to create quick voucher');
    } finally {
      setSubmitting(false);
    }
  };

  // Hotel functions
  const addHotel = () => {
    setFormData({
      ...formData,
      hotelSchedules: [
        ...formData.hotelSchedules,
        {
          number: formData.hotelSchedules.length + 1,
          location: '', // Will be set to city name when city is selected
          hotelName: '',
          checkIn: '',
          checkOut: '',
          days: 0,
        },
      ],
    });
  };

  const removeHotel = (index: number) => {
    const updated = formData.hotelSchedules.filter((_, i) => i !== index);
    updated.forEach((h, idx) => {
      h.number = idx + 1;
    });
    setFormData({ ...formData, hotelSchedules: updated });
  };

  const updateHotel = (index: number, field: keyof HotelSchedule, value: any) => {
    const updated = [...formData.hotelSchedules];
    updated[index] = { ...updated[index], [field]: value };
    
    // When city changes, clear hotel selection (no prefill)
    if (field === 'cityName') {
      updated[index].locationId = '';
      updated[index].location = value || ''; // Set location to city name (CityMaster)
      updated[index].hotelName = '';
      // Ensure cityId is set if we have the city
      if (value) {
        const city = cities.find(c => c.name === value);
        if (city) {
          updated[index].cityId = city.id;
        }
      }
    }
    
    // When location changes, update hotel name and movements
    if (field === 'locationId') {
      const location = locations.find(l => l.id === value);
      if (location) {
        // IMPORTANT: location field should be city name (CityMaster), NOT hotel name
        // hotelName should be the hotel name (LocationMaster enum HOTEL)
        updated[index].location = updated[index].cityName || ''; // Keep city name, not hotel name
        updated[index].hotelName = location.name; // Hotel name (LocationMaster)
        // Update corresponding movements
        updateMovementsForHotel(index, value);
      }
    }
    
    if (field === 'checkIn' || field === 'checkOut') {
      updated[index].days = calculateDays(updated[index].checkIn, updated[index].checkOut);
    }
    setFormData({ ...formData, hotelSchedules: updated });
  };

  // Update movements when hotel changes
  const updateMovementsForHotel = (hotelIndex: number, hotelLocationId: string) => {
    const hotel = formData.hotelSchedules[hotelIndex];
    if (!hotel || !hotel.cityName) return;

    const location = locations.find(l => l.id === hotelLocationId);
    if (!location) return;

    const updatedMovements = formData.movementDetails.map((movement) => {
      // Update movements that reference this hotel's city and have empty location
      const isToCity = movement.to?.toLowerCase().trim() === hotel.cityName?.toLowerCase().trim() && 
                       movement.toCityId === hotel.cityId && 
                       !movement.toLocationId;
      const isFromCity = movement.from?.toLowerCase().trim() === hotel.cityName?.toLowerCase().trim() && 
                         movement.fromCityId === hotel.cityId && 
                         !movement.fromLocationId;
      
      if (isToCity) {
        return {
          ...movement,
          toLocationId: hotelLocationId,
          toLocation: location.name,
        };
      }
      
      if (isFromCity) {
        return {
          ...movement,
          fromLocationId: hotelLocationId,
          fromLocation: location.name,
        };
      }
      
      return movement;
    });
    
    setFormData(prev => ({ ...prev, movementDetails: updatedMovements }));
  };

  // Movement functions
  const addMovement = () => {
    const newIndex = formData.movementDetails.length;
    setFormData({
      ...formData,
      movementDetails: [
        ...formData.movementDetails,
        {
          sr: newIndex + 1,
          route: '',
          date: '',
          time: '',
          from: '',
          fromLocation: '',
          to: '',
          toLocation: '',
          driverDetails1: '',
          driverDetails2: '',
          vehicleNumber: '',
        },
      ],
    });
  };

  const removeMovement = (index: number) => {
    const updated = formData.movementDetails.filter((_, i) => i !== index);
    updated.forEach((m, idx) => {
      m.sr = idx + 1;
    });
    setFormData({ ...formData, movementDetails: updated });
  };

  const updateMovement = (index: number, field: keyof MovementDetail, value: any) => {
    const updated = [...formData.movementDetails];
    updated[index] = { ...updated[index], [field]: value };
    
    // When from city changes, update location options
    if (field === 'from') {
      const cityKey = value.toLowerCase().trim();
      const cityLocations = locationsByCity.get(cityKey) || [];
      if (cityLocations.length > 0) {
        updated[index].fromLocationId = cityLocations[0].id;
        updated[index].fromLocation = cityLocations[0].name;
      } else {
        updated[index].fromLocationId = '';
        updated[index].fromLocation = '';
      }
    }
    
    // When to city changes, update location options
    if (field === 'to') {
      const cityKey = value.toLowerCase().trim();
      const cityLocations = locationsByCity.get(cityKey) || [];
      if (cityLocations.length > 0) {
        updated[index].toLocationId = cityLocations[0].id;
        updated[index].toLocation = cityLocations[0].name;
      } else {
        updated[index].toLocationId = '';
        updated[index].toLocation = '';
      }
    }
    
    // When location changes, update display
    if (field === 'fromLocationId' || field === 'toLocationId') {
      const location = locations.find(l => l.id === value);
      if (location) {
        if (field === 'fromLocationId') {
          updated[index].fromLocation = location.name;
        } else {
          updated[index].toLocation = location.name;
        }
      }
    }
    
    setFormData({ ...formData, movementDetails: updated });
  };

  // Flight functions - Separate arrival and departure
  const updateArrivalFlight = (field: keyof FlightDetail, value: any) => {
    const arrivalFlight = formData.flightDetails.find(f => f.type === 'AA') || {
      type: 'AA' as const,
      date: '',
      carrier: '',
      number: '',
      from: '',
      to: '',
      etd: '',
      eta: '',
    };
    
    const updated = { ...arrivalFlight, [field]: value };
    
    // When from/to location changes, update display
    if (field === 'fromLocationId') {
      const location = airports.find(a => a.id === value);
      if (location) {
        updated.from = (location.code || location.name || '').substring(0, 10);
      }
    }
    
    if (field === 'toLocationId') {
      const location = airports.find(a => a.id === value);
      if (location) {
        // Use code (airport code) instead of name, truncate to 10 chars max
        updated.to = (location.code || location.name || '').substring(0, 10);
      }
    }
    
    // Update or add arrival flight
    const otherFlights = formData.flightDetails.filter(f => f.type !== 'AA');
    setFormData({ ...formData, flightDetails: [updated, ...otherFlights] });
  };

  const updateDepartureFlight = (field: keyof FlightDetail, value: any) => {
    const departureFlight = formData.flightDetails.find(f => f.type === 'AD') || {
      type: 'AD' as const,
      date: '',
      carrier: '',
      number: '',
      from: '',
      to: '',
      etd: '',
      eta: '',
    };
    
    const updated = { ...departureFlight, [field]: value };
    
    // When from/to location changes, update display and airport selection
    if (field === 'fromLocationId') {
      const location = airports.find(a => a.id === value);
      if (location) {
        // Use code (airport code) instead of name, truncate to 10 chars max
        updated.from = (location.code || location.name || '').substring(0, 10);
      }
    }
    
    if (field === 'toLocationId') {
      const location = airports.find(a => a.id === value);
      if (location) {
        updated.to = (location.code || location.name || '').substring(0, 10);
      }
    }
    
    // Update or add departure flight
    const otherFlights = formData.flightDetails.filter(f => f.type !== 'AD');
    setFormData({ ...formData, flightDetails: [updated, ...otherFlights] });
  };

  // Transport functions
  const updateTransportQuantity = (transportId: string, delta: number) => {
    const existingIndex = formData.transportOptions.findIndex(t => t.transportId === transportId);
    
    if (existingIndex >= 0) {
      const updated = [...formData.transportOptions];
      const currentQty = updated[existingIndex].quantity || 0;
      const newQty = Math.max(0, currentQty + delta);
      
      if (newQty === 0) {
        updated.splice(existingIndex, 1);
      } else {
        updated[existingIndex].quantity = newQty;
      }
      setFormData({ ...formData, transportOptions: updated });
    } else if (delta > 0 && selectedRouteId) {
      setFormData({
        ...formData,
        transportOptions: [
          ...formData.transportOptions,
          {
            transportId,
            routeId: selectedRouteId,
            quantity: 1,
          },
        ],
      });
    }
  };

  if (loadingMasters) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reservation Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Reservation Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reservationDate">Reservation Date *</Label>
              <Input
                id="reservationDate"
                type="date"
                value={formData.reservationDate}
                onChange={(e) => setFormData({ ...formData, reservationDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guestName">Guest Name *</Label>
              <Input
                id="guestName"
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                placeholder="Enter guest name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paxCount">Passenger Count *</Label>
              <Input
                id="paxCount"
                type="number"
                value={formData.paxCount}
                onChange={(e) => setFormData({ ...formData, paxCount: parseInt(e.target.value) || 1 })}
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guestMobile">Guest Mobile</Label>
              <Input
                id="guestMobile"
                value={formData.guestMobile}
                onChange={(e) => setFormData({ ...formData, guestMobile: e.target.value })}
                placeholder="Enter mobile number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupCode">Group Code</Label>
              <Input
                id="groupCode"
                value={formData.groupCode}
                onChange={(e) => setFormData({ ...formData, groupCode: e.target.value })}
                placeholder="Enter group code"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flight Details - Table Format */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Flight Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Airport</TableHead>
                  <TableHead className="text-xs">Flight Number</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Arrival Row */}
                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-xs">Arrival</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={formData.flightDetails.find(f => f.type === 'AA')?.fromLocationId || ''}
                      onValueChange={(value) => updateArrivalFlight('fromLocationId', value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select arrival airport" />
                      </SelectTrigger>
                      <SelectContent>
                        {airports.map((airport: any) => (
                          <SelectItem key={airport.id} value={airport.id} className="text-xs">
                            {airport.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={formData.flightDetails.find(f => f.type === 'AA')?.number || ''}
                      onChange={(e) => updateArrivalFlight('number', e.target.value)}
                      placeholder="e.g., SV-1234"
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={formData.flightDetails.find(f => f.type === 'AA')?.date || ''}
                      onChange={(e) => updateArrivalFlight('date', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={formData.flightDetails.find(f => f.type === 'AA')?.etd || ''}
                      onChange={(e) => updateArrivalFlight('etd', e.target.value)}
                      placeholder="00:00"
                      className="h-8 text-xs"
                    />
                  </TableCell>
                </TableRow>
                {/* Departure Row */}
                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500"></div>
                      <span className="text-xs">Departure</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={formData.flightDetails.find(f => f.type === 'AD')?.toLocationId || ''}
                      onValueChange={(value) => updateDepartureFlight('toLocationId', value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select departure airport" />
                      </SelectTrigger>
                      <SelectContent>
                        {airports.map((airport: any) => (
                          <SelectItem key={airport.id} value={airport.id} className="text-xs">
                            {airport.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={formData.flightDetails.find(f => f.type === 'AD')?.number || ''}
                      onChange={(e) => updateDepartureFlight('number', e.target.value)}
                      placeholder="e.g., SV-1234"
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={formData.flightDetails.find(f => f.type === 'AD')?.date || ''}
                      onChange={(e) => updateDepartureFlight('date', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={formData.flightDetails.find(f => f.type === 'AD')?.etd || ''}
                      onChange={(e) => updateDepartureFlight('etd', e.target.value)}
                      placeholder="00:00"
                      className="h-8 text-xs"
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Route Selection - Always visible */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Select Route</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Route Type</Label>
              <Select
                value={selectedRouteType}
                onValueChange={(value) => {
                  setSelectedRouteType(value as RouteType | 'all');
                  setSelectedRouteId(null); // Reset route selection when type changes
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select route type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Route Types</SelectItem>
                  <SelectItem value="fulltrip" className="text-xs">Full Trip</SelectItem>
                  <SelectItem value="airporttocity" className="text-xs">Airport to City</SelectItem>
                  <SelectItem value="citytocity" className="text-xs">City to City</SelectItem>
                  <SelectItem value="citytoairport" className="text-xs">City to Airport</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Route</Label>
              <Select
                value={selectedRouteId || ''}
                onValueChange={handleRouteSelect}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select a route to auto-fill movements" />
                </SelectTrigger>
                <SelectContent>
                  {filteredRoutes.length === 0 ? (
                    <SelectItem value="__no_routes__" disabled className="text-xs">
                      No routes available for selected type
                    </SelectItem>
                  ) : (
                    filteredRoutes.map((route: any) => (
                      <SelectItem key={route.id} value={route.id} className="text-xs">
                        {formatRouteDisplay(route)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {selectedRouteId && (
              <div className="flex items-center space-x-2 p-2 border rounded bg-gray-50">
                <MapPin className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-xs font-medium text-gray-900">
                    {formatRouteDisplay(routes.find((r: any) => r.id === selectedRouteId) || {})}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formData.paxCount || 0} Passengers
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Hotel Schedules - Only show for fulltrip */}
      {selectedRouteType === 'fulltrip' && (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Hotel Schedules</CardTitle>
            <Button onClick={addHotel} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Hotel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.hotelSchedules.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No hotel schedules. Click "Add Hotel" to add one.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">City</TableHead>
                    <TableHead className="text-xs">Hotel Name</TableHead>
                    <TableHead className="text-xs">Check In</TableHead>
                    <TableHead className="text-xs">Check Out</TableHead>
                    <TableHead className="text-xs">Days</TableHead>
                    <TableHead className="text-xs">BRN</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.hotelSchedules.map((hotel, idx) => {
                    const cityHotels = hotel.cityName ? getHotelsForCity(hotel.cityName) : [];
                    
                    return (
                      <TableRow key={idx}>
                        <TableCell>{hotel.number}</TableCell>
                        <TableCell>
                          <Select
                            value={hotel.cityName || ''}
                            onValueChange={(value) => {
                              const city = cities.find(c => c.name === value);
                              updateHotel(idx, 'cityName', value);
                              if (city) {
                                updateHotel(idx, 'cityId', city.id);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 w-32 text-xs">
                              <SelectValue placeholder="City" />
                            </SelectTrigger>
                            <SelectContent>
                              {cities.map((city: any) => (
                                <SelectItem key={city.id} value={city.name} className="text-xs">
                                  {city.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={hotel.locationId || ''}
                            onValueChange={(value) => {
                              updateHotel(idx, 'locationId', value);
                              // Update corresponding movements when hotel changes
                              updateMovementsForHotel(idx, value);
                            }}
                            disabled={!hotel.cityName}
                          >
                            <SelectTrigger className="h-8 w-40 text-xs">
                              <SelectValue placeholder="Select hotel" />
                            </SelectTrigger>
                            <SelectContent>
                              {cityHotels.map((loc: any) => (
                                <SelectItem key={loc.id} value={loc.id} className="text-xs">
                                  {loc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={hotel.checkIn}
                            onChange={(e) => updateHotel(idx, 'checkIn', e.target.value)}
                            className="w-40"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={hotel.checkOut}
                            onChange={(e) => updateHotel(idx, 'checkOut', e.target.value)}
                            className="w-40"
                          />
                        </TableCell>
                        <TableCell>{hotel.days}</TableCell>
                        <TableCell>
                          <Input
                            value={hotel.brn || ''}
                            onChange={(e) => updateHotel(idx, 'brn', e.target.value)}
                            className="w-32"
                            placeholder="BRN"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeHotel(idx)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Movement Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Movement Details</CardTitle>
            <Button onClick={addMovement} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Movement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.movementDetails.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No movement details. Click "Add Movement" to add one.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sr</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>From City</TableHead>
                    <TableHead>From Location</TableHead>
                    <TableHead>To City</TableHead>
                    <TableHead>To Location</TableHead>
                    <TableHead>Driver 1</TableHead>
                    <TableHead>Driver 2</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.movementDetails.map((movement, idx) => {
                    const fromCityKey = movement.from ? movement.from.toLowerCase().trim() : '';
                    const toCityKey = movement.to ? movement.to.toLowerCase().trim() : '';
                    const fromCityLocations = fromCityKey ? (locationsByCity.get(fromCityKey) || []) : [];
                    const toCityLocations = toCityKey ? (locationsByCity.get(toCityKey) || []) : [];
                    
                    return (
                      <TableRow key={idx}>
                        <TableCell>{movement.sr}</TableCell>
                        <TableCell>
                          <Input
                            value={movement.route}
                            readOnly
                            className="w-24 bg-gray-50"
                            placeholder="Auto"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={movement.date}
                            onChange={(e) => updateMovement(idx, 'date', e.target.value)}
                            className="w-40"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={movement.time}
                            onChange={(e) => updateMovement(idx, 'time', e.target.value)}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={movement.from || ''}
                            onValueChange={(value) => {
                              const city = cities.find(c => c.name === value);
                              updateMovement(idx, 'from', value);
                              if (city) {
                                updateMovement(idx, 'fromCityId', city.id);
                              }
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="City" />
                            </SelectTrigger>
                            <SelectContent>
                              {cities.map((city: any) => (
                                <SelectItem key={city.id} value={city.name}>
                                  {city.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={movement.fromLocationId || ''}
                            onValueChange={(value) => updateMovement(idx, 'fromLocationId', value)}
                            disabled={!movement.from}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Location" />
                            </SelectTrigger>
                            <SelectContent>
                              {fromCityLocations.map((loc: any) => (
                                <SelectItem key={loc.id} value={loc.id}>
                                  {loc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={movement.to || ''}
                            onValueChange={(value) => {
                              const city = cities.find(c => c.name === value);
                              updateMovement(idx, 'to', value);
                              if (city) {
                                updateMovement(idx, 'toCityId', city.id);
                              }
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="City" />
                            </SelectTrigger>
                            <SelectContent>
                              {cities.map((city: any) => (
                                <SelectItem key={city.id} value={city.name}>
                                  {city.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={movement.toLocationId || ''}
                            onValueChange={(value) => updateMovement(idx, 'toLocationId', value)}
                            disabled={!movement.to}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Location" />
                            </SelectTrigger>
                            <SelectContent>
                              {toCityLocations.map((loc: any) => (
                                <SelectItem key={loc.id} value={loc.id}>
                                  {loc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Textarea
                            value={movement.driverDetails1 || ''}
                            onChange={(e) => updateMovement(idx, 'driverDetails1', e.target.value)}
                            className="w-32 min-h-[60px] resize-none"
                            placeholder="Driver 1"
                            rows={2}
                          />
                        </TableCell>
                        <TableCell>
                          <Textarea
                            value={movement.driverDetails2 || ''}
                            onChange={(e) => updateMovement(idx, 'driverDetails2', e.target.value)}
                            className="w-32 min-h-[60px] resize-none"
                            placeholder="Driver 2"
                            rows={2}
                          />
                        </TableCell>
                        <TableCell>
                          <Textarea
                            value={movement.vehicleNumber || ''}
                            onChange={(e) => updateMovement(idx, 'vehicleNumber', e.target.value)}
                            className="w-32 min-h-[60px] resize-none"
                            placeholder="Vehicle"
                            rows={2}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMovement(idx)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transport Options - Moved to very bottom, with selected route as default */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Transport Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {selectedRouteId && (
              <>
                {loadingTransports ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                    <span className="ml-2 text-xs text-gray-600">Loading transport vehicles...</span>
                  </div>
                ) : transports.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4 text-center">No transport vehicles available for this route.</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-medium">Vehicle Name</TableHead>
                          <TableHead className="text-xs font-medium">Capacity</TableHead>
                          <TableHead className="text-xs font-medium">Price</TableHead>
                          <TableHead className="text-xs font-medium">Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transports.map((transport: any) => {
                          const existingTransport = formData.transportOptions.find(t => t.transportId === transport.id);
                          const quantity = existingTransport?.quantity || 0;
                          const isSelected = quantity > 0;
                          
                          return (
                            <TableRow key={transport.id} className={isSelected ? 'bg-red-50' : ''}>
                              <TableCell className="text-xs">
                                <div className="flex items-center space-x-2">
                                  <Truck className={`h-3 w-3 ${isSelected ? 'text-red-600' : 'text-gray-400'}`} />
                                  <span>{transport.vehicleType?.vehicleName || 'N/A'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs">{transport.vehicleType?.paxCount || 0} PAX</TableCell>
                              <TableCell className="text-xs">₹{Number(transport.price || 0).toLocaleString('en-IN')}</TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateTransportQuantity(transport.id, -1)}
                                    disabled={quantity === 0}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center text-xs font-medium">{quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateTransportQuantity(transport.id, 1)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={() => {
            setFormData({
              reservationDate: new Date().toISOString().split('T')[0],
              guestName: '',
              guestMobile: '',
              groupCode: '',
              paxCount: 1,
              hotelSchedules: [],
              movementDetails: [],
              flightDetails: [],
              transportOptions: [],
            });
            setSelectedRouteId(null);
            setSelectedRouteType('all');
          }}
        >
          Reset
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Voucher
        </Button>
      </div>
    </div>
  );
}
