import { useProjectStore } from "../../store/project-store";

function Variants() {
  const {
    // Inputs
    referenceImages,

    // Outputs
    variants,
    currentVariantIndex,
    setCurrentVariantIndex,
    setGeneratedCode,
    appHistory,
    setAppHistory,
  } = useProjectStore();

  function switchVariant(index: number) {
    const variant = variants[index];
    setCurrentVariantIndex(index);
    setGeneratedCode(variant);
    if (appHistory.length === 1) {
      setAppHistory([
        {
          type: "ai_create",
          parentIndex: null,
          code: variant,
          inputs: { image_url: referenceImages[0] },
        },
      ]);
    } else {
      setAppHistory((prev) => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1].code = variant;
        return newHistory;
      });
    }
  }

  if (variants.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 mb-4">
      <div className="grid grid-cols-2 gap-2">
        {variants.map((_, index) => (
          <div
            key={index}
            className={`p-2 border rounded-md cursor-pointer ${
              index === currentVariantIndex
                ? "bg-blue-100 dark:bg-blue-900"
                : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            onClick={() => switchVariant(index)}
          >
            <h3 className="font-medium mb-1">Option {index + 1}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Variants;
