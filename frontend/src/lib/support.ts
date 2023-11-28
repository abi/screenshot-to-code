import { ComponentLibrary } from "@/types"
  
export enum LibraryType {
    css = 'css',
    js = 'js',
}

export interface Library {
    [LibraryType.css]: string[],
    [LibraryType.js]: string[],
    validate: (support: ComponentLibrary, code: String) => Boolean
}
  
class SupportLibraries {

    libraries: Record<string, Library> = {
        [ComponentLibrary.HTML] : {
            css: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css'],
            js: ['https://cdn.tailwindcss.com'],
            validate: (support) => { 
                return support == ComponentLibrary.HTML 
            }
        },
        [ComponentLibrary.IONIC] : {
            css: [
                'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css',
                'https://cdn.jsdelivr.net/npm/@ionic/core/css/ionic.bundle.css'],
            js: [
                'https://cdn.tailwindcss.com',
                'https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.esm.js', 
                'https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.js'
            ],
            validate: (support, code) => { 
                return support == ComponentLibrary.IONIC || code.includes('<ion-') 
            }
        },
    }

    getLibraries = (type: LibraryType, { code = '', support = ComponentLibrary.HTML} ): string => {
        let library: string[] = []
        Object.values(this.libraries).forEach((value: Library) => {
            if( value.validate(support, code)){
                library = value[type]
            }
        });

        return library.join(',');
    }
}

const libraries = new SupportLibraries()

export {
    libraries
}