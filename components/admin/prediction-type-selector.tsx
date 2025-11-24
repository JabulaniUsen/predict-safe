'use client'

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// Common prediction types as suggestions
const PREDICTION_TYPE_SUGGESTIONS = [
  'Over 1.5',
  'Over 2.5',
  'Over 3.5',
  'Under 1.5',
  'Under 2.5',
  'Under 3.5',
  'BTTS',
  'BTTS No',
  'Home Win',
  'Away Win',
  'Draw',
  'Double Chance',
  'Banker',
  'Super Single',
  '1X',
  'X2',
  '12',
]

interface PredictionTypeSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function PredictionTypeSelector({
  value,
  onValueChange,
  placeholder = 'Type or select prediction type...',
  className,
}: PredictionTypeSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value || '')

  // Update input value when external value changes
  React.useEffect(() => {
    setInputValue(value || '')
  }, [value])

  // Filter suggestions based on input
  const filteredSuggestions = React.useMemo(() => {
    if (!inputValue) return PREDICTION_TYPE_SUGGESTIONS
    const query = inputValue.toLowerCase()
    return PREDICTION_TYPE_SUGGESTIONS.filter((suggestion) =>
      suggestion.toLowerCase().includes(query)
    )
  }, [inputValue])

  const handleSelect = (selectedValue: string) => {
    setInputValue(selectedValue)
    onValueChange(selectedValue)
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onValueChange(newValue)
    setOpen(true) // Open dropdown when typing
  }

  const handleInputFocus = () => {
    setOpen(true)
  }

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative">
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            className="pr-10"
          />
          <PopoverTrigger asChild>
            <button
              type="button"
              className="absolute right-0 top-0 h-full px-3 flex items-center justify-center hover:bg-gray-100 rounded-r-md transition-colors"
              onClick={() => setOpen(!open)}
            >
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
            </button>
          </PopoverTrigger>
        </div>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" side="bottom">
          <Command shouldFilter={false}>
            <CommandList>
              {filteredSuggestions.length === 0 && inputValue ? (
                <CommandEmpty>
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    No suggestions found. Your custom value &quot;{inputValue}&quot; will be used.
                  </div>
                </CommandEmpty>
              ) : filteredSuggestions.length === 0 ? (
                <CommandEmpty>Start typing to see suggestions...</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredSuggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion}
                      value={suggestion}
                      onSelect={() => handleSelect(suggestion)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          inputValue === suggestion ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {suggestion}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

