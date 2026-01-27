const Footer = () => {
  return (
    <footer className="landing-bg border-t landing-border px-6">
      <div className="max-w-7xl mx-auto py-16">
        <div className="flex flex-col md:flex-row md:justify-between gap-12">
          {/* Brand */}
          <div className="max-w-sm">
            <div className="flex items-center gap-2 mb-4">
              <img src="/favicon/main.png" alt="Logo" className="w-6 h-6 logo-dark-mode" />
              <span className="text-lg font-semibold tracking-tight font-display">
                Screenshot to Code
              </span>
            </div>
            <p className="landing-text-muted leading-relaxed">
              AI-powered conversion from screenshots and designs to clean, production-ready
              code. Open source with 71,000+ GitHub stars.
            </p>
          </div>

          {/* Right side links */}
          <div className="flex gap-16">
            {/* Resources */}
            <div>
              <h4 className="text-xs uppercase tracking-widest landing-text-muted mb-6">
                Resources
              </h4>
              <ul className="space-y-4">
                <li>
                  <a
                    href="https://github.com/abi/screenshot-to-code"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm landing-text-muted hover-line"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/abi/screenshot-to-code#readme"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm landing-text-muted hover-line"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:support@picoapps.xyz"
                    className="text-sm landing-text-muted hover-line"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs uppercase tracking-widest landing-text-muted mb-6">
                Legal
              </h4>
              <ul className="space-y-4">
                <li>
                  <a
                    href="https://a.picoapps.xyz/camera-write"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm landing-text-muted hover-line"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t landing-border mt-16 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm landing-text-muted">
            {new Date().getFullYear()} WhimsyWorks, Inc.
          </p>
          <p className="text-sm landing-text-muted font-editorial italic">
            Made in NYC
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
