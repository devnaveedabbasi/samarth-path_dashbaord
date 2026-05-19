"use client";

import React from "react";
import SearchInput from "./SearchInput";
import Button from "./Button";

interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (val: string) => void;
  onClearFilters: () => void;
  filters?: React.ReactNode;
}

export function FilterBar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  onClearFilters,
  filters,
}: FilterBarProps) {

  //  Safe conversion (handles null/undefined)
  const filtersArray = React.Children.toArray(filters).filter(Boolean);

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-gray-100 shadow-sm rounded-2xl">
      <div className="flex flex-col gap-4 p-4 md:p-6">
        
        {/* 🔍 Search & Clear - Row 1 for mobile */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 w-full">
            <SearchInput
              value={searchValue}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          </div>
          
          {/* Clear Button - visible on mobile */}
          <div className="sm:hidden w-full">
            <Button
              onClick={onClearFilters}
              icon="mdi:filter-remove-outline"
              title="Clear filters"
              variant="secondary"
              className="w-full"
            />
          </div>
        </div>

        {/* 🎛 Filters - Row 2 for mobile */}
        <div className="w-full">
          {filtersArray.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtersArray}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center sm:justify-start text-sm text-gray-400 py-2">
              No filters available
            </div>
          )}
        </div>

        {/*  Clear Button - Desktop only */}
        <div className="hidden sm:flex sm:justify-end">
          <Button
            onClick={onClearFilters}
            icon="mdi:filter-remove-outline"
            title="Clear all filters"
            variant="secondary"
          />
        </div>
      </div>
    </div>
  );
}