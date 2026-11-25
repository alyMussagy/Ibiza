"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Search, Sparkles } from "lucide-react";
import { categories } from "@/features/listings/catalog";
import { localities } from "@/features/listings/localities";
import { Button } from "@/components/ui/button";

type Option = { value: string; label: string };

function SearchChoice({
  name,
  label,
  options,
  initialValue = "",
  icon: Icon,
}: {
  name: string;
  label: string;
  options: Option[];
  initialValue?: string;
  icon: typeof MapPin;
}) {
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const closeOnOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, []);

  function choose(index: number) {
    setValue(options[index].value);
    setActive(index);
    setOpen(false);
    trigger.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      trigger.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setOpen(true);
      setActive((current) => (current + step + options.length) % options.length);
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      choose(active);
    }
  }

  return (
    <div className="search-choice" ref={root} onKeyDown={onKeyDown}>
      <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
      <div className="search-choice-content">
        <span className="search-choice-label">{label}</span>
        <input type="hidden" name={name} value={value} />
        <button
          ref={trigger}
          type="button"
          className="search-choice-trigger"
          aria-label={`${label}: ${selected.label}`}
          aria-expanded={open}
          aria-controls={menuId}
          aria-haspopup="listbox"
          onClick={() => {
            setActive(Math.max(0, options.findIndex((option) => option.value === value)));
            setOpen((current) => !current);
          }}
        >
          <span>{selected.label}</span>
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div className="search-choice-menu" id={menuId} role="listbox" aria-label={label}>
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              className={index === active ? "is-active" : ""}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              {value === option.value && <Check size={17} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchForm({
  query = "",
  category = "",
}: {
  query?: string;
  category?: string;
}) {
  return (
    <form action="/ofertas" className="search-form" role="search">
      <SearchChoice
        name="local"
        label="Para onde vamos?"
        initialValue={query}
        options={[{ value: "", label: "Toda Inhambane" }, ...localities]}
        icon={MapPin}
      />
      <SearchChoice
        name="categoria"
        label="O que queres descobrir?"
        initialValue={category}
        options={[{ value: "", label: "Todas as experiências" }, ...categories.map((c) => ({ value: c.slug, label: c.label }))]}
        icon={Sparkles}
      />
      <Button type="submit">
        <Search size={18} aria-hidden="true" />
        Explorar
      </Button>
    </form>
  );
}
