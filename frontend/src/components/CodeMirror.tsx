import { useRef, useEffect } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { espresso, cobalt } from "thememirror";
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
  editorTheme: string;
}

function CodeMirror({ code, editorTheme }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);

  useEffect(() => {
    let selectedTheme = cobalt;
    if (editorTheme === "espresso") {
      selectedTheme = espresso;
    }
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
          selectedTheme,
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
  }, [code, editorTheme]);

  useEffect(() => {
    if (view.current && view.current.state.doc.toString() !== code) {
      view.current.dispatch({
        changes: { from: 0, to: view.current.state.doc.length, insert: code },
      });
    }
  }, [code]);

  return (
    <div className="overflow-x-scroll overflow-y-scroll mx-2 border-[4px] border-black rounded-[20px]" ref={ref} />
  );
}

export default CodeMirror;
