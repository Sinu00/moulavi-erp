'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, Building, MapPin, Mail, CheckCircle, ArrowLeft } from 'lucide-react';

export default function EditUmrahVisaBookingPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = (params?.id as string) || '';
  const user = getUser();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  // Editable form state mirrors the view page
  const [groupNumber, setGroupNumber] = useState('');
  const [groupName, setGroupName] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [arrivalAirportId, setArrivalAirportId] = useState('');
  const [arrivalFlightNumber, setArrivalFlightNumber] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [departureAirportId, setDepartureAirportId] = useState('');
  const [departureFlightNumber, setDepartureFlightNumber] = useState('');

  const [accommodationType, setAccommodationType] = useState<'hotel' | 'iqama' | any>('hotel');
  const [iqamaNumber, setIqamaNumber] = useState('');
  const [iqamaName, setIqamaName] = useState('');
  const [iqamaDob, setIqamaDob] = useState('');
  const [iqamaMobile, setIqamaMobile] = useState('');

  const [hotelBookings, setHotelBookings] = useState<any[]>([]);
  const [transportBookings, setTransportBookings] = useState<any[]>([]);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [airports, setAirports] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);

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
      const res = await umrahVisaAPI.getBookingById(bookingId);
      const b = res.data;
      setBooking(b);

      setGroupNumber(b.groupNumber || '');
      setGroupName(b.groupName || '');

      // Travel details (fallback to flat fields if nested missing)
      setArrivalDate((b.travelDetails?.arrivalDate || b.arrivalDate || '').slice(0, 10));
      setArrivalTime((b.travelDetails?.arrivalTime || '').toString().slice(0, 5));
      setArrivalAirportId(b.travelDetails?.arrivalAirportId || '');
      setArrivalFlightNumber(b.travelDetails?.arrivalFlightNumber || b.flightNumber || '');

      setDepartureDate((b.travelDetails?.departureDate || b.departureDate || '').slice(0, 10));
      setDepartureTime((b.travelDetails?.departureTime || '').toString().slice(0, 5));
      setDepartureAirportId(b.travelDetails?.departureAirportId || '');
      setDepartureFlightNumber(b.travelDetails?.departureFlightNumber || b.returnFlightNumber || '');

      setAccommodationType(b.accommodationType);
      setIqamaNumber(b.accommodationDetails?.iqamaNumber || '');
      setIqamaName(b.accommodationDetails?.iqamaName || '');
      setIqamaDob((b.accommodationDetails?.iqamaDob || '').slice(0, 10));
      setIqamaMobile(b.accommodationDetails?.iqamaMobile || '');

      setHotelBookings(b.accommodationDetails?.hotelBookings || []);
      // masters
      const [air, dest] = await Promise.all([
        umrahVisaAPI.getAirports(),
        umrahVisaAPI.getDestinations(),
      ]);
      setAirports(air.data.airports || []);
      setDestinations(dest.data.destinations || []);
      setHotels(dest.data.hotels || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  // Saves group only (other sections prepared for future API endpoints)
  const handleSave = async () => {
    try {
      setSaving(true);
      // 1) Group details
      await umrahVisaAPI.updateGroupNumber(bookingId, groupNumber, groupName);

      // 2) Travel details
      await umrahVisaAPI.updateTravelDetails(bookingId, {
        arrivalDate,
        arrivalTime,
        arrivalFlightNumber,
        departureDate,
        departureTime,
        departureFlightNumber,
        arrivalAirportId,
        departureAirportId,
      });

      // 3) Accommodation
      await umrahVisaAPI.updateAccommodation(bookingId, {
        accommodationType,
        iqamaNumber,
        iqamaName,
        iqamaDob,
        iqamaMobile,
        hotelBookings: hotelBookings.map(h => ({ id: h.id, checkInDate: h.checkInDate, checkOutDate: h.checkOutDate })),
      });

      // 4) Transport bookings
      await umrahVisaAPI.updateTransportBookings(bookingId, transportBookings.map(t => ({
        id: t.id,
        travelDate: t.travelDate,
        travelTime: t.travelTime,
        vehicleType: t.vehicleType,
        paxCount: t.paxCount,
        price: t.price,
      })));

      // 5) Passengers
      await umrahVisaAPI.updatePassengers(bookingId, passengers.map(p => ({ id: p.id, fullName: p.fullName, passportNumber: p.passportNumber, nationality: p.nationality })));

      toast.success('Booking updated');
      await load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateTransport = (idx: number, key: string, val: string) => {
    setTransportBookings(prev => prev.map((t, i) => i === idx ? { ...t, [key]: val } : t));
  };

  const updateHotel = (idx: number, key: string, val: string) => {
    setHotelBookings(prev => prev.map((h, i) => i === idx ? { ...h, [key]: val } : h));
  };

  const updatePassenger = (idx: number, key: string, val: string) => {
    setPassengers(prev => prev.map((p, i) => i === idx ? { ...p, [key]: val } : p));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      </div>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
            <div className="leading-tight">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Edit Umrah Visa Booking</h1>
              <p className="text-sm text-gray-500">ID: {bookingId}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-8">
          {loading ? (
            <div className="py-12 text-center">Loading...</div>
          ) : !booking ? (
            <div className="py-12 text-center text-gray-500">Not found</div>
          ) : (
            <div className="space-y-4 lg:space-y-6">
              {/* Group Details */}
              <Card>
                <CardHeader><CardTitle>Group Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600">Group Number</label>
                    <Input value={groupNumber} onChange={(e) => setGroupNumber(e.target.value)} placeholder="Group Number" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Group Name</label>
                    <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group Name" />
                  </div>
                </CardContent>
              </Card>

              {/* Travel Details */}
              <Card>
                <CardHeader><CardTitle>Travel Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Arrival</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-600">Date</label>
                        <Input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Time</label>
                        <Input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Airport</label>
                      <Select value={arrivalAirportId} onValueChange={setArrivalAirportId}>
                        <SelectTrigger><SelectValue placeholder="Select airport" /></SelectTrigger>
                        <SelectContent>
                          {airports.map(a => (
                            <SelectItem key={a.id} value={a.id}>{a.airportName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Flight Number</label>
                      <Input value={arrivalFlightNumber} onChange={(e) => setArrivalFlightNumber(e.target.value)} placeholder="Arrival Flight No" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Departure</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-600">Date</label>
                        <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Time</label>
                        <Input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Airport</label>
                      <Select value={departureAirportId} onValueChange={setDepartureAirportId}>
                        <SelectTrigger><SelectValue placeholder="Select airport" /></SelectTrigger>
                        <SelectContent>
                          {airports.map(a => (
                            <SelectItem key={a.id} value={a.id}>{a.airportName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Flight Number</label>
                      <Input value={departureFlightNumber} onChange={(e) => setDepartureFlightNumber(e.target.value)} placeholder="Departure Flight No" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Accommodation */}
              <Card>
                <CardHeader><CardTitle>Accommodation</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs text-gray-600">Type</label>
                      <Input value={accommodationType} onChange={(e) => setAccommodationType(e.target.value as any)} />
                    </div>
                    {accommodationType === 'iqama' && (
                      <>
                        <div>
                          <label className="text-xs text-gray-600">Iqama Number</label>
                          <Input value={iqamaNumber} onChange={(e) => setIqamaNumber(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Holder Name</label>
                          <Input value={iqamaName} onChange={(e) => setIqamaName(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">DOB</label>
                          <Input type="date" value={iqamaDob} onChange={(e) => setIqamaDob(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Mobile</label>
                          <Input value={iqamaMobile} onChange={(e) => setIqamaMobile(e.target.value)} />
                        </div>
                      </>
                    )}
                  </div>

                  {accommodationType === 'hotel' && (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const res = await umrahVisaAPI.createHotelBooking(bookingId, {
                                locationId: hotelBookings[0]?.locationId,
                                hotelId: hotelBookings[0]?.hotelId,
                                checkInDate: iqamaDob || new Date().toISOString().slice(0,10),
                                checkOutDate: iqamaDob || new Date().toISOString().slice(0,10),
                              });
                              setHotelBookings(prev => [...prev, res.data.hotelBooking]);
                            } catch (e) { toast.error('Failed to add hotel row'); }
                          }}
                        >Add Hotel Row</Button>
                      </div>
                      {hotelBookings.map((h, idx) => (
                        <div key={h.id || idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-md">
                          <div>
                            <label className="text-xs text-gray-600">Location</label>
                            <Select value={h.locationId} onValueChange={(val)=> updateHotel(idx,'locationId', val)}>
                              <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                              <SelectContent>
                                {destinations.map(d => (<SelectItem key={d.id} value={d.id}>{d.destinationName}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Hotel</label>
                            <Select value={h.hotelId} onValueChange={(val)=> updateHotel(idx,'hotelId', val)}>
                              <SelectTrigger><SelectValue placeholder="Select hotel" /></SelectTrigger>
                              <SelectContent>
                                {hotels.filter(hh => !h.locationId || hh.locationId===h.locationId).map(hh => (
                                  <SelectItem key={hh.id} value={hh.id}>{hh.hotelName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Check-In</label>
                            <Input type="date" value={(h.checkInDate || '').slice(0,10)} onChange={(e) => updateHotel(idx, 'checkInDate', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Check-Out</label>
                            <Input type="date" value={(h.checkOutDate || '').slice(0,10)} onChange={(e) => updateHotel(idx, 'checkOutDate', e.target.value)} />
                          </div>
                          <div className="col-span-1 md:col-span-4 flex justify-end">
                            <Button type="button" variant="outline" onClick={async () => {
                              if (!h.id) return;
                              try { await umrahVisaAPI.deleteHotelBooking(h.id); setHotelBookings(prev => prev.filter((x,i)=>i!==idx)); } catch(e){ toast.error('Delete failed'); }
                            }}>Delete</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Transportation */}
              <Card>
                <CardHeader><CardTitle>Transportation</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" onClick={async ()=>{
                      try {
                        const res = await umrahVisaAPI.createTransportBooking(bookingId, {
                          fromLocationId: transportBookings[0]?.fromLocationId,
                          toLocationId: transportBookings[0]?.toLocationId,
                          travelDate: new Date().toISOString().slice(0,10),
                          vehicleType: 'SEDAN',
                          paxCount: 1,
                          price: 0,
                        });
                        setTransportBookings(prev => [...prev, res.data.transportBooking]);
                      } catch(e) { toast.error('Failed to add transport row'); }
                    }}>Add Transport Row</Button>
                  </div>
                  {transportBookings.map((t, idx) => (
                    <div key={t.id || idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 bg-gray-50 rounded-md">
                      <div>
                        <label className="text-xs text-gray-600">From</label>
                        <Select value={t.fromLocationId} onValueChange={(val)=> updateTransport(idx, 'fromLocationId', val)}>
                          <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                          <SelectContent>
                            {destinations.map(d => (<SelectItem key={d.id} value={d.id}>{d.destinationName}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">To</label>
                        <Select value={t.toLocationId} onValueChange={(val)=> updateTransport(idx, 'toLocationId', val)}>
                          <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                          <SelectContent>
                            {destinations.map(d => (<SelectItem key={d.id} value={d.id}>{d.destinationName}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Date</label>
                        <Input type="date" value={(t.travelDate || '').slice(0,10)} onChange={(e) => updateTransport(idx, 'travelDate', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Time</label>
                        <Input type="time" value={t.travelTime ? (typeof t.travelTime === 'string' && t.travelTime.includes('T') ? t.travelTime.split('T')[1].slice(0,5) : t.travelTime.slice(0,5)) : ''} onChange={(e) => updateTransport(idx, 'travelTime', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Vehicle</label>
                        <Input value={t.vehicleType || ''} onChange={(e) => updateTransport(idx, 'vehicleType', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Pax</label>
                        <Input value={t.paxCount || ''} onChange={(e) => updateTransport(idx, 'paxCount', e.target.value)} />
                      </div>
                      <div className="col-span-1 md:col-span-6 flex justify-end">
                        <Button type="button" variant="outline" onClick={async ()=>{
                          if (!t.id) return; try{ await umrahVisaAPI.deleteTransportBooking(t.id); setTransportBookings(prev=> prev.filter((x,i)=>i!==idx)); } catch(e){ toast.error('Delete failed'); }
                        }}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Passengers */}
              <Card>
                <CardHeader><CardTitle>Passengers</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {passengers.map((p, idx) => (
                    <div key={p.id || idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-md">
                      <div>
                        <label className="text-xs text-gray-600">Full Name</label>
                        <Input value={p.fullName || ''} onChange={(e) => updatePassenger(idx, 'fullName', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Passport</label>
                        <Input value={p.passportNumber || ''} onChange={(e) => updatePassenger(idx, 'passportNumber', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Nationality</label>
                        <Input value={p.nationality || ''} onChange={(e) => updatePassenger(idx, 'nationality', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
