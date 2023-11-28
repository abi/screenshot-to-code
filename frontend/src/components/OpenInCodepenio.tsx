import { useCallback } from 'react';
import { Button } from './ui/button';
import { libraries, LibraryType } from '@/lib/support';
import { ComponentLibrary } from '@/types';
import toast from 'react-hot-toast';

export interface OpenInProps {
  code: string;
  support?: ComponentLibrary;
  onDoOpen?: () => void;
}

/**
 * Component show button do open in new windows to CodePen Editor, this component add support
 * of diferrent tecnologies do use `libraries` property.
 * @component
 * Redirect to codepen.io
 * @param { OpenInProps } props 
 * @property {string} code  - this generated code.
 * @property {Function} onDoOpen - handle after open and redirect to Codepen Editor
 */
function OpenInCodepenio({ code, support, onDoOpen }: OpenInProps) {

  const doOpenInCodepenio =  useCallback(async () => { 
      var form = document.createElement('form');
      form.setAttribute('method', 'POST');
      form.setAttribute('action', 'https://codepen.io/pen/define');
      form.setAttribute('target', '_blank'); // open in new window
  
      const data = { 
        html: code,
        editors: "100", // 1:Open html, 0:close CSS, 0:Close Js
        layout: "left",
        css_external: libraries.getLibraries(LibraryType.css, { code , support }),
        js_external: libraries.getLibraries(LibraryType.js, {code , support }),
      }

      var input = document.createElement('input');
      input.setAttribute('type', 'hidden');
      input.setAttribute('name', 'data');
      input.setAttribute('value', JSON.stringify(data));
  
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
      if (onDoOpen) {
        onDoOpen();
      } else {
        toast.success("Will Opening codepen.io, need enable popup windows");
      }
  }, [code, support])

     
  return (
      <Button
        onClick={doOpenInCodepenio}
        className="bg-gray-100 text-black ml-2 py-2 px-4 border border-black rounded-md hover:bg-gray-400 focus:outline-none"
      >
        Open in{" "}
        <img
          src="https://assets.codepen.io/t-1/codepen-logo.svg"
          alt="codepen.io"
          className="h-4 ml-1"
        />
      </Button>
  );
}

export default OpenInCodepenio;
