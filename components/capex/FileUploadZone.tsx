"use client";

import { useCallback, useRef, useState } from "react";
import { Paperclip, Upload, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Attachment {
  id: string;
  fileName: string;
  fileContent: string;
}

interface Props {
  capExRequestId: string;
  sectionId?: string;
  secondaryId?: string;
  initialAttachments?: Attachment[];
  disabled?: boolean;
  label?: string;
  accept?: string;
}

export function FileUploadZone({
  capExRequestId,
  sectionId,
  secondaryId,
  initialAttachments = [],
  disabled = false,
  label = "Attachments",
  accept,
}: Props) {
  const defaultAccept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.zip,.csv,.txt";
  const resolvedAccept = accept ?? defaultAccept;
  const isImageOnly = !!accept && accept.includes("image/");
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (files: FileList) => {
      setError("");
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("capExRequestId", capExRequestId);
          if (sectionId) fd.append("sectionId", sectionId);
          if (secondaryId) fd.append("secondaryId", secondaryId);

          const res = await fetch("/api/uploads", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Upload failed");
            return;
          }
          setAttachments((prev) => [data, ...prev]);
        }
      } finally {
        setUploading(false);
      }
    },
    [capExRequestId, sectionId, secondaryId]
  );

  async function remove(id: string) {
    const res = await fetch(`/api/uploads?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (disabled || !e.dataTransfer.files.length) return;
    upload(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">{label}</p>

      {/* Drop zone */}
      {!disabled && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 transition-colors cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            Drag & drop files here, or{" "}
            <span className="text-[#0f1e35] font-medium">browse</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isImageOnly ? "PNG, JPG, JPEG images — max 10 MB each" : "PDF, Word, Excel, images — max 10 MB each"}
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && upload(e.target.files)}
            accept={resolvedAccept}
          />
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading…
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* File list */}
      {attachments.length > 0 && (
        <ul className="space-y-1.5">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                <a
                  href={a.fileContent}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#0f1e35] hover:underline truncate"
                >
                  {a.fileName}
                </a>
              </div>
              {!disabled && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(a.id)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {attachments.length === 0 && disabled && (
        <p className="text-sm text-gray-400 flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" /> No attachments
        </p>
      )}
    </div>
  );
}
