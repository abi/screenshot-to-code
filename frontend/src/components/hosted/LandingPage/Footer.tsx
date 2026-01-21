import { FaGithub, FaTwitter } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">&lt;/&gt;</span>
              </div>
              <span className="text-lg font-semibold">Screenshot to Code</span>
            </div>
            <p className="text-gray-400 text-sm max-w-xs mb-6">
              The fastest way to turn designs into production-ready code.
              Open-source and trusted by developers worldwide.
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com/abi/screenshot-to-code"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <FaGithub size={20} />
              </a>
              <a
                href="https://twitter.com/AbiAryan"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <FaTwitter size={18} />
              </a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              <li>
                <span className="text-gray-300 text-sm">WhimsyWorks Inc.</span>
              </li>
              <li>
                <span className="text-gray-300 text-sm">Made in NYC</span>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Links
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://github.com/abi/screenshot-to-code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white text-sm transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@picoapps.xyz"
                  className="text-gray-300 hover:text-white text-sm transition-colors"
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="https://a.picoapps.xyz/camera-write"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white text-sm transition-colors"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <p className="text-gray-500 text-sm text-center">
            © {new Date().getFullYear()} WhimsyWorks, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
