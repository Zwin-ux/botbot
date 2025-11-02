'use client';

import { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { SearchBar } from './search-bar';
import { CategoryFilter } from './category-filter';
import { SortOptions, SortOption } from './sort-options';

export interface SearchFilters {
  search: string;
  categories: string[];
  sort: SortOption;
}

interface SearchAndFiltersProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  availableCategories: string[];
  loading?: boolean;
}

export function SearchAndFilters({ 
  filters, 
  onChange, 
  availableCategories, 
  loading = false 
}: SearchAndFiltersProps) {
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const handleSearchChange = (search: string) => {
    onChange({ ...filters, search });
  };

  const handleCategoriesChange = (categories: string[]) => {
    onChange({ ...filters, categories });
  };

  const handleSortChange = (sort: SortOption) => {
    onChange({ ...filters, sort });
  };

  const handleClearFilters = () => {
    onChange({
      search: '',
      categories: [],
      sort: 'popular',
    });
  };

  const hasActiveFilters = filters.search || filters.categories.length > 0 || filters.sort !== 'popular';
  const activeFilterCount = (filters.search ? 1 : 0) + filters.categories.length + (filters.sort !== 'popular' ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Search Bar - Always visible */}
      <div className="w-full">
        <SearchBar
          value={filters.search}
          onChange={handleSearchChange}
          placeholder="Search personalities by name or description..."
        />
      </div>

      {/* Desktop Filters */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex-1 max-w-xs">
          <CategoryFilter
            categories={availableCategories}
            selectedCategories={filters.categories}
            onChange={handleCategoriesChange}
          />
        </div>
        
        <div className="flex-1 max-w-xs">
          <SortOptions
            value={filters.sort}
            onChange={handleSortChange}
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Mobile Filter Toggle */}
      <div className="md:hidden flex items-center justify-between">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {/* Mobile Filters Panel */}
      {showMobileFilters && (
        <div className="md:hidden space-y-4 p-4 bg-gray-50 rounded-lg border">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categories
            </label>
            <CategoryFilter
              categories={availableCategories}
              selectedCategories={filters.categories}
              onChange={handleCategoriesChange}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <SortOptions
              value={filters.sort}
              onChange={handleSortChange}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowMobileFilters(false)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          
          {filters.search && (
            <span className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
              Search: "{filters.search}"
              <button
                onClick={() => handleSearchChange('')}
                className="ml-1 hover:text-blue-900 focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {filters.categories.map((category) => (
            <span
              key={category}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full"
            >
              {category}
              <button
                onClick={() => handleCategoriesChange(filters.categories.filter(c => c !== category))}
                className="ml-1 hover:text-purple-900 focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          
          {filters.sort !== 'popular' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">
              Sort: {filters.sort}
              <button
                onClick={() => handleSortChange('popular')}
                className="ml-1 hover:text-green-900 focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}