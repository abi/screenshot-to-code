import { FaGithub, FaEnvelope } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg hero-gradient animate-gradient flex items-center justify-center">
                <span className="text-white text-sm font-bold">&lt;/&gt;</span>
              </div>
              <span className="text-xl font-bold">Screenshot to Code</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              Convert any screenshot or design into clean, production-ready code
              with AI. Open source with 71,000+ stars on GitHub.
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com/abi/screenshot-to-code"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
              >
                <FaGithub className="text-lg" />
              </a>
              <a
                href="mailto:support@picoapps.xyz"
                className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
              >
                <FaEnvelope className="text-lg" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">
              Resources
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://github.com/abi/screenshot-to-code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/abi/screenshot-to-code#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@picoapps.xyz"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">
              Legal
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://a.picoapps.xyz/camera-write"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="https://a.picoapps.xyz/camera-write"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} WhimsyWorks, Inc. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm">
            Made with care in NYC
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
