# Umrah Visa Booking System Documentation

## Overview
The Umrah Visa Booking system is a multi-step form that allows users to apply for Umrah visas with different accommodation options (hotel or iqama sponsor) and booking modes (individual or group).

## How It Works

### Booking Flow
1. **Step 1 - Booking Mode**: Choose between individual travel details or group booking with masar login
2. **Step 2 - Travel Details**: Enter flight information, airports, dates, and transport options
3. **Step 3 - Accommodation**: Select hotel bookings or iqama sponsor details
4. **Step 4 - Documents**: Upload required documents based on booking type and accommodation

### Business Rules
- **Travel Duration**: Maximum 80 days
- **Passengers**: Max 5 for iqama accommodation, unlimited for hotels
- **Transport**: Required for Jeddah/Medina airports
- **Documents**: Varies by booking type and accommodation choice

## Code Organization

### Core Files
```
frontend/
├── lib/umrah/                    # Business logic & configuration
│   ├── constants.ts             # Business rules, limits, API endpoints
│   ├── types.ts                 # TypeScript interfaces
│   ├── validation.ts            # All validation logic
│   └── index.ts                 # Library exports
├── hooks/
│   └── useUmrahBooking.ts       # State management & API calls
├── components/umrah-booking/   # UI components
│   ├── shared/                 # Reusable components
│   │   └── index.tsx           # StepProgress, DocumentUpload, etc.
│   ├── steps/                  # Step-specific components
│   │   ├── BookingModeStep.tsx
│   │   ├── TravelDetailsStep.tsx
│   │   ├── AccommodationStep.tsx
│   │   └── DocumentsStep.tsx
│   └── index.ts                # Component exports
└── app/party/umrah-visa/
    └── page.tsx                # Main page (orchestrates everything)
```

### Key Components

#### State Management (`useUmrahBooking.ts`)
- Manages all booking state across 4 steps
- Handles API calls for each step
- Provides update functions for each step's data

#### Validation (`validation.ts`)
- Centralized validation logic
- Step-specific validation functions
- Business rule enforcement

#### Step Components
- **BookingModeStep**: Radio buttons for booking type selection
- **TravelDetailsStep**: Flight info, transport matrix, duration calculation
- **AccommodationStep**: Hotel bookings or iqama details
- **DocumentsStep**: File uploads based on booking type

### Data Flow
1. User fills step data → Component updates state via hooks
2. User clicks "Next" → Validation runs → API call if valid
3. Success → Move to next step → Repeat until completion
4. Final step → Submit complete booking → Redirect to dashboard

### API Integration
- **Step 1**: Creates booking record, returns bookingId
- **Step 2**: Updates with travel details
- **Step 3**: Updates with accommodation info
- **Step 4**: Final submission with passenger documents

### Master Data Loading
- **Airports**: For flight selection
- **Locations**: For hotel destinations
- **Hotels**: Filtered by location
- **Transport Options**: Based on arrival airport

## Key Features

### Responsive Design
- Desktop: Table layouts for better data density
- Mobile: Card layouts for touch-friendly interaction

### Real-time Validation
- Flight number formatting (XX-1234)
- Travel duration calculation
- Hotel coverage validation
- Document requirement checking

### Smart Defaults
- Hotel check-in dates auto-filled based on previous bookings
- Transport options loaded when airport selected
- Document requirements adapt to booking type

### Error Handling
- Step-by-step validation with clear error messages
- Toast notifications for user feedback
- Graceful API error handling

## Configuration
All business rules are centralized in `constants.ts`:
- Booking limits (max days, passengers)
- Document requirements by booking type
- API endpoints
- Validation patterns

This makes the system easy to modify without touching component code.
