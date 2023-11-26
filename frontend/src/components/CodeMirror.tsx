import { useRef, useEffect, useMemo } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, ViewUpdate } from "@codemirror/view";
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
import { javascript } from "@codemirror/lang-javascript";
import { EditorTheme } from "@/types";
import { FaCopy } from "react-icons/fa";

interface Props {
  code: string;
  editorTheme: EditorTheme;
  onCodeChange: (code: string) => void;
  doCopyCode: () => void;
}

function CodeMirror({ code, editorTheme, onCodeChange, doCopyCode }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const editorState = useMemo(() => EditorState.create({
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
      javascript(), // Added JavaScript support
      html(),
      editorTheme === EditorTheme.ESPRESSO ? espresso : cobalt,
      EditorView.lineWrapping,
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          const updatedCode = update.state.doc.toString();
          onCodeChange(updatedCode);
        }
      }),
    ],
  }), [editorTheme]);
  useEffect(() => {
    view.current = new EditorView({
      state: editorState,
      parent: ref.current as Element,
    });

    return () => {
      if (view.current) {
        view.current.destroy();
        view.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (view.current && view.current.state.doc.toString() !== code) {
      view.current.dispatch({
        changes: { from: 0, to: view.current.state.doc.length, insert: code },
      });
    }
  }, [code]);

  return (
    <div className="relative">
        <div className="overflow-x-scroll overflow-y-scroll mx-2 border-[4px] border-black rounded-[20px]" ref={ref} />
        <span
          title="Copy Code"
          className="flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer rounded-lg text-sm p-2.5 absolute top-[0px] right-[20px]"
          onClick={doCopyCode}
        >
        <FaCopy />
      </span>
    </div>
  );
}

export default CodeMirror;

