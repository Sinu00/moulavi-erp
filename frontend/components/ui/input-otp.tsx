"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface InputOTPContextValue {
  slots: Array<{
    char: string
    hasFakeCaret: boolean
    isActive: boolean
  }>
  value: string
  setValue: (value: string) => void
  maxLength: number
  disabled?: boolean
}

const InputOTPContext = React.createContext<InputOTPContextValue | null>(null)

interface InputOTPProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'maxLength'> {
  value?: string
  onChange?: (value: string) => void
  maxLength?: number
  pattern?: string | RegExp
  containerClassName?: string
}

const InputOTP = React.forwardRef<HTMLInputElement, InputOTPProps>(
  ({ className, containerClassName, value = "", onChange, maxLength = 6, pattern, disabled, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value)
    const [activeIndex, setActiveIndex] = React.useState<number | null>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => {
      setInternalValue(value)
    }, [value])

    const handleChange = (newValue: string) => {
      // Apply pattern if provided
      if (pattern) {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
        if (!regex.test(newValue)) {
          return
        }
      }
      
      // Limit to maxLength
      const limitedValue = newValue.slice(0, maxLength)
      setInternalValue(limitedValue)
      onChange?.(limitedValue)
    }

    const slots = React.useMemo(() => {
      return Array.from({ length: maxLength }, (_, index) => ({
        char: internalValue[index] || '',
        hasFakeCaret: activeIndex === index && internalValue.length === index,
        isActive: activeIndex === index,
      }))
    }, [internalValue, activeIndex, maxLength])

    const contextValue = React.useMemo<InputOTPContextValue>(() => ({
      slots,
      value: internalValue,
      setValue: handleChange,
      maxLength,
      disabled,
    }), [slots, internalValue, maxLength, disabled])

    return (
      <InputOTPContext.Provider value={contextValue}>
        <div
          className={cn(
            "flex items-center gap-2 has-[:disabled]:opacity-50",
            containerClassName
          )}
        >
          <input
            ref={ref || inputRef}
            type="text"
            inputMode="text"
            value={internalValue}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setActiveIndex(internalValue.length < maxLength ? internalValue.length : maxLength - 1)}
            onBlur={() => setActiveIndex(null)}
            maxLength={maxLength}
            disabled={disabled}
            className={cn("sr-only", className)}
            {...props}
          />
          {props.children}
        </div>
      </InputOTPContext.Provider>
    )
  }
)
InputOTP.displayName = "InputOTP"

const InputOTPGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
))
InputOTPGroup.displayName = "InputOTPGroup"

const InputOTPSlot = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { index: number }
>(({ index, className, ...props }, ref) => {
  const context = React.useContext(InputOTPContext)
  
  if (!context) {
    throw new Error("InputOTPSlot must be used within InputOTP")
  }

  const { slots, setValue, maxLength, disabled } = context
  const slot = slots[index] || { char: '', hasFakeCaret: false, isActive: false }

  const handleClick = () => {
    if (disabled) return
    const input = document.querySelector('input[type="text"]') as HTMLInputElement
    if (input) {
      input.focus()
      input.setSelectionRange(index, index + 1)
    }
  }

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md cursor-pointer",
        slot.isActive && "z-10 ring-2 ring-ring ring-offset-background",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    >
      {slot.char}
      {slot.hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  )
})
InputOTPSlot.displayName = "InputOTPSlot"

const InputOTPSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ ...props }, ref) => (
  <div ref={ref} role="separator" {...props}>
    <div className="h-1 w-1 rounded-full bg-border" />
  </div>
))
InputOTPSeparator.displayName = "InputOTPSeparator"

// Export regex pattern for convenience
export const REGEXP_ONLY_DIGITS_AND_CHARS = /^[A-Za-z0-9]*$/

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }

