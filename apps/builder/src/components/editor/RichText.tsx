"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Link2, List, ListOrdered } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/cn";

/** Minimal rich text: bold, italic, link, bullet and numbered lists — nothing else. */
export default function RichText({ id, value, onChange, placeholder, invalid, label }: { id: string; value: string; onChange: (html: string) => void; placeholder?: string; invalid?: boolean; label: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        strike: false,
        horizontalRule: false,
        underline: false,
        link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"], HTMLAttributes: { rel: "noopener noreferrer nofollow", target: null } },
      }),
    ],
    content: value,
    editorProps: { attributes: { id, role: "textbox", "aria-multiline": "true", "aria-label": label, class: "rich text-sm leading-relaxed", ...(placeholder ? { "data-placeholder": placeholder } : {}) } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  // Keep in sync with external changes (undo/redo, version restore).
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (current !== value) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  const btn = (active: boolean) => cn("grid size-8 place-items-center rounded-md text-dim hover:bg-panel2 hover:text-fg", active && "bg-brand-soft text-fg");
  const setLink = () => {
    if (!editor) return;
    const prev = (editor.getAttributes("link").href as string | undefined) ?? "https://";
    const url = window.prompt("Link URL (leave empty to remove)", prev);
    if (url === null) return;
    if (url.trim() === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else if (/^(https?:\/\/|mailto:)/i.test(url.trim())) editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    else window.alert("Links must start with http://, https:// or mailto:");
  };

  return (
    <div className={cn("rounded-lg border bg-panel", invalid ? "border-bad" : "border-edge", "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand")}>
      <div role="toolbar" aria-label="Formatting" className="flex gap-0.5 border-b border-rule p-1">
        <button type="button" className={btn(Boolean(editor?.isActive("bold")))} aria-label="Bold" aria-pressed={Boolean(editor?.isActive("bold"))} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold className="size-4" />
        </button>
        <button type="button" className={btn(Boolean(editor?.isActive("italic")))} aria-label="Italic" aria-pressed={Boolean(editor?.isActive("italic"))} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic className="size-4" />
        </button>
        <button type="button" className={btn(Boolean(editor?.isActive("link")))} aria-label="Link" aria-pressed={Boolean(editor?.isActive("link"))} onClick={setLink}>
          <Link2 className="size-4" />
        </button>
        <button type="button" className={btn(Boolean(editor?.isActive("bulletList")))} aria-label="Bulleted list" aria-pressed={Boolean(editor?.isActive("bulletList"))} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List className="size-4" />
        </button>
        <button type="button" className={btn(Boolean(editor?.isActive("orderedList")))} aria-label="Numbered list" aria-pressed={Boolean(editor?.isActive("orderedList"))} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="size-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
