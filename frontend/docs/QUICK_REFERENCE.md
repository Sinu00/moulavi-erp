# Quick Reference Guide

## File Locations
- **Main Page**: `app/party/umrah-visa/page.tsx`
- **Business Logic**: `lib/umrah/`
- **Components**: `components/umrah-booking/`
- **Hooks**: `hooks/useUmrahBooking.ts`

## Key Functions
- `validateStep1/2/3/4()`: Step validation
- `submitStep()`: API submission
- `formatFlightNumber()`: Flight number formatting
- `calculateDuration()`: Travel duration calculation

## State Structure
```typescript
bookingState: {
  currentStep: number,
  completedSteps: number[],
  bookingId: string | null,
  step1Data: Step1Data,
  step2Data: Step2Data,
  step3Data: Step3Data,
  step4Data: Step4Data,
  skipDocuments: boolean
}
```

## Common Modifications
- **Add new step**: Create component in `steps/`, add to validation, update constants
- **Change business rules**: Modify `constants.ts`
- **Add validation**: Update `validation.ts`
- **Change UI**: Modify step components
