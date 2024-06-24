import { FaGithub } from "react-icons/fa";
import Footer from "./LandingPage/Footer";
import { Button } from "../ui/button";
import { SignUp } from "@clerk/clerk-react";
import { useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Tweet } from "react-tweet";
// import YouTube, { YouTubeProps } from "react-youtube";

const LOGOS = ["microsoft", "amazon", "mit", "stanford", "bytedance", "baidu"];

function LandingPage() {
  const [isAuthPopupOpen, setIsAuthPopupOpen] = useState(false);

  const signIn = () => {
    setIsAuthPopupOpen(true);
  };

  // const youtubeOpts: YouTubeProps["opts"] = {
  //   height: "262.5", // Increased by 50%
  //   width: "480", // Increased by 50%
  //   playerVars: {
  //     autoplay: 1,
  //   },
  // };

  return (
    <div className="w-full xl:w-[1000px] mx-auto mt-4">
      {/* Auth dialog */}
      <Dialog
        open={isAuthPopupOpen}
        onOpenChange={(value) => setIsAuthPopupOpen(value)}
      >
        <DialogContent className="flex justify-center">
          <SignUp
            redirectUrl="/"
            appearance={{
              elements: {
                card: {
                  boxShadow: "none",
                  borderRadius: "0",
                  border: "none",
                  backgroundColor: "transparent",
                },
                footer: {
                  display: "flex",
                  flexDirection: "column",
                  textAlign: "center",
                },
                footerAction: {
                  marginBottom: "5px",
                },
              },
              layout: { privacyPageUrl: "https://a.picoapps.xyz/camera-write" },
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Navbar */}
      <nav className="border-b border-gray-200 px-4 py-2">
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold">Screenshot to Code</div>
          <div className="flex items-center space-x-4">
            <Button variant="secondary" onClick={signIn}>
              Sign in
            </Button>
            <Button onClick={signIn}>Get started</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="px-4 py-16">
        <div className="mx-auto">
          <h2 className="text-5xl font-bold leading-tight mb-6">
            Build User Interfaces 10x Faster
          </h2>
          <p className="text-gray-600 text-xl mb-6">
            Convert any screenshot or design to clean code (with support for
            most frameworks)
          </p>
          <div className="flex gap-4 flex-col sm:flex-row">
            <Button size="lg" className="text-lg py-6 px-8" onClick={signIn}>
              Get started
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                window.open(
                  "https://github.com/abi/screenshot-to-code",
                  "_blank"
                )
              }
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 py-6 px-8"
            >
              <FaGithub size={24} />
              <span>GitHub</span>
              <span className="text-sm bg-gray-200 rounded-full px-2 py-1">
                53,939 stars
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Logo wall */}
      <div className="mx-auto mt-12 px-4 sm:px-0">
        <p className="text-gray-600 text-xl mb-10 text-center">
          #1 tool used by developers and designers from leading companies. Fully
          open source with 53,000+ stars on GitHub.
        </p>
        <div
          className="mx-auto grid max-w-lg items-center gap-x-2 
          gap-y-10 sm:max-w-xl grid-cols-3 lg:mx-0 lg:max-w-none mt-10"
        >
          {LOGOS.map((companyName) => (
            <img
              key={companyName}
              className="col-span-1 max-h-8 w-full object-contain 
                grayscale opacity-50 hover:opacity-100"
              src={`https://picoapps.xyz/logos/${companyName}.png`}
              alt={companyName}
              width={120}
              height={48}
            />
          ))}
        </div>
      </div>

      {/* Video section */}
      {/* <div className="px-4 mt-20 mb-10 text-center">
        <video
          src="/demos/youtube.mp4"
          className="max-w-lg mx-auto rounded-md w-full sm:w-auto"
          autoPlay
          loop
          muted
        />
        <div className="mt-6">
          Watch Screenshot to Code convert a screenshot of YouTube to
          HTML/Tailwind
        </div>
      </div> */}

      {/* Here's what users have to say */}
      <div className="mt-16">
        <h2 className="text-gray-600 text-2xl mb-4 text-center">
          Here's what users have to say
        </h2>
        <div className="px-3 grid grid-cols-1 sm:grid-cols-2 gap-2 items-start justify-items-center">
          {/* <YouTube videoId="b2xi5qiiTOI" opts={youtubeOpts} /> */}
          <Tweet id="1733865178905661940" />
          {/* <Tweet id="1727586760584991054" /> Other Rowan Cheung tweet */}
          <Tweet id="1727105236811366669" />
          <Tweet id="1732032876739224028" />
          <Tweet id="1728496255473459339" />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default LandingPage;
