import React from 'react';

interface ToggleButtonProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({ label, checked, onChange, id }) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <label htmlFor={id} className="flex text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
        {label}
      </label>
      <div
        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
        }`}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange(!checked);
          }
        }}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        ></span>
      </div>
    </div>
  );
};

export default ToggleButton;
