'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaAPI, umrahVisaMasterAPI, locationMasterAPI, cityMasterAPI, transportMasterAPI, transportRouteMasterAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plane, Users, Building, MapPin, Mail, ArrowLeft, Clock, DollarSign, Route, Truck, ArrowRight, X, Plus } from 'lucide-react';

export default function EditUmrahVisaBookingPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = (params?.id as string) || '';
  const user = getUser();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  // Form state
  const [groupNumber, setGroupNumber] = useState('');
  const [groupName, setGroupName] = useState('');
  
  // Travel Details
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [arrivalAirportId, setArrivalAirportId] = useState('');
  const [arrivalFlightNumber, setArrivalFlightNumber] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [departureAirportId, setDepartureAirportId] = useState('');
  const [departureFlightNumber, setDepartureFlightNumber] = useState('');

  // Accommodation
  const [accommodationType, setAccommodationType] = useState<'hotel' | 'iqama'>('hotel');
  const [hotelBookings, setHotelBookings] = useState<any[]>([]);
  const [iqamaNumber, setIqamaNumber] = useState('');
  const [iqamaName, setIqamaName] = useState('');
  const [iqamaDob, setIqamaDob] = useState('');
  const [iqamaMobile, setIqamaMobile] = useState('');
  const [iqamaNationalShortAddress, setIqamaNationalShortAddress] = useState('');

  // Transportation
  const [transportBookings, setTransportBookings] = useState<any[]>([]);

  // Movement Details
  const [movementDetails, setMovementDetails] = useState<any[]>([]);

  // Passengers
  const [passengers, setPassengers] = useState<any[]>([]);

  // Master Data
  const [airports, setAirports] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [transportRoutes, setTransportRoutes] = useState<any[]>([]);
  const [transportMasters, setTransportMasters] = useState<any[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const load = async () => {
    try {
      setLoading(true);
      
      // Load booking data
      const res = await umrahVisaAPI.getBookingById(bookingId);
      const b = res.data;
      setBooking(b);

      // Group details
      setGroupNumber(b.groupNumber || '');
      setGroupName(b.groupName || '');

      // Travel details - parse datetime
      if (b.travelDetails?.arrivalDateTime) {
        const arrival = new Date(b.travelDetails.arrivalDateTime);
        setArrivalDate(arrival.toISOString().split('T')[0]);
        setArrivalTime(arrival.toTimeString().slice(0, 5));
      }
      setArrivalAirportId(b.travelDetails?.arrivalAirportId || '');
      setArrivalFlightNumber(b.travelDetails?.arrivalFlightNumber || '');

      if (b.travelDetails?.departureDateTime) {
        const departure = new Date(b.travelDetails.departureDateTime);
        setDepartureDate(departure.toISOString().split('T')[0]);
        setDepartureTime(departure.toTimeString().slice(0, 5));
      }
      setDepartureAirportId(b.travelDetails?.departureAirportId || '');
      setDepartureFlightNumber(b.travelDetails?.departureFlightNumber || '');

      // Accommodation
      setAccommodationType(b.accommodationType || 'hotel');
      setHotelBookings(b.hotelBookings || []);
      
      if (b.sponsorIqamaDetails) {
        setIqamaNumber(b.sponsorIqamaDetails.iqamaNumber || '');
        setIqamaName(b.sponsorIqamaDetails.iqamaSponserName || '');
        if (b.sponsorIqamaDetails.sponserDob) {
          setIqamaDob(new Date(b.sponsorIqamaDetails.sponserDob).toISOString().split('T')[0]);
        }
        setIqamaMobile(b.sponsorIqamaDetails.sponserMobileNumber || '');
        setIqamaNationalShortAddress(b.sponsorIqamaDetails.iqamaNationalShortAddress || '');
      }

      // Transportation
      setTransportBookings(b.transportBookings || []);

      // Movement Details
      setMovementDetails(b.movementDetails || []);

      // Passengers
      setPassengers(b.passengers || []);

      // Load master data
      await loadMasterData();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const loadMasterData = async () => {
    try {
      const [airportsRes, citiesRes, locationsRes] = await Promise.all([
        umrahVisaMasterAPI.getAirports(),
        cityMasterAPI.getActive(),
        locationMasterAPI.getActive(),
      ]);

      setAirports(airportsRes.data?.locationMasters || airportsRes.data?.airports || []);
      setCities(citiesRes.data?.cityMasters || citiesRes.data || []);
      setLocations(locationsRes.data?.locationMasters || locationsRes.data || []);

      // Load hotels (filter by locationType = HOTEL)
      const hotelLocations = locations.filter((loc: any) => loc.locationType === 'HOTEL');
      setHotels(hotelLocations);

      // Load transport routes and masters
      const [routesRes, mastersRes] = await Promise.all([
        transportRouteMasterAPI.getActive(),
        transportMasterAPI.getActive(),
      ]);
      setTransportRoutes(routesRes.data?.transportRouteMasters || routesRes.data || []);
      setTransportMasters(mastersRes.data?.transportMasters || mastersRes.data || []);
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  const formatDateTime = (dateTime?: string | Date) => {
    if (!dateTime) return { date: '', time: '' };
    try {
      const dt = new Date(dateTime);
      return {
        date: dt.toISOString().split('T')[0],
        time: dt.toTimeString().slice(0, 5),
      };
    } catch {
      return { date: '', time: '' };
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // 1. Group details
      await umrahVisaAPI.updateGroupNumber(bookingId, groupNumber, groupName);

      // 2. Travel details
      await umrahVisaAPI.updateTravelDetails(bookingId, {
        arrivalDate,
        arrivalTime,
        arrivalAirportId,
        arrivalFlightNumber,
        departureDate,
        departureTime,
        departureAirportId,
        departureFlightNumber,
      });

      // 3. Accommodation
      if (accommodationType === 'hotel') {
        // Update hotel bookings (dates only via existing API)
        await umrahVisaAPI.updateAccommodation(bookingId, {
          accommodationType: 'hotel',
          hotelBookings: hotelBookings.map(h => ({
            id: h.id,
            checkInDate: h.checkInDate,
            checkOutDate: h.checkOutDate,
          })),
        });
      } else if (accommodationType === 'iqama') {
        await umrahVisaAPI.updateAccommodation(bookingId, {
          accommodationType: 'iqama',
          iqamaSponserName: iqamaName,
          iqamaNumber: iqamaNumber,
          sponserDob: iqamaDob,
          sponserMobileNumber: iqamaMobile,
          sponserNationalShortAddress: iqamaNationalShortAddress,
        });
      }

      // 4. Passengers
      await umrahVisaAPI.updatePassengers(bookingId, passengers.map(p => ({
        id: p.id,
        fullName: p.fullName,
        passportNumber: p.passportNumber,
        nationality: p.nationality,
      })));

      toast.success('Booking updated successfully');
      await load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Hotel booking handlers
  const addHotelBooking = async () => {
    try {
      const lastBooking = hotelBookings[hotelBookings.length - 1];
      const res = await umrahVisaAPI.createHotelBooking(bookingId, {
        locationId: lastBooking?.locationId || locations.find((l: any) => l.locationType === 'OTHERS')?.id || '',
        hotelId: lastBooking?.hotelId || hotels[0]?.id || '',
        checkInDate: lastBooking?.checkOutDate || arrivalDate || new Date().toISOString().split('T')[0],
        checkOutDate: departureDate || new Date().toISOString().split('T')[0],
      });
      setHotelBookings(prev => [...prev, res.data.hotelBooking]);
      toast.success('Hotel booking added');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to add hotel booking');
    }
  };

  const removeHotelBooking = async (id: string, index: number) => {
    try {
      await umrahVisaAPI.deleteHotelBooking(id);
      setHotelBookings(prev => prev.filter((_, i) => i !== index));
      toast.success('Hotel booking removed');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to remove hotel booking');
    }
  };

  const updateHotelBooking = (index: number, field: string, value: any) => {
    setHotelBookings(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  // Passenger handlers
  const addPassenger = () => {
    setPassengers(prev => [...prev, {
      id: `new-${Date.now()}`,
      fullName: '',
      passportNumber: '',
      nationality: '',
      isLeadPassenger: prev.length === 0,
    }]);
  };

  const removePassenger = (index: number) => {
    const passenger = passengers[index];
    if (passenger.id && !passenger.id.startsWith('new-')) {
      // Existing passenger - would need delete API
      toast.error('Cannot remove existing passengers. Please contact support.');
      return;
    }
    setPassengers(prev => prev.filter((_, i) => i !== index));
  };

  const updatePassenger = (index: number, field: string, value: any) => {
    setPassengers(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  // Get location name helper
  const getLocationName = (locationId: string) => {
    const location = locations.find((l: any) => l.id === locationId);
    return location?.name || 'N/A';
  };

  // Get city name helper
  const getCityName = (cityId: string) => {
    const city = cities.find((c: any) => c.id === cityId);
    return city?.name || 'N/A';
  };

  // Get airport name helper
  const getAirportName = (airportId: string) => {
    const airport = airports.find((a: any) => a.id === airportId);
    return airport?.name || airport?.airportName || 'N/A';
  };

  // Get hotels for a location
  const getHotelsForLocation = (locationId: string) => {
    if (!locationId) return hotels;
    // Hotels are LocationMasters with locationType = HOTEL
    // Filter by city if location has cityId
    const location = locations.find((l: any) => l.id === locationId);
    if (location?.cityId) {
      return hotels.filter((h: any) => h.cityId === location.cityId);
    }
    return hotels;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      </div>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="leading-tight">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Edit Umrah Visa Booking</h1>
                <p className="text-sm text-gray-500">ID: {bookingId}</p>
              </div>
              <div className="flex items-center gap-3">
                {booking && (
                  <Badge className={`text-sm font-medium ${
                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    booking.status === 'documents_downloaded' ? 'bg-purple-100 text-purple-800' :
                    booking.status === 'group_assigned' ? 'bg-blue-100 text-blue-800' :
                    booking.status === 'voucher' ? 'bg-orange-100 text-orange-800' :
                    booking.status === 'bill' ? 'bg-indigo-100 text-indigo-800' :
                    booking.status === 'booking_success' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {booking.status?.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                )}
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-8">
          {loading ? (
            <div className="py-12 text-center">Loading...</div>
          ) : !booking ? (
            <div className="py-12 text-center text-gray-500">No booking details available</div>
          ) : (
            <div className="space-y-4 lg:space-y-6">
              {/* Summary Card - Key Info (Read-only Party Details) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><Building className="h-5 w-5 text-blue-600" /> Booking Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Party Name</p>
                      <p className="text-lg font-bold text-gray-900">{booking.party?.partyName || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Group Number</p>
                      <Input 
                        value={groupNumber} 
                        onChange={(e) => setGroupNumber(e.target.value)} 
                        placeholder="Group Number"
                        className="font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Group Name</p>
                      <Input 
                        value={groupName} 
                        onChange={(e) => setGroupName(e.target.value)} 
                        placeholder="Group Name"
                        className="font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Passengers</p>
                      <p className="text-lg font-bold text-gray-900">{booking.passengerCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Party Information (Read-only) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Mail className="h-5 w-5 text-indigo-600" /> Party Contact Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Email</p>
                      <p className="text-sm text-gray-900 break-all">{booking.party?.email || 'N/A'}</p>
                    </div>
                    {booking.party?.contactNumber && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Contact</p>
                        <p className="text-sm text-gray-900">{booking.party.contactNumber}</p>
                      </div>
                    )}
                    {booking.party?.whatsappNumber && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">WhatsApp</p>
                        <p className="text-sm text-gray-900">{booking.party.whatsappNumber}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Travel Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Plane className="h-5 w-5 text-sky-600" /> Travel Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="border-l-4 border-sky-500 pl-4 py-2 space-y-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Arrival</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Date</label>
                          <Input 
                            type="date" 
                            value={arrivalDate} 
                            onChange={(e) => setArrivalDate(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Time</label>
                          <Input 
                            type="time" 
                            value={arrivalTime} 
                            onChange={(e) => setArrivalTime(e.target.value)} 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Airport</label>
                        <Select value={arrivalAirportId} onValueChange={setArrivalAirportId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select airport" />
                          </SelectTrigger>
                          <SelectContent>
                            {airports.map(a => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name || a.airportName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Flight Number</label>
                        <Input 
                          value={arrivalFlightNumber} 
                          onChange={(e) => setArrivalFlightNumber(e.target.value)} 
                          placeholder="Flight Number"
                        />
                      </div>
                    </div>
                    <div className="border-l-4 border-orange-500 pl-4 py-2 space-y-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Departure</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Date</label>
                          <Input 
                            type="date" 
                            value={departureDate} 
                            onChange={(e) => setDepartureDate(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Time</label>
                          <Input 
                            type="time" 
                            value={departureTime} 
                            onChange={(e) => setDepartureTime(e.target.value)} 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Airport</label>
                        <Select value={departureAirportId} onValueChange={setDepartureAirportId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select airport" />
                          </SelectTrigger>
                          <SelectContent>
                            {airports.map(a => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name || a.airportName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Flight Number</label>
                        <Input 
                          value={departureFlightNumber} 
                          onChange={(e) => setDepartureFlightNumber(e.target.value)} 
                          placeholder="Flight Number"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transportation Vehicles */}
              {transportBookings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Truck className="h-5 w-5 text-green-600" /> 
                      Transportation Vehicles ({transportBookings.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {transportBookings.map((t: any, idx: number) => {
                        const route = t.transportMaster?.route;
                        const vehicleType = t.transportMaster?.vehicleType;
                        const travelDateTime = formatDateTime(t.travelDateTime);
                        
                        return (
                          <div key={t.id || idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">Route</label>
                                <p className="text-sm font-medium text-gray-900">
                                  {route ? [
                                    route.city1?.name,
                                    route.city2?.name,
                                    route.city3?.name,
                                    route.city4?.name,
                                  ].filter(Boolean).join(' → ') : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">Travel Date</label>
                                <Input 
                                  type="date" 
                                  value={travelDateTime.date} 
                                  onChange={(e) => {
                                    const newDate = e.target.value;
                                    const newDateTime = new Date(`${newDate}T${travelDateTime.time}`);
                                    setTransportBookings(prev => prev.map((tb, i) => 
                                      i === idx ? { ...tb, travelDateTime: newDateTime.toISOString() } : tb
                                    ));
                                  }}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">Travel Time</label>
                                <Input 
                                  type="time" 
                                  value={travelDateTime.time} 
                                  onChange={(e) => {
                                    const newTime = e.target.value;
                                    const newDateTime = new Date(`${travelDateTime.date}T${newTime}`);
                                    setTransportBookings(prev => prev.map((tb, i) => 
                                      i === idx ? { ...tb, travelDateTime: newDateTime.toISOString() } : tb
                                    ));
                                  }}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">Vehicle Type</label>
                                <p className="text-sm text-gray-900">{vehicleType?.vehicleName || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">Price</label>
                                <p className="text-sm font-semibold text-gray-900">
                                  {t.transportMaster?.price ? `₹${Number(t.transportMaster.price).toLocaleString('en-IN')}` : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Movement Details */}
              {movementDetails.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Route className="h-5 w-5 text-blue-600" /> 
                      Movement Details ({movementDetails.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {movementDetails.map((movement: any, index: number) => {
                        const travelDateTime = formatDateTime(movement.travelDateTime);
                        const isZiyarath = movement.toLocation?.locationType === 'ZIYARAT';
                        
                        return (
                          <div 
                            key={movement.id} 
                            className={`border rounded-lg p-4 ${isZiyarath ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                  isZiyarath ? 'bg-purple-200' : 'bg-blue-100'
                                }`}>
                                  <span className={`text-xs font-bold ${isZiyarath ? 'text-purple-700' : 'text-blue-600'}`}>
                                    {isZiyarath ? 'Z' : '#'}{index + 1}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    {isZiyarath ? 'Ziyarath' : 'Route'} {index + 1}
                                  </p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {getCityName(movement.fromCityId)} → {isZiyarath ? getLocationName(movement.toLocationId) : getCityName(movement.toCityId)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right space-y-2">
                                <div>
                                  <label className="text-xs text-gray-600 mb-1 block">Date</label>
                                  <Input 
                                    type="date" 
                                    value={travelDateTime.date}
                                    onChange={(e) => {
                                      const newDate = e.target.value;
                                      const newDateTime = new Date(`${newDate}T${travelDateTime.time}`);
                                      setMovementDetails(prev => prev.map((md, i) => 
                                        i === index ? { ...md, travelDateTime: newDateTime.toISOString() } : md
                                      ));
                                    }}
                                    className="w-40"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600 mb-1 block">Time</label>
                                  <Input 
                                    type="time" 
                                    value={travelDateTime.time}
                                    onChange={(e) => {
                                      const newTime = e.target.value;
                                      const newDateTime = new Date(`${travelDateTime.date}T${newTime}`);
                                      setMovementDetails(prev => prev.map((md, i) => 
                                        i === index ? { ...md, travelDateTime: newDateTime.toISOString() } : md
                                      ));
                                    }}
                                    className="w-40"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                              <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">From</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {getLocationName(movement.fromLocationId)}
                                </p>
                                <p className="text-xs text-gray-600">{getCityName(movement.fromCityId)}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">To</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {getLocationName(movement.toLocationId)}
                                </p>
                                <p className="text-xs text-gray-600">{getCityName(movement.toCityId)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Accommodation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Building className="h-5 w-5 text-purple-600" /> Accommodation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Building className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</p>
                      <Select value={accommodationType} onValueChange={(val: any) => setAccommodationType(val)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hotel">Hotel</SelectItem>
                          <SelectItem value="iqama">Iqama</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Hotel Details */}
                  {accommodationType === 'hotel' && (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <Button type="button" variant="outline" onClick={addHotelBooking}>
                          <Plus className="h-4 w-4 mr-1" /> Add Hotel Booking
                        </Button>
                      </div>
                      {hotelBookings.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Building className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">No hotel bookings found</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200">
                                <th className="py-3 px-4">Location</th>
                                <th className="py-3 px-4">Hotel Name</th>
                                <th className="py-3 px-4">Check-In</th>
                                <th className="py-3 px-4">Check-Out</th>
                                <th className="py-3 px-4">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {hotelBookings.map((h: any, idx: number) => {
                                const locationName = h.location?.name || h.location?.cityMaster?.name || 'N/A';
                                const hotelName = h.hotel?.name || 'N/A';
                                const checkIn = h.checkInDate ? new Date(h.checkInDate).toISOString().split('T')[0] : '';
                                const checkOut = h.checkOutDate ? new Date(h.checkOutDate).toISOString().split('T')[0] : '';
                                
                                return (
                                  <tr key={h.id || idx} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4">
                                      <Select 
                                        value={h.locationId || ''} 
                                        onValueChange={(val) => updateHotelBooking(idx, 'locationId', val)}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Select location" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {locations.filter((l: any) => l.locationType === 'OTHERS').map((loc: any) => (
                                            <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </td>
                                    <td className="py-3 px-4">
                                      <Select 
                                        value={h.hotelId || ''} 
                                        onValueChange={(val) => updateHotelBooking(idx, 'hotelId', val)}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Select hotel" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {getHotelsForLocation(h.locationId).map((hotel: any) => (
                                            <SelectItem key={hotel.id} value={hotel.id}>{hotel.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </td>
                                    <td className="py-3 px-4">
                                      <Input 
                                        type="date" 
                                        value={checkIn} 
                                        onChange={(e) => updateHotelBooking(idx, 'checkInDate', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-3 px-4">
                                      <Input 
                                        type="date" 
                                        value={checkOut} 
                                        onChange={(e) => updateHotelBooking(idx, 'checkOutDate', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-3 px-4">
                                      {h.id && (
                                        <Button 
                                          type="button" 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => removeHotelBooking(h.id, idx)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Iqama Details */}
                  {accommodationType === 'iqama' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Iqama Number</label>
                        <Input 
                          value={iqamaNumber} 
                          onChange={(e) => setIqamaNumber(e.target.value)} 
                          placeholder="Iqama Number"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Holder Name</label>
                        <Input 
                          value={iqamaName} 
                          onChange={(e) => setIqamaName(e.target.value)} 
                          placeholder="Holder Name"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date of Birth</label>
                        <Input 
                          type="date" 
                          value={iqamaDob} 
                          onChange={(e) => setIqamaDob(e.target.value)} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Mobile Number</label>
                        <Input 
                          value={iqamaMobile} 
                          onChange={(e) => setIqamaMobile(e.target.value)} 
                          placeholder="Mobile Number"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">National Short Address</label>
                        <Input 
                          value={iqamaNationalShortAddress} 
                          onChange={(e) => setIqamaNationalShortAddress(e.target.value)} 
                          placeholder="National Short Address"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Passengers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-rose-600" /> 
                    Passengers ({passengers.length})
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={addPassenger}
                      className="ml-auto"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Passenger
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {passengers.map((p: any, idx: number) => (
                      <div 
                        key={p.id || idx} 
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <Input 
                              value={p.fullName || ''} 
                              onChange={(e) => updatePassenger(idx, 'fullName', e.target.value)} 
                              placeholder="Full Name"
                              className="font-bold mb-2"
                            />
                            {p.isLeadPassenger && (
                              <Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs font-semibold mb-2">
                                Lead Passenger
                              </Badge>
                            )}
                          </div>
                          {p.id && p.id.startsWith('new-') && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removePassenger(idx)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">Passport Number</label>
                            <Input 
                              value={p.passportNumber || ''} 
                              onChange={(e) => updatePassenger(idx, 'passportNumber', e.target.value)} 
                              placeholder="Passport Number"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">Nationality</label>
                            <Input 
                              value={p.nationality || ''} 
                              onChange={(e) => updatePassenger(idx, 'nationality', e.target.value)} 
                              placeholder="Nationality"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
