export interface VoucherPdfData {
  voucherNumber: string;
  reservationNumber?: string;
  reservationDate: string;
  guestName: string;
  guestMobile: string;
  groupCode: string;
  groupName?: string;
  paxCount: number;
  umrahVisaProvider?: {
    partyName: string;
    address?: string;
    contactNumber?: string;
    whatsappNumber?: string;
    email?: string;
  } | null;
  hotelSchedules: Array<{
    number: number;
    location: string;
    hotelName: string;
    days: number;
    checkIn: string;
    checkOut: string;
    brn?: string[] | null;
  }>;
  movementDetails: Array<{
    sr: number;
    route: string;
    date: string;
    time: string;
    from: string;
    fromLocation: string;
    to: string;
    toLocation: string;
  }>;
  flightDetails: Array<{
    type: string;
    date: string;
    carrier: string;
    number: string;
    from: string;
    to: string;
    etd: string;
    eta: string;
  }>;
}

