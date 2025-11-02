'use client';

import { ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface CategoryFilterProps {
  categories: string[];
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  placeholder?: string;
}

export function CategoryFilter({ 
  categories, 
  selectedCategories, 
  onChange, 
  placeholder = "All Categories" 
}: CategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCategoryToggle = (category: string) => {
    const isSelected = selectedCategories.includes(category);
    if (isSelected) {
      onChange(selectedCategories.filter(c => c !== category));
    } else {
      onChange([...selectedCategories, category]);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const displayText = selectedCategories.length === 0 
    ? placeholder 
    : selectedCategories.length === 1 
      ? selectedCategories[0]
      : `${selectedCategories.length} categories`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {selectedCategories.length > 0 && (
            <>
              <button
                onClick={handleClearAll}
                className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 focus:outline-none focus:bg-red-50"
              >
                Clear All
              </button>
              <div className="border-t border-gray-200" />
            </>
          )}
          
          {categories.map((category) => {
            const isSelected = selectedCategories.includes(category);
            return (
              <button
                key={category}
                onClick={() => handleCategoryToggle(category)}
                className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
              >
                <span>{category}</span>
                {isSelected && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </button>
            );
          })}
          
          {categories.length === 0 && (
            <div className="px-4 py-2 text-sm text-gray-500">
              No categories available
            </div>
          )}
        </div>
      )}
    </div>
  );
}