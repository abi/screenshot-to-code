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
import { EditorTheme } from "@/types";

interface Props {
  code: string;
  editorTheme: EditorTheme;
  onCodeChange: (code: string) => void;
}

function CodeMirror({ code, editorTheme, onCodeChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const getChanges = (currentCode: string, nextCode: string) => {
    if (currentCode === nextCode) {
      return null;
    }

    let start = 0;
    let currentEnd = currentCode.length;
    let nextEnd = nextCode.length;

    while (
      start < currentEnd &&
      start < nextEnd &&
      currentCode[start] === nextCode[start]
    ) {
      start += 1;
    }

    while (
      currentEnd > start &&
      nextEnd > start &&
      currentCode[currentEnd - 1] === nextCode[nextEnd - 1]
    ) {
      currentEnd -= 1;
      nextEnd -= 1;
    }

    return {
      from: start,
      to: currentEnd,
      insert: nextCode.slice(start, nextEnd),
    };
  };
  const editorState = useMemo(
    () =>
      EditorState.create({
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
          editorTheme === EditorTheme.ESPRESSO ? espresso : cobalt,
          EditorView.lineWrapping,
          EditorView.updateListener.of((update: ViewUpdate) => {
            const hasUserInput = update.transactions.some(
              (transaction) =>
                transaction.isUserEvent("input") ||
                transaction.isUserEvent("delete") ||
                transaction.isUserEvent("paste")
            );
            if (update.docChanged && hasUserInput) {
              const updatedCode = update.state.doc.toString();
              onCodeChange(updatedCode);
            }
          }),
        ],
      }),
    [editorTheme]
  );
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
    if (view.current) {
      const currentCode = view.current.state.doc.toString();
      const changes = getChanges(currentCode, code);
      if (!changes) {
        return;
      }
      view.current.dispatch({ changes });
    }
  }, [code]);

  return (
    <div
      className="overflow-x-scroll overflow-y-scroll mx-2 border-[4px] border-black rounded-[20px]"
      ref={ref}
    />
  );
}

export default CodeMirror;
