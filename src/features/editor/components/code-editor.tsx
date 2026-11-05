"use client";

import { useEffect, useMemo, useRef } from 'react'
import { suggestion } from "../extensions/suggestion";
import { EditorView } from "@codemirror/view";
import { Compartment } from "@codemirror/state";
import { oneDark } from '@codemirror/theme-one-dark'
import { customTheme } from "../extensions/theme";
import { getLanguageExtension } from "../extensions/language-ext";
import { customSetup } from "../extensions/custom-setup";
import { minimap } from "../extensions/minimap";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";
import { quickEdit } from "../extensions/quick-edit";


interface Props{
    fileName: string;
    initialValue: string;
    onChange?:(value: string) => void;
}

function CodeEditor({fileName, onChange, initialValue}: Props) {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const initialValueRef = useRef(initialValue);
    const onChangeRef = useRef(onChange);

    const languageExtension = useMemo(() => getLanguageExtension(fileName), [fileName]);
    const languageCompartment = useMemo(() => new Compartment(), []);
    const suggestionExtension = useMemo(() => suggestion(fileName), [fileName]);
    const suggestionCompartment = useMemo(() => new Compartment(), []);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if(!editorRef.current) return;

        const view = new EditorView({
            doc: initialValueRef.current,
            parent: editorRef.current,
            extensions: [
                customTheme,
                oneDark,
                customSetup,
                languageCompartment.of([]),
                minimap(),
                suggestionCompartment.of([]),
                indentationMarkers(),
                quickEdit(),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChangeRef.current?.(update.state.doc.toString());
                    }
                }),
            ]
        });
        viewRef.current = view;
        return () => {

            view.destroy();
            viewRef.current = null;
        };
    }, [languageCompartment, suggestionCompartment]);

    useEffect(() => {
        viewRef.current?.dispatch({
            effects: suggestionCompartment.reconfigure(suggestionExtension),
        });
    }, [suggestionCompartment, suggestionExtension]);

    useEffect(() => {
        viewRef.current?.dispatch({
            effects: languageCompartment.reconfigure(languageExtension),
        });
    }, [languageCompartment, languageExtension]);
  return (
    <div ref={editorRef} className="size-full min-h-0 overflow-hidden bg-background" />


  )
}

export default CodeEditor;

