import { useRef, useEffect } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { espresso } from "thememirror";
import {
  defaultKeymap,
  history,
  indentWithTab,
  redo,
  undo,
} from "@codemirror/commands";
import { bracketMatching } from "@codemirror/language";
import { html } from "@codemirror/lang-html";

interface Props {
  code: string;
}

function CodeMirror({ code }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);

  // Initialize the editor when the component mounts
  useEffect(() => {
    view.current = new EditorView({
      state: EditorState.create({
        doc: code,
        extensions: [
          history(),
          keymap.of([
            ...defaultKeymap,
            indentWithTab,
            { key: "Mod-z", run: undo, preventDefault: true },
            { key: "Mod-Shift-z", run: redo, preventDefault: true },
          ]),
          lineNumbers(),
          bracketMatching(),
          html(),
          espresso,
          EditorView.lineWrapping,
        ],
      }),
      parent: ref.current as Element,
    });

    return () => {
      if (view.current) {
        view.current.destroy();
        view.current = null;
      }
    };
  }, []);

  // Update the contents of the editor when the code changes
  useEffect(() => {
    if (view.current && view.current.state.doc.toString() !== code) {
      view.current.dispatch({
        changes: { from: 0, to: view.current.state.doc.length, insert: code },
      });
    }
  }, [code]);

  return <div className="overflow-x-scroll overflow-y-scroll mx-2 border-[4px] border-black rounded-[20px]" ref={ref} />;
}
export default CodeMirror;
