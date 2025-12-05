'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaAPI, uploadAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Plane, Users, Building, MapPin, Mail, CheckCircle, ArrowLeft, Clock, DollarSign, Route, Truck, ArrowRight, Download } from 'lucide-react';

export default function ViewUmrahVisaBookingPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = (params?.id as string) || '';
  const user = getUser();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadingConfirmation, setDownloadingConfirmation] = useState(false);

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
      const bookingData = res.data;
      
      // Debug: Log booking data to console
      console.log('Booking Data:', {
        accommodationType: bookingData.accommodationType,
        hotelBookings: bookingData.hotelBookings,
        hotelBookingsLength: bookingData.hotelBookings?.length,
        sponsorIqamaDetails: bookingData.sponsorIqamaDetails,
      });
      
      setBooking(bookingData);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date?: string | Date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const formatTime = (dateTime?: string | Date) => {
    if (!dateTime) return 'N/A';
    try {
      return new Date(dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  const formatDateTime = (dateTime?: string | Date) => {
    if (!dateTime) return { date: 'N/A', time: 'N/A' };
    try {
      const dt = new Date(dateTime);
      return {
        date: dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        time: dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
    } catch {
      return { date: 'N/A', time: 'N/A' };
    }
  };

  // Helper to format transport route from cities
  const formatTransportRoute = (route: any) => {
    if (!route) return 'N/A';
    const cities = [
      route.city1?.name,
      route.city2?.name,
      route.city3?.name,
      route.city4?.name,
    ].filter(Boolean);
    return cities.length > 0 ? cities.join(' → ') : 'N/A';
  };

  const handleDownloadZip = async () => {
    if (!bookingId || downloadingZip) return;
    
    try {
      setDownloadingZip(true);
      toast.info('Downloading zip file...');
      
      const zipResponse = await umrahVisaAPI.downloadBookingZip(bookingId);
      
      if (zipResponse.data.downloadUrl) {
        // If S3, use presigned URL to download
        const link = document.createElement('a');
        link.href = zipResponse.data.downloadUrl;
        link.download = zipResponse.data.fileName || 'documents.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Zip file downloaded successfully!');
      } else {
        toast.error('Download URL not available');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to download zip file');
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleDownloadConfirmationImage = async () => {
    if (!booking || !bookingId || downloadingConfirmation) return;
    
    const confirmationImagePath = booking.sponsorIqamaDetails?.confirmationImagePath;
    if (!confirmationImagePath) {
      toast.error('Confirmation image not found');
      return;
    }

    try {
      setDownloadingConfirmation(true);
      toast.info('Downloading confirmation image...');

      // Use the dedicated download confirmation endpoint which handles presigned URLs
      const response = await umrahVisaAPI.downloadConfirmation(bookingId);
      
      if (response.data.downloadUrl) {
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = response.data.fileName || 'confirmation-image.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Confirmation image downloaded successfully!');
      } else {
        toast.error('Download URL not available');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to download confirmation image');
    } finally {
      setDownloadingConfirmation(false);
    }
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
                <Button 
                  variant="outline" 
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {downloadingZip ? 'Downloading...' : 'Download Documents'}
                </Button>
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
              {booking.travelDetails && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Plane className="h-5 w-5 text-sky-600" /> Travel Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="border-l-4 border-sky-500 pl-4 py-2">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Arrival</p>
                        <div className="text-sm">
                          {(() => {
                            const arrival = formatDateTime(booking.travelDetails.arrivalDateTime);
                            return (
                              <>
                                <div className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                                  <Calendar className="h-4 w-4 text-sky-600" />
                                  {arrival.date}
                                </div>
                                <div className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                                  <Clock className="h-4 w-4 text-sky-600" />
                                  {arrival.time}
                                </div>
                              </>
                            );
                          })()}
                          <div className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">Airport:</span> {booking.travelDetails.arrivalAirport?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Flight:</span> {booking.travelDetails.arrivalFlightNumber || 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="border-l-4 border-orange-500 pl-4 py-2">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Departure</p>
                        <div className="text-sm">
                          {(() => {
                            const departure = formatDateTime(booking.travelDetails.departureDateTime);
                            return (
                              <>
                                <div className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                                  <Calendar className="h-4 w-4 text-orange-600" />
                                  {departure.date}
                                </div>
                                <div className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                                  <Clock className="h-4 w-4 text-orange-600" />
                                  {departure.time}
                                </div>
                              </>
                            );
                          })()}
                          <div className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">Airport:</span> {booking.travelDetails.departureAirport?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Flight:</span> {booking.travelDetails.departureFlightNumber || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transportation */}
              {Array.isArray(booking.transportBookings) && booking.transportBookings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Truck className="h-5 w-5 text-green-600" /> Transportation Vehicles ({booking.transportBookings.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200">
                            <th className="py-3 px-4">Route</th>
                            <th className="py-3 px-4">Vehicle Type</th>
                            <th className="py-3 px-4">Capacity</th>
                            <th className="py-3 px-4">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {booking.transportBookings.map((t: any) => {
                            const route = t.transportMaster?.route;
                            const vehicleType = t.transportMaster?.vehicleType;
                            const price = t.transportMaster?.price ? Number(t.transportMaster.price) : null;
                            
                            return (
                              <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                  <div className="flex items-center gap-2">
                                    <Route className="h-4 w-4 text-green-600" />
                                    {formatTransportRoute(route)}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-gray-400" />
                                    <span className="font-medium">{vehicleType?.vehicleName || 'N/A'}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-gray-400" />
                                    <span>{vehicleType?.paxCount || 'N/A'} PAX</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-sm font-semibold text-gray-900 flex items-center gap-1">
                                  <DollarSign className="h-4 w-4 text-green-600" />
                                  {price ? `₹${price.toLocaleString('en-IN')}` : 'N/A'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Movement Details & Ziyaraths */}
              {Array.isArray(booking.movementDetails) && booking.movementDetails.length > 0 && (() => {
                const regularMovements = booking.movementDetails.filter((m: any) => m.toLocation?.locationType !== 'ZIYARAT');
                const ziyaraths = booking.movementDetails.filter((m: any) => m.toLocation?.locationType === 'ZIYARAT');
                
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Route className="h-5 w-5 text-blue-600" /> 
                        Movement Details & Ziyaraths ({booking.movementDetails.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Regular Movement Details */}
                      {regularMovements.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Transport Movements</h4>
                          <div className="space-y-4">
                            {regularMovements.map((movement: any, index: number) => {
                              const travelDateTime = formatDateTime(movement.travelDateTime);
                              return (
                                <div key={movement.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                        <span className="text-xs font-bold text-blue-600">{movement.routeNumber || `#${index + 1}`}</span>
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Route {index + 1}</p>
                                        <p className="text-sm font-medium text-gray-900">
                                          {movement.fromCity?.name || 'N/A'} → {movement.toCity?.name || 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Travel Date & Time</div>
                                      <div className="text-sm text-gray-900">
                                        <div className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3 text-gray-400" />
                                          <span>{travelDateTime.date}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3 text-gray-400" />
                                          <span>{travelDateTime.time}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                                    <div>
                                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">From</p>
                                      <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-900">
                                          <MapPin className="h-3 w-3 inline mr-1 text-blue-600" />
                                          {movement.fromLocation?.name || 'N/A'}
                                        </p>
                                        <p className="text-xs text-gray-600 ml-4">{movement.fromCity?.name || 'N/A'}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">To</p>
                                      <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-900">
                                          <MapPin className="h-3 w-3 inline mr-1 text-green-600" />
                                          {movement.toLocation?.name || 'N/A'}
                                        </p>
                                        <p className="text-xs text-gray-600 ml-4">{movement.toCity?.name || 'N/A'}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Ziyaraths */}
                      {ziyaraths.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Ziyaraths</h4>
                          <div className="space-y-4">
                            {ziyaraths.map((ziyarath: any, index: number) => {
                              const travelDateTime = formatDateTime(ziyarath.travelDateTime);
                              return (
                                <div key={ziyarath.id} className="border border-purple-200 rounded-lg p-4 bg-purple-50 hover:bg-purple-100 transition-colors">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className="h-8 w-8 rounded-full bg-purple-200 flex items-center justify-center">
                                        <span className="text-xs font-bold text-purple-700">Z{index + 1}</span>
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Ziyarath {index + 1}</p>
                                        <p className="text-sm font-medium text-gray-900">
                                          {ziyarath.fromCity?.name || 'N/A'} → {ziyarath.toLocation?.name || 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Date & Time</div>
                                      <div className="text-sm text-gray-900">
                                        <div className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3 text-purple-600" />
                                          <span>{travelDateTime.date}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3 text-purple-600" />
                                          <span>{travelDateTime.time}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="pt-3 border-t border-purple-200">
                                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Ziyarath Location</p>
                                    <p className="text-sm font-medium text-gray-900">
                                      <MapPin className="h-3 w-3 inline mr-1 text-purple-600" />
                                      {ziyarath.toLocation?.name || 'N/A'}
                                    </p>
                                    <p className="text-xs text-gray-600 ml-4 mt-1">{ziyarath.toCity?.name || 'N/A'}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

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
                      <p className="text-sm font-bold text-gray-900 capitalize">{booking.accommodationType || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Hotel Details */}
                  {(() => {
                    // Debug: Log accommodation type and hotel bookings
                    const accType = booking.accommodationType;
                    const hotelBookings = booking.hotelBookings;
                    
                    // Check if accommodation type is hotel (case-insensitive)
                    const isHotel = accType && (accType.toLowerCase() === 'hotel');
                    
                    if (!isHotel) {
                      return null;
                    }
                    
                    // Check if hotelBookings exists and has data
                    const hasHotelBookings = Array.isArray(hotelBookings) && hotelBookings.length > 0;
                    
                    if (!hasHotelBookings) {
                      return (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Building className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">No hotel bookings found</p>
                          <p className="text-xs text-gray-400 mt-2">Accommodation Type: {accType || 'undefined'}</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200">
                              <th className="py-3 px-4">Hotel Name</th>
                              <th className="py-3 px-4">Check-In</th>
                              <th className="py-3 px-4">Check-Out</th>
                            </tr>
                          </thead>
                          <tbody>
                            {hotelBookings.map((h: any) => {
                              // Try multiple ways to get hotel name
                              const hotelName = h.hotel?.name 
                                || h.hotel?.hotelName
                                || 'N/A';
                              
                              // Try multiple ways to get dates
                              const checkIn = h.checkInDate || h.checkIn || h.checkInDate;
                              const checkOut = h.checkOutDate || h.checkOut || h.checkOutDate;
                              
                              return (
                                <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                  <td className="py-3 px-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                      <Building className="h-4 w-4 text-gray-400" />
                                      <span>{hotelName}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3 text-gray-400" />
                                      <span>{formatDate(checkIn)}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3 text-gray-400" />
                                      <span>{formatDate(checkOut)}</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}

                  {/* Iqama Details */}
                  {booking.accommodationType === 'iqama' && (
                    <>
                      {booking.sponsorIqamaDetails ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Iqama Number</p>
                              <p className="text-sm font-medium text-gray-900">{booking.sponsorIqamaDetails.iqamaNumber || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Holder Name</p>
                              <p className="text-sm font-medium text-gray-900">{booking.sponsorIqamaDetails.iqamaSponserName || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date of Birth</p>
                              <p className="text-sm font-medium text-gray-900">{formatDate(booking.sponsorIqamaDetails.sponserDob)}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Mobile Number</p>
                              <p className="text-sm font-medium text-gray-900">{booking.sponsorIqamaDetails.sponserMobileNumber || 'N/A'}</p>
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">National Short Address</p>
                              <p className="text-sm font-medium text-gray-900">{booking.sponsorIqamaDetails.sponserNationalShortAddress || 'N/A'}</p>
                            </div>
                          </div>
                          {booking.sponsorIqamaDetails.confirmationImagePath && (
                            <div className="flex items-center justify-end">
                              <Button
                                onClick={handleDownloadConfirmationImage}
                                disabled={downloadingConfirmation}
                                variant="outline"
                                className="flex items-center gap-2"
                              >
                                <Download className="h-4 w-4" />
                                {downloadingConfirmation ? 'Downloading...' : 'Download Confirmation Image'}
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Building className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">No iqama details found</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Passengers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-rose-600" /> Passengers ({booking.passengers?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(booking.passengers || []).map((p: any) => (
                      <div 
                        key={p.id} 
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-base mb-2">
                              {p.fullName || 'N/A'}
                            </h3>
                            {p.isLeadPassenger && (
                              <Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs font-semibold mb-2">
                                Lead Passenger
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600 font-medium">Passport Number</span>
                            <span className="text-sm text-gray-900 font-semibold">{p.passportNumber || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-600 font-medium">Nationality</span>
                            <span className="text-sm text-gray-900 font-semibold">{p.nationality || 'N/A'}</span>
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
