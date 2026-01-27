import { useRef, useEffect, useMemo, useCallback, useState, memo } from "react";
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

// Debounce delay for code changes (ms)
const CODE_CHANGE_DEBOUNCE_MS = 150;

interface Props {
  code: string;
  editorTheme: EditorTheme;
  onCodeChange: (code: string) => void;
}

function CodeMirror({ code, editorTheme, onCodeChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // Use a ref to hold the latest onCodeChange callback to avoid stale closures
  const onCodeChangeRef = useRef(onCodeChange);
  // Track local code state to enable debouncing
  const [localCode, setLocalCode] = useState(code);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the callback ref updated
  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  }, [onCodeChange]);

  // Debounce updates to parent - only fires after user stops typing
  useEffect(() => {
    // Don't debounce if the change came from props (external update)
    if (localCode === code) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onCodeChangeRef.current(localCode);
    }, CODE_CHANGE_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [localCode, code]);

  // Update local code when props change (e.g., from code generation)
  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  const handleDocChange = useCallback((updatedCode: string) => {
    setLocalCode(updatedCode);
  }, []);

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
            if (update.docChanged) {
              const updatedCode = update.state.doc.toString();
              // Update local state immediately for responsive editing
              handleDocChange(updatedCode);
            }
          }),
        ],
      }),
    [editorTheme, handleDocChange]
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
    if (view.current && view.current.state.doc.toString() !== code) {
      view.current.dispatch({
        changes: { from: 0, to: view.current.state.doc.length, insert: code },
      });
    }
  }, [code]);

  return (
    <div
      className="overflow-x-scroll overflow-y-scroll mx-2 border-[4px] border-black rounded-[20px]"
      ref={ref}
    />
  );
}

export default memo(CodeMirror);
