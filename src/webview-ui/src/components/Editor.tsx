import { useCallback, useEffect, useRef, useState } from "react"; // Added useState
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Code,
  Table,
  Heading1,
  Heading2,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getMessageType } from "@/constants";

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
}

const formatContent = (html: string) => {
  return html.replace(/\n/g, "<br>");
};

export function Editor({ content, onChange }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  // State for active formatting (optional, for button "pressed" state)
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>(
    {}
  );

  const updateActiveFormats = useCallback(() => {
    if (!editorRef.current || document.activeElement !== editorRef.current) {
      // Clear formats if editor is not focused, or set to default
      // setActiveFormats({}); // Or only update relevant ones
      return;
    }
    const newActiveFormats: Record<string, boolean> = {};
    newActiveFormats.bold = document.queryCommandState("bold");
    newActiveFormats.italic = document.queryCommandState("italic");
    newActiveFormats.underline = document.queryCommandState("underline");
    newActiveFormats.insertUnorderedList = document.queryCommandState(
      "insertUnorderedList"
    );
    newActiveFormats.insertOrderedList =
      document.queryCommandState("insertOrderedList");

    const blockFormat = document.queryCommandValue("formatBlock").toLowerCase();
    newActiveFormats.h1 = blockFormat === "h1";
    newActiveFormats.h2 = blockFormat === "h2";

    setActiveFormats(newActiveFormats);
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    const formattedContentProp = formatContent(content);
    if (editorRef.current.innerHTML !== formattedContentProp) {
      const selection = window.getSelection();
      let savedRange: Range | null = null;
      if (
        selection &&
        selection.rangeCount > 0 &&
        document.activeElement === editorRef.current
      ) {
        savedRange = selection.getRangeAt(0).cloneRange();
      }
      isInternalUpdate.current = true;
      editorRef.current.innerHTML = formattedContentProp;
      isInternalUpdate.current = false;
      if (
        savedRange &&
        selection &&
        document.activeElement === editorRef.current
      ) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      }
      // After content update, re-check active formats
      updateActiveFormats();
    }
  }, [content, updateActiveFormats]);

  const _execCommand = useCallback(
    (command: string, value?: string) => {
      // Ensure editor is focused before executing command
      editorRef.current?.focus();
      document.execCommand(command, false, value);
      if (editorRef.current) {
        const newContent = editorRef.current.innerHTML;
        if (newContent !== content) {
          onChange(newContent);
          // No need to call sendToVSCode here if onChange triggers it via prop change
        }
        // Update active formats after any command
        updateActiveFormats();
      }
    },
    [content, onChange, updateActiveFormats]
  ); // Removed sendToVSCode, added updateActiveFormats

  const toggleBlockFormat = useCallback(
    (format: "h1" | "h2" | "p") => {
      editorRef.current?.focus();
      const currentBlock = document
        .queryCommandValue("formatBlock")
        .toLowerCase();
      if (currentBlock === format && format !== "p") {
        // If already h1 and trying to set h1, revert to p
        document.execCommand("formatBlock", false, "p");
      } else {
        document.execCommand("formatBlock", false, format);
      }

      if (editorRef.current) {
        const newContent = editorRef.current.innerHTML;
        if (newContent !== content) {
          onChange(newContent);
        }
        updateActiveFormats();
      }
    },
    [content, onChange, updateActiveFormats]
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || !message.type) return;

      switch (message.type) {
        case getMessageType("updateContent"):
        case getMessageType("loadContent"): {
          if (message.content !== undefined && message.content !== content) {
            // This will trigger the main useEffect([content])
            onChange(message.content);
          }
          break;
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onChange, content]); // Added content to dependencies

  const sendToVSCode = useCallback(
    (type: string, data: { content: string }) => {
      if (window.vscode && typeof window.vscode.postMessage === "function") {
        window.vscode.postMessage({
          type: getMessageType(type),
          data,
        });
      } else {
        // console.warn("VSCode API not available for sendToVSCode");
      }
    },
    []
  );

  // Effect for listening to selection changes and key events to update button states
  useEffect(() => {
    const editorNode = editorRef.current;
    if (!editorNode) return;

    const handleSelectionChange = () => {
      // Check if the editor or its children has focus
      if (
        document.activeElement &&
        editorNode.contains(document.activeElement)
      ) {
        updateActiveFormats();
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    editorNode.addEventListener("focus", updateActiveFormats);
    editorNode.addEventListener("click", updateActiveFormats); // Also update on click
    editorNode.addEventListener("keyup", updateActiveFormats); // And keyup

    // Initial check
    if (document.activeElement && editorNode.contains(document.activeElement)) {
      updateActiveFormats();
    }

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      editorNode.removeEventListener("focus", updateActiveFormats);
      editorNode.removeEventListener("click", updateActiveFormats);
      editorNode.removeEventListener("keyup", updateActiveFormats);
    };
  }, [updateActiveFormats]); // Run when updateActiveFormats changes (it's memoized)

  return (
    <div className="border rounded-lg">
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/50">
        <Toggle
          size="sm"
          pressed={activeFormats.bold}
          onPressedChange={() => _execCommand("bold")}
          aria-label="Toggle bold"
        >
          <Bold className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={activeFormats.italic}
          onPressedChange={() => _execCommand("italic")}
          aria-label="Toggle italic"
        >
          <Italic className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={activeFormats.underline}
          onPressedChange={() => _execCommand("underline")}
          aria-label="Toggle underline"
        >
          <Underline className="w-4 h-4" />
        </Toggle>

        <Separator
          orientation="vertical"
          className="h-6 mx-1"
        />

        <Toggle
          size="sm"
          pressed={activeFormats.insertUnorderedList}
          onPressedChange={() => _execCommand("insertUnorderedList")}
          aria-label="Toggle bullet list"
        >
          <List className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={activeFormats.insertOrderedList}
          onPressedChange={() => _execCommand("insertOrderedList")}
          aria-label="Toggle numbered list"
        >
          <ListOrdered className="w-4 h-4" />
        </Toggle>

        <Separator
          orientation="vertical"
          className="h-6 mx-1"
        />

        <Toggle
          size="sm"
          pressed={activeFormats.h1}
          onPressedChange={() => toggleBlockFormat("h1")}
          aria-label="Toggle heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={activeFormats.h2}
          onPressedChange={() => toggleBlockFormat("h2")}
          aria-label="Toggle heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </Toggle>

        <Separator
          orientation="vertical"
          className="h-6 mx-1"
        />

        <Toggle
          size="sm"
          onPressedChange={() =>
            _execCommand("insertHTML", "<pre><code> </code></pre>")
          }
          aria-label="Insert code block"
        >
          <Code className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          onPressedChange={() =>
            _execCommand("insertHTML", "<table><tr><td> </td></tr></table>")
          }
          aria-label="Insert table"
        >
          <Table className="w-4 h-4" />
        </Toggle>
      </div>

      <div
        ref={editorRef}
        id="editor"
        className={cn(
          "min-h-[400px] p-4 focus:outline-none",
          "prose prose-sm max-w-none",
          "[&_table]:border-collapse [&_td]:border [&_td]:p-2",
          "[&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded"
        )}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          if (isInternalUpdate.current) return;
          const currentHTML = (e.target as HTMLDivElement).innerHTML;
          if (currentHTML !== content) {
            onChange(currentHTML); // This will trigger the main useEffect([content])
            sendToVSCode("contentChange", { content: currentHTML }); // Send changes to VSCode
          }
          // Update active formats on input as well
          updateActiveFormats();
        }}
        // No need for onSelect, selectionchange listener is more global
      />
    </div>
  );
}
