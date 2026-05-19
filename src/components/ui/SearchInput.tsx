"use client";
import React from "react";
import { Icon } from "@iconify/react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}) => {
  return (
    <div className={`relative w-full ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary-400"
      />

      <Icon
        icon="heroicons:magnifying-glass"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <Icon icon="heroicons:x-mark" className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;