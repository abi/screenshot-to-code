interface RatingPickerProps {
  onSelect: (rating: number) => void;
  maxRating?: number;
  value?: number;
}

function RatingPicker({
  onSelect,
  maxRating = 5,
  value = 0,
}: RatingPickerProps) {
  return (
    <div className="flex gap-x-2">
      {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
        <button
          key={rating}
          onClick={() => onSelect(rating)}
          className={`w-8 h-8 rounded-full border border-gray-300 
            ${
              value === rating
                ? "bg-blue-500 text-white"
                : "hover:bg-blue-500 hover:text-white"
            }`}
        >
          {rating}
        </button>
      ))}
    </div>
  );
}

export default RatingPicker;
