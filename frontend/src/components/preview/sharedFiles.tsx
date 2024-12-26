// src/components/preview/sharedFiles.ts

import dedent from "dedent";

export const sharedFiles: Record<string, string> = {
  "/components/ui/button.js": dedent`
    import React from 'react';

    export function Button({ type, className, onClick, children }) {
      return (
        <button type={type} className={className} onClick={onClick}>
          {children}
        </button>
      );
    }
  `,
  "/components/ui/input.js": dedent`
    import React from 'react';

    export function Input({ type, value, onChange, className }) {
      return (
        <input
          type={type}
          value={value}
          onChange={onChange}
          className={className}
        />
      );
    }
  `,
  "/components/ui/search.js": dedent`
    import React from 'react';

    export function Search({ className, size = 20 }) {
      return (
        <svg
          className={className}
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      );
    }
  `,
  // Add other component definitions similarly...
};
