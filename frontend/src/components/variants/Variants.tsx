import { useProjectStore } from "../../store/project-store";

function Variants() {
  const { inputMode, head, commits, updateSelectedVariantIndex } =
    useProjectStore();

  // If there is no head, don't show the variants
  if (head === null) {
    return null;
  }

  const commit = commits[head];
  const variants = commit.variants;
  const selectedVariantIndex = commit.selectedVariantIndex;

  // If there is only one variant or the commit is already committed, don't show the variants
  if (variants.length <= 1 || commit.isCommitted || inputMode === "video") {
    return <div className="mt-2"></div>;
  }

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
