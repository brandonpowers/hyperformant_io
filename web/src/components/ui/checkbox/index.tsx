import React from 'react';
import { IoCheckmark } from 'react-icons/io5';

const Checkbox = (props: {
  id?: string;
  extra?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  [x: string]: any;
}) => {
  const { extra, id, checked, onCheckedChange, ...rest } = props;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked);
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className={`defaultCheckbox relative flex h-[20px] min-h-[20px] w-[20px] min-w-[20px] appearance-none items-center 
        justify-center rounded-md border border-gray-300 outline-none transition duration-[0.2s]
        checked:border-none checked:bg-blue-500 dark:checked:bg-blue-400 hover:cursor-pointer dark:border-white/10 ${extra}`}
        {...rest}
      />
      {checked && (
        <IoCheckmark className="pointer-events-none absolute left-0 top-0 h-[20px] w-[20px] text-white" />
      )}
    </div>
  );
};

export default Checkbox;
