import { Link } from "react-router-dom";

function EvalNavigation() {
  return (
    <div className="flex justify-between items-center w-full py-3 px-4 bg-zinc-900 text-white">
      <div className="flex items-center space-x-4">
        <Link
          to="/evals"
          className="font-medium hover:text-blue-300 transition-colors"
        >
          Evals Home
        </Link>
        
        <div className="text-gray-500">|</div>
        
        <Link
          to="/evals/run"
          className="hover:text-blue-300 transition-colors"
        >
          Run
        </Link>
        
        <Link
          to="/evals/pairwise"
          className="hover:text-blue-300 transition-colors"
        >
          Pairwise
        </Link>
        
        <Link
          to="/evals/best-of-n"
          className="hover:text-blue-300 transition-colors"
        >
          Best of N
        </Link>
        
        <Link
          to="/evals/single"
          className="hover:text-blue-300 transition-colors"
        >
          Single
        </Link>
      </div>
      
      <Link
        to="/"
        className="text-sm text-gray-300 hover:text-white transition-colors"
      >
        ← Back to app
      </Link>
    </div>
  );
}

export default EvalNavigation;
