import { FaGithub, FaTwitter } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-[#1a1a1a] text-white font-sans">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white font-mono text-xs">&lt;/&gt;</span>
              </div>
              <span className="text-lg tracking-tight">Screenshot to Code</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-sm mb-8">
              The fastest way to turn designs into production-ready code.
              Open-source and trusted by developers worldwide.
            </p>
            <div className="flex gap-3">
              <a
                href="https://github.com/abi/screenshot-to-code"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all"
              >
                <FaGithub size={18} />
              </a>
              <a
                href="https://twitter.com/AbiAryan"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all"
              >
                <FaTwitter size={16} />
              </a>
            </div>
          </div>

          {/* Spacer */}
          <div className="hidden md:block md:col-span-3"></div>

          {/* Company */}
          <div className="md:col-span-2">
            <h4 className="text-xs tracking-widest uppercase text-white/30 mb-5">
              Company
            </h4>
            <ul className="space-y-3">
              <li>
                <span className="text-white/60 text-sm">WhimsyWorks Inc.</span>
              </li>
              <li>
                <span className="text-white/60 text-sm">Made in NYC</span>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div className="md:col-span-2">
            <h4 className="text-xs tracking-widest uppercase text-white/30 mb-5">
              Links
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://github.com/abi/screenshot-to-code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white text-sm transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@picoapps.xyz"
                  className="text-white/60 hover:text-white text-sm transition-colors"
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="https://a.picoapps.xyz/camera-write"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white text-sm transition-colors"
                >
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <p className="text-white/30 text-sm">
            © {new Date().getFullYear()} WhimsyWorks, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
