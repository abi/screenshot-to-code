import { Link } from "react-router-dom";

function AllEvalsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Evals Dashboard
          </h1>
          <Link 
            to="/"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
          >
            ← Back to app
          </Link>
        </div>
        <div className="space-y-4">
          <Link
            to="/evals/run"
            className="block w-full p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-800">Run Evals</h2>
            <p className="text-gray-600">
              Generate evaluations for multiple models
            </p>
          </Link>

          <Link
            to="/evals/pairwise"
            className="block w-full p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-800">
              Pairwise Comparison
            </h2>
            <p className="text-gray-600">
              Compare outputs from two different models
            </p>
          </Link>

          <Link
            to="/evals/best-of-n"
            className="block w-full p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-800">Best of N</h2>
            <p className="text-gray-600">
              Compare multiple model outputs side by side
            </p>
          </Link>

          <Link
            to="/evals/single"
            className="block w-full p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-800">
              Single Model Eval
            </h2>
            <p className="text-gray-600">Score outputs from a single model</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AllEvalsPage;
