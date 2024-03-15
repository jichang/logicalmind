import {
  Answer,
  Engine,
  isResultValue,
  ConsoleExplorer,
  Program,
} from "@logice/lang";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";

export const code = `
(mother (a c))
(father (b c))
(mother (e g))
(father (f g))
(couple (X Y) ((mother (X Z)) (father (Y Z))))
`;

export function App() {
  const [codeEditorState] = useState(() => {
    return EditorState.create({
      doc: code,
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

  const [answers, setAnswers] = useState<string[]>([]);

  const query = useCallback(() => {
    if (codeEditorRef.current && queryEditorRef.current) {
      const code = codeEditorRef.current.state.doc.toString();
      const engine = new Engine(new ConsoleExplorer());
      const result = Program.load(code);
      if (result.kind === "Value") {
        const goal = queryEditorRef.current.state.doc.toString();
        const queryResult = engine.query(result.value, { goal });

        const answers: string[] = [];
        for (const answer of queryResult) {
          if (isResultValue(answer)) {
            answers.push(
              answer.value.context.exportClause(answer.value.targetClause)
            );
          }
        }
        setAnswers(answers);
      }
    }
  }, [codeEditorNodeRef, queryEditorNodeRef]);

  return (
    <div id="main">
      <div id="sidebar">
        <div id="code-editor" ref={codeEditorNodeRef}></div>
      </div>
      <div id="explorer">
        <div id="query-editor" ref={queryEditorNodeRef}></div>
        <button id="query-btn" onClick={query}>
          Query
        </button>
        <div id="answers">
          <h4>Answers</h4>
          {answers.map((answer, index) => {
            return <div key={index}>{answer}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

// Render your React component instead
const root = createRoot(document.getElementById("app") as HTMLElement);
root.render(<App />);
