import { FaGithub } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-[#FFFCF2] border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 bg-[#E85D04] rounded-full" />
              <span className="text-lg font-semibold tracking-tight font-display">
                Screenshot to Code
              </span>
            </div>
            <p className="text-gray-500 mb-6 max-w-sm leading-relaxed">
              AI-powered conversion from visual designs to clean, production-ready
              code. Open source with 71,000+ GitHub stars.
            </p>
            <a
              href="https://github.com/abi/screenshot-to-code"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover-line"
            >
              <FaGithub />
              View on GitHub
            </a>
          </div>

          {/* Links */}
          <div className="md:col-span-2 md:col-start-8">
            <h4 className="text-xs uppercase tracking-widest text-gray-400 mb-6">
              Resources
            </h4>
            <ul className="space-y-4">
              <li>
                <a
                  href="https://github.com/abi/screenshot-to-code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover-line"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/abi/screenshot-to-code#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover-line"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@picoapps.xyz"
                  className="text-sm text-gray-600 hover-line"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="md:col-span-2">
            <h4 className="text-xs uppercase tracking-widest text-gray-400 mb-6">
              Legal
            </h4>
            <ul className="space-y-4">
              <li>
                <a
                  href="https://a.picoapps.xyz/camera-write"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover-line"
                >
                  Terms
                </a>
              </li>
              <li>
                <a
                  href="https://a.picoapps.xyz/camera-write"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover-line"
                >
                  Privacy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-200 mt-16 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            {new Date().getFullYear()} WhimsyWorks, Inc.
          </p>
          <p className="text-sm text-gray-400 font-editorial italic">
            Made in NYC
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
