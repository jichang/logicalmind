import { Answer, Engine, isResultValue, ConsoleExplorer } from "@logice/lang";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";

export function App() {
  const [codeEditorState] = useState(() => {
    return EditorState.create({
      doc: `(mother (a c)) (father (b c)) (couple (X Y) ((mother (X Z)) (father (Y Z))))`,
      extensions: [keymap.of(defaultKeymap)],
    });
  });
  const codeEditorNodeRef = useRef<HTMLDivElement>(null);
  const codeEditorRef = useRef<EditorView | null>(null);

  const [queryEditorState] = useState(() => {
    return EditorState.create({
      doc: "(couple (X Y))",
      extensions: [keymap.of(defaultKeymap)],
    });
  });
  const queryEditorNodeRef = useRef<HTMLDivElement>(null);
  const queryEditorRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (codeEditorNodeRef.current && queryEditorNodeRef.current) {
      let codeEditor = new EditorView({
        state: codeEditorState,
        extensions: [basicSetup],
        parent: codeEditorNodeRef.current,
      });
      codeEditorRef.current = codeEditor;
      let queryEditor = new EditorView({
        state: queryEditorState,
        extensions: [basicSetup],
        parent: queryEditorNodeRef.current,
      });
      queryEditorRef.current = queryEditor;

      return () => {
        codeEditor.destroy();
        queryEditor.destroy();
      };
    }
  }, [codeEditorState, queryEditorState]);

  const [answers, setAnswers] = useState<Answer[]>([]);

  const query = useCallback(() => {
    if (codeEditorRef.current && queryEditorRef.current) {
      const code = codeEditorRef.current.state.doc.toString();
      const engine = new Engine(new ConsoleExplorer());
      engine.load(code);

      const goal = queryEditorRef.current.state.doc.toString();
      const result = engine.query({ goal });

      const answers: Answer[] = [];
      for (const answer of result) {
        if (isResultValue(answer)) {
          answers.push(answer.value);
        }
      }
      setAnswers(answers);
    }
  }, [codeEditorNodeRef, queryEditorNodeRef]);

  return (
    <div id="main">
      {answers.map((answer, index) => {
        return <div key={index}>{JSON.stringify(answer)}</div>;
      })}
      <div id="code-editor" ref={codeEditorNodeRef}></div>
      <div id="footer">
        <div id="query-editor" ref={queryEditorNodeRef}></div>
        <button onClick={query}>Query</button>
      </div>
    </div>
  );
}

// Render your React component instead
const root = createRoot(document.getElementById("app") as HTMLElement);
root.render(<App />);
