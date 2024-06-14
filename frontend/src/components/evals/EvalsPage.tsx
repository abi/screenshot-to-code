import React, { useEffect } from "react";
import { HTTP_BACKEND_URL } from "../../config";
import RatingPicker from "./RatingPicker";

interface Eval {
  input: string;
  outputs: string[];
}

function EvalsPage() {
  const [evals, setEvals] = React.useState<Eval[]>([]);
  const [ratings, setRatings] = React.useState<number[]>([]);

  const total = ratings.reduce((a, b) => a + b, 0);
  const max = ratings.length * 4;
  const score = ((total / max) * 100 || 0).toFixed(2);

  useEffect(() => {
    if (evals.length > 0) return;

    fetch(`${HTTP_BACKEND_URL}/evals`)
      .then((res) => res.json())
      .then((data) => {
        setEvals(data);
        setRatings(new Array(data.length).fill(0));
      });
  }, [evals]);

  return (
    <div className="mx-auto">
      {/* Display total */}
      <div className="flex items-center justify-center w-full h-12 bg-zinc-950">
        <span className="text-2xl font-semibold text-white">
          Total: {total} out of {max} ({score}%)
        </span>
      </div>

      <div className="flex flex-col gap-y-4 mt-4 mx-auto justify-center">
        {evals.map((e, index) => (
          <div className="flex flex-col justify-center" key={index}>
            <h2 className="font-bold text-lg ml-4">{index}</h2>
            <div className="flex gap-x-2 justify-center ml-4">
              {/* Update w if N changes to a fixed number like w-[600px] */}
              <div className="w-1/2 p-1 border">
                <img src={e.input} alt={`Input for eval ${index}`} />
              </div>
              {e.outputs.map((output, outputIndex) => (
                <div className="w-1/2 p-1 border" key={outputIndex}>
                  {/* Put output into an iframe */}
                  <iframe
                    srcDoc={output}
                    className="w-[1200px] h-[800px] transform scale-[0.60]"
                    style={{ transformOrigin: "top left" }}
                  ></iframe>
                </div>
              ))}
            </div>
            <div className="ml-8 mt-4 flex justify-center">
              <RatingPicker
                onSelect={(rating) => {
                  const newRatings = [...ratings];
                  newRatings[index] = rating;
                  setRatings(newRatings);
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EvalsPage;
