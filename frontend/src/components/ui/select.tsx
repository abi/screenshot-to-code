import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => {
    return (
      <select
        className={cn(
          "block appearance-none w-full text-sm shadow-sm rounded-md border border-input bg-white py-2 px-3 focus:outline-none focus:border-black dark:bg-background dark:color-white",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Select.displayName = "Select";

export { Select };
