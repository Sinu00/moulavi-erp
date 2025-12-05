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
  inputRef: React.RefObject<HTMLInputElement>
}

const InputOTPContext = React.createContext<InputOTPContextValue | null>(null)

interface InputOTPProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'maxLength' | 'pattern' | 'children'> {
  value?: string
  onChange?: (value: string) => void
  maxLength?: number
  pattern?: string | RegExp
  containerClassName?: string
  children?: React.ReactNode
}

const InputOTP = React.forwardRef<HTMLInputElement, InputOTPProps>(
  ({ className, containerClassName, value = "", onChange, maxLength = 6, pattern, disabled, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value)
    const [activeIndex, setActiveIndex] = React.useState<number | null>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)
    
    // Merge refs: support both callback refs and RefObject
    React.useEffect(() => {
      if (!ref) return
      
      if (typeof ref === 'function') {
        ref(inputRef.current)
        // Cleanup: call with null when component unmounts
        return () => {
          ref(null)
        }
      } else if (ref && 'current' in ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = inputRef.current
      }
    }, [ref])

    React.useEffect(() => {
      setInternalValue(value)
    }, [value])

    const handleChange = React.useCallback((newValue: string) => {
      // Limit to maxLength first
      let limitedValue = newValue.slice(0, maxLength)
      
      // Apply pattern if provided - filter out invalid characters
      if (pattern) {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
        const patternStr = regex.toString()
        
        // Try to extract character class from pattern (e.g., [A-Za-z0-9] from /^[A-Za-z0-9]*$/)
        // This handles common patterns like /^[A-Za-z0-9]*$/
        const charClassMatch = patternStr.match(/\[([^\]]+)\]/)
        if (charClassMatch) {
          // Use the character class to filter characters one by one
          // Escape special regex characters in the character class to prevent issues
          try {
            const charClassRegex = new RegExp(`^[${charClassMatch[1]}]$`)
            limitedValue = limitedValue
              .split('')
              .filter(char => charClassRegex.test(char))
              .join('')
          } catch (e) {
            // If regex construction fails, fall back to basic validation
            console.warn('Invalid regex pattern in character class, skipping pattern validation')
          }
        } else {
          // For other patterns, check if the entire value matches
          // If it doesn't match, keep the previous value (don't update)
          if (limitedValue && !regex.test(limitedValue)) {
            // Don't update if pattern doesn't match
            return
          }
        }
      }
      
      setInternalValue(limitedValue)
      onChange?.(limitedValue)
    }, [maxLength, pattern, onChange])

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
      inputRef: inputRef,
    }), [slots, internalValue, maxLength, disabled, handleChange])

    return (
      <InputOTPContext.Provider value={contextValue}>
        <div
          className={cn(
            "flex items-center gap-2 has-[:disabled]:opacity-50",
            containerClassName
          )}
        >
          <input
            ref={inputRef}
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
          {children}
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

  const { slots, setValue, maxLength, disabled, inputRef } = context
  const slot = slots[index] || { char: '', hasFakeCaret: false, isActive: false }

  const handleClick = () => {
    if (disabled) return
    const input = inputRef.current
    if (input) {
      input.focus()
      // Set cursor position to the clicked slot
      const cursorPos = Math.min(index, input.value.length)
      input.setSelectionRange(cursorPos, cursorPos)
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

