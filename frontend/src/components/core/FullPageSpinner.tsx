import Spinner from "../core/Spinner";

function FullPageSpinner() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-[#FFFCF2] dark:bg-[#0D0D0D]">
      <Spinner />
    </div>
  );
}

export default FullPageSpinner;
