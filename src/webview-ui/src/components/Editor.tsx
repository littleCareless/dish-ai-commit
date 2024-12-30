import { useCallback, useEffect, useRef } from "react";
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

export function Editor({ content, onChange }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!editorRef.current) return;

      switch (message.type) {
        case getMessageType('updateContent'): {
          // 标记这是一个内部更新
          isInternalUpdate.current = true;
          const selection = window.getSelection();
          const range = selection?.getRangeAt(0);

          // 更新内容
          editorRef.current.innerHTML = message.content;
          onChange(message.content);

          // 恢复光标位置
          if (range && selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }

          isInternalUpdate.current = false;
          break;
        }
        case getMessageType('loadContent'): {
          editorRef.current.innerHTML = message.content;
          onChange(message.content);
          break;
        }
      }
    };

    // 初始化内容
    if (editorRef.current && content) {
      editorRef.current.innerHTML = content;
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onChange]); // 只在组件挂载时执行一次

  const sendToVSCode = useCallback((type: string, data: { content: string }) => {
    if (window.vscode) {
      window.vscode.postMessage({ 
        type: getMessageType(type), 
        data 
      });
    }
  }, []);

  return (
    <div className="border rounded-lg">
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/50">
        <Toggle
          size="sm"
          onClick={() => execCommand("bold")}
          aria-label="Toggle bold"
        >
          <Bold className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          onClick={() => execCommand("italic")}
          aria-label="Toggle italic"
        >
          <Italic className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          onClick={() => execCommand("underline")}
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
          onClick={() => execCommand("insertUnorderedList")}
          aria-label="Toggle bullet list"
        >
          <List className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          onClick={() => execCommand("insertOrderedList")}
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
          onClick={() => execCommand("formatBlock", "<h1>")}
          aria-label="Toggle heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          onClick={() => execCommand("formatBlock", "<h2>")}
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
          onClick={() => execCommand("insertHTML", "<pre><code></code></pre>")}
          aria-label="Insert code block"
        >
          <Code className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          onClick={() =>
            execCommand("insertHTML", "<table><tr><td></td></tr></table>")
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
        onInput={(e) => {
          if (isInternalUpdate.current) return;
          const content = (e.target as HTMLDivElement).innerHTML;
          onChange(content);
          sendToVSCode("contentChange", { content });
        }}
      />
    </div>
  );
}
