import React from "react";

interface Props {
  onSelect: (rating: number) => void;
}

function RatingPicker({ onSelect }: Props) {
  const [selected, setSelected] = React.useState<number | null>(null);

  const renderCircle = (number: number) => {
    const isSelected = selected === number;
    const bgColor = isSelected ? "bg-black" : "bg-gray-300";
    const textColor = isSelected ? "text-white" : "text-black";

    return (
      <div
        className={`flex items-center justify-center w-8 h-8 ${bgColor} rounded-full cursor-pointer`}
        onClick={() => {
          setSelected(number);
          onSelect(number);
        }}
      >
        <span className={`text-lg font-semibold ${textColor}`}>{number}</span>
      </div>
    );
  };

  return (
    <div className="flex space-x-4">
      {renderCircle(1)}
      {renderCircle(2)}
      {renderCircle(3)}
      {renderCircle(4)}
    </div>
  );
}

export default RatingPicker;
