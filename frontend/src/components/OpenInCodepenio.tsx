import { Component } from 'react';
import { Button } from './ui/button';

enum SupportType {
  HTML = 'html',
  IONIC = 'ionic'
}

enum LibraryType {
  css = 'css',
  js = 'js',
}

interface OpenInCodepenioProps {
  code: string;
  support?: SupportType;
  onDoOpen?: () => void;
}

interface Library {
  [LibraryType.css]: string[],
  [LibraryType.js]: string[],
  validate: (support: SupportType, code: String) => Boolean
}

/**
 * Component show button do open in new windows to CodePen Editor, this component add support
 * of diferrent tecnologies do use `libraries` property.
 * @component
 * Redirect to codepen.io
 * @param { OpenInCodepenioProps } props 
 * @property {string} code  - this generated code.
 * @property {Function} onDoOpen - handle after open and redirect to Codepen Editor
 * @property {Record} libraries  - add support diferent tecnologies adding css, js libraries 
 * to css_external and js_external atributte of Codepen Editor.
 */
class OpenInCodepenio extends Component<OpenInCodepenioProps> {

  libraries: Record<string, Library> = {
    [SupportType.HTML] : {
      css: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css'],
      js: ['https://cdn.tailwindcss.com'],
      validate: (support) => { 
        return support == SupportType.HTML 
      }
    },
    [SupportType.IONIC] : {
      css: [
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css',
        'https://cdn.jsdelivr.net/npm/@ionic/core/css/ionic.bundle.css'],
      js: [
        'https://cdn.tailwindcss.com',
        'https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.esm.js', 
        'https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.js'
      ],
      validate: (support, code) => { 
        return support == SupportType.IONIC || code.includes('<ion-') 
      }
    },
  }

  getExternalLibraries = (type: LibraryType): string => {
    let library: string[] = []
    const { code, support = SupportType.HTML } = this.props;
    debugger
    Object.values(this.libraries).forEach((value: Library) => {
      if( value.validate(support, code)){
        library = value[type]
      }
    });

    return library.join(',');
  }

  doOpenInCodepenio =  () => {
      const { code, onDoOpen } = this.props; 
      var form = document.createElement('form');
      form.setAttribute('method', 'POST');
      form.setAttribute('action', 'https://codepen.io/pen/define');
      form.setAttribute('target', '_blank'); // open in new window
  
      const data = { 
        html: code,
        editors: "100", // 1:Open html, 0:close CSS, 0:Close Js
        layout: "left",
        css_external: this.getExternalLibraries(LibraryType.css),
        js_external: this.getExternalLibraries(LibraryType.js),
      }
      // test have html to json
      try {
        JSON.stringify({ html: data.html })
      } catch (error) {
        data.html = "<!-- Copy your code here -->"
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
      }
  }

  render() {    
    return (
      <div>
       <Button onClick={this.doOpenInCodepenio} className="bg-gray-100 text-black ml-2 py-2 px-4 border border-black rounded-md hover:bg-gray-400 focus:outline-none">
          Open in <img src="https://assets.codepen.io/t-1/codepen-logo.svg" alt="codepen.io" className="h-4 ml-1" />
        </Button>
      </div>
    );
  }
}

export default OpenInCodepenio;
