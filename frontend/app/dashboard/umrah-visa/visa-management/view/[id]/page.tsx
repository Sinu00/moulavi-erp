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
import { Calendar, Plane, Users, Building, MapPin, Mail, CheckCircle, ArrowLeft, Clock, DollarSign } from 'lucide-react';

export default function ViewUmrahVisaBookingPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = (params?.id as string) || '';
  const user = getUser();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);

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
      setBooking(res.data);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (time?: string) => {
    if (!time) return 'N/A';
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{booking?.groupName || 'Not Assigned'}</h1>
                <p className="text-sm text-gray-500">ID: {booking?.groupNumber || 'Not Assigned'}</p>
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
              {/* Summary Card - Key Info */}
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
                      <p className="text-lg font-bold text-gray-900">{booking.groupNumber || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Passengers</p>
                      <p className="text-lg font-bold text-gray-900">{booking.passengerCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Party Information */}
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
                    <div className="border-l-4 border-sky-500 pl-4 py-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Arrival</p>
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900 flex items-center gap-2 mb-2"><Calendar className="h-4 w-4 text-sky-600" />{formatDate(booking.travelDetails?.arrivalDate || booking.arrivalDate)}</div>
                        <div className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><Clock className="h-4 w-4 text-sky-600" />{formatTime(booking.travelDetails?.arrivalTime as any)}</div>
                        <div className="text-sm text-gray-600 mb-1"><span className="font-medium">Airport:</span> {booking.travelDetails?.arrivalAirport?.airportName || booking.arrivalAirport || 'N/A'}</div>
                        <div className="text-sm text-gray-600"><span className="font-medium">Flight:</span> {booking.travelDetails?.arrivalFlightNumber || booking.flightNumber || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="border-l-4 border-orange-500 pl-4 py-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Departure</p>
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900 flex items-center gap-2 mb-2"><Calendar className="h-4 w-4 text-orange-600" />{formatDate(booking.travelDetails?.departureDate || booking.departureDate)}</div>
                        <div className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><Clock className="h-4 w-4 text-orange-600" />{formatTime(booking.travelDetails?.departureTime as any)}</div>
                        <div className="text-sm text-gray-600 mb-1"><span className="font-medium">Airport:</span> {booking.travelDetails?.departureAirport?.airportName || booking.departureAirport || 'N/A'}</div>
                        <div className="text-sm text-gray-600"><span className="font-medium">Flight:</span> {booking.travelDetails?.departureFlightNumber || booking.returnFlightNumber || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transportation */}
              {Array.isArray(booking.transportBookings) && booking.transportBookings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-green-600" /> Transportation ({booking.transportBookings.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200">
                            <th className="py-3 px-4">Route</th>
                            <th className="py-3 px-4">Travel Date</th>
                            <th className="py-3 px-4">Vehicle Type</th>
                            <th className="py-3 px-4">Passengers</th>
                            <th className="py-3 px-4">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {booking.transportBookings.map((t: any) => (
                            <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 text-sm font-medium text-gray-900">{t.fromLocation?.destinationName || t.from} → {t.toLocation?.destinationName || t.to}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">{formatDate(t.travelDate || t.date)}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">{t.vehicleType}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">{t.paxCount}</td>
                              <td className="py-3 px-4 text-sm font-semibold text-gray-900 flex items-center gap-1"><DollarSign className="h-4 w-4 text-green-600" />{t.price ? `${Number(t.price).toFixed(2)}` : 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</p>
                      <p className="text-sm font-bold text-gray-900 capitalize">{booking.accommodationType}</p>
                    </div>
                  </div>
                  {booking.accommodationType === 'hotel' && Array.isArray(booking.accommodationDetails?.hotelBookings) && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200">
                            <th className="py-3 px-4">Location</th>
                            <th className="py-3 px-4">Hotel Name</th>
                            <th className="py-3 px-4">Check-In</th>
                            <th className="py-3 px-4">Check-Out</th>
                          </tr>
                        </thead>
                        <tbody>
                          {booking.accommodationDetails.hotelBookings.map((h: any) => (
                            <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 text-sm font-medium text-gray-900">{h.location?.destinationName || 'N/A'}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">{h.hotel?.hotelName || h.hotelId || 'N/A'}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">{formatDate(h.checkInDate)}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">{formatDate(h.checkOutDate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {booking.accommodationType === 'iqama' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Iqama Number</p>
                        <p className="text-sm font-medium text-gray-900">{booking.accommodationDetails?.iqamaNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Holder Name</p>
                        <p className="text-sm font-medium text-gray-900">{booking.accommodationDetails?.iqamaName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Date of Birth</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(booking.accommodationDetails?.iqamaDob as any)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Mobile</p>
                        <p className="text-sm font-medium text-gray-900">{booking.accommodationDetails?.iqamaMobile || 'N/A'}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Passengers & Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-rose-600" /> Passengers ({booking.passengers?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(booking.passengers || []).map((p: any) => (
                      <div key={p.id} className="border-l-4 border-rose-300 bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-gray-900">{p.fullName}</div>
                          {p.isLeadPassenger && (
                            <Badge className="bg-rose-100 text-rose-800 border-0 text-xs flex items-center gap-1 font-semibold">
                              <CheckCircle className="h-3 w-3" /> Lead
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-sm">
                          <div><span className="text-gray-600 font-medium">Passport:</span> <span className="text-gray-900 font-semibold">{p.passportNumber}</span></div>
                          <div><span className="text-gray-600 font-medium">Nationality:</span> <span className="text-gray-900 font-semibold">{p.nationality}</span></div>
                        </div>
                        {Array.isArray(p.documents) && p.documents.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Documents ({p.documents.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {p.documents.map((d: any) => (
                                <Badge key={d.id} variant="outline" className="text-xs bg-white border-rose-200 text-gray-700">
                                  {d.documentType || d.type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
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
