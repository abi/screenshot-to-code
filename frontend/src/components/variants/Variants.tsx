import { useProjectStore } from "../../store/project-store";

function Variants() {
  const { head, commits, updateSelectedVariantIndex } = useProjectStore();

  // TODO: Is HEAD null right? And check variants.length === 0 ||
  if (head === null) {
    return null;
  }

  const variants = commits[head || ""].variants;
  const selectedVariantIndex = commits[head || ""].selectedVariantIndex;

  return (
    <div className="mt-4 mb-4">
      <div className="grid grid-cols-2 gap-2">
        {variants.map((_, index) => (
          <div
            key={index}
            className={`p-2 border rounded-md cursor-pointer ${
              index === selectedVariantIndex
                ? "bg-blue-100 dark:bg-blue-900"
                : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            onClick={() => updateSelectedVariantIndex(head, index)}
          >
            <h3 className="font-medium mb-1">Option {index + 1}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Variants;
