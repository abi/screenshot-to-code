const Footer = () => {
  return (
    <footer className="flex justify-between border-t border-gray-200 pt-4 mb-6 px-4 sm:px-0">
      <div className="flex flex-col">
        <span className="text-xl mb-2">Screenshot to Code</span>
        <span className="text-xs">
          © {new Date().getFullYear()} WhimsyWorks, Inc. All rights reserved.
        </span>
        {/* <div
          className="bg-gray-800 text-white text-sm px-2 py-2 
        rounded-full flex items-center space-x-2"
        >
          <span>Built with</span>
          <i className="fas fa-bolt text-yellow-400"></i>
          <span>Screenshot to Code</span>
        </div> */}
      </div>
      <div className="flex flex-col text-sm text-gray-600 mr-4">
        <span className="uppercase">Company</span>
        <div>WhimsyWorks Inc.</div>
        <div>Made in NYC 🗽</div>
        <a href="https://github.com/abi/screenshot-to-code" target="_blank">
          Github
        </a>
        <a href="mailto:support@picoapps.xyz" target="_blank">
          Contact
        </a>
        <a href="https://a.picoapps.xyz/camera-write" target="_blank">
          Terms of Service
        </a>
      </div>
    </footer>
  );
};
export default Footer;
