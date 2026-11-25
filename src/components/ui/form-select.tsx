"use client";

import { useId, useRef, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

const emptyValue = "__ibiza_empty_option__";

export function FormSelect({
  name,
  label,
  options,
  defaultValue,
  value,
  onValueChange,
  required = false,
  disabled = false,
}: {
  name: string;
  label: string;
  options: SelectOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(
    defaultValue ?? options[0]?.value ?? "",
  );
  const [invalid, setInvalid] = useState(false);
  const selected = value ?? localValue;
  const trigger = useRef<HTMLButtonElement>(null);
  const errorId = useId();

  function change(next: string) {
    const actual = next === emptyValue ? "" : next;
    if (value === undefined) setLocalValue(actual);
    onValueChange?.(actual);
    setInvalid(false);
  }

  return (
    <span className="form-select">
      <Select.Root
        value={selected === "" ? emptyValue : selected}
        onValueChange={change}
        disabled={disabled}
      >
        <Select.Trigger
          ref={trigger}
          className="form-select-trigger"
          aria-label={label}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
        >
          <Select.Value />
          <Select.Icon asChild>
            <ChevronDown size={18} aria-hidden="true" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="form-select-content"
            position="popper"
            sideOffset={7}
          >
            <Select.Viewport className="form-select-viewport">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value === "" ? emptyValue : option.value}
                  disabled={option.disabled}
                  className="form-select-item"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="form-select-check">
                    <Check size={16} aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <select
        className="form-select-native"
        name={name}
        value={selected}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => change(event.target.value)}
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(true);
          trigger.current?.focus();
        }}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {invalid && (
        <span id={errorId} className="form-select-error" role="alert">
          Escolhe uma opção.
        </span>
      )}
    </span>
  );
}
