'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Image as ImageIcon, Video, X, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface EvidenceItem {
  id: string;
  ticket_id: string;
  file_name: string;
  file_type: string;
  caption: string | null;
  created_at: string;
}

interface EvidencePanelProps {
  ticketId: string;
  readOnly?: boolean;
}

export default function EvidencePanel({ ticketId, readOnly }: EvidencePanelProps) {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<EvidenceItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/tickets/evidence?ticketId=${ticketId}`);
      const d = await res.json();
      if (d.success) setItems(d.evidence);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, [ticketId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('ticketId', ticketId);
      fd.append('file', file);
      try {
        const res = await fetch('/api/tickets/evidence', { method: 'POST', body: fd });
        const d = await res.json();
        if (!d.success) { setError(d.error || 'Upload failed'); break; }
      } catch (e: any) {
        setError(e.message);
        break;
      }
    }
    setUploading(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this evidence?')) return;
    await fetch(`/api/tickets/evidence?id=${id}`, { method: 'DELETE' });
    await load();
  };

  const srcUrl = (item: EvidenceItem) => `/api/tickets/evidence/file?id=${item.id}`;
  const isImage = (item: EvidenceItem) => item.file_type?.startsWith('image/');
  const isVideo = (item: EvidenceItem) => item.file_type?.startsWith('video/');

  return (
    <div className="space-y-3">
      {/* Upload zone (hidden when readOnly) */}
      {!readOnly && (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          className={cn(
            "border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer transition-colors",
            "hover:border-blue-500/50 hover:bg-blue-500/5",
            uploading && "opacity-60 cursor-wait"
          )}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            {uploading
              ? <><Loader2 size={14} className="animate-spin" /> Uploading…</>
              : <><Upload size={14} /> Drop screenshots / videos or click to upload</>
            }
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-1">PNG, JPG, GIF, WEBP, MP4, WEBM, MOV</p>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">{error}</p>
      )}

      {/* Evidence grid */}
      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60 italic py-2">
          {readOnly
            ? <><ImageIcon size={13} /> No evidence attached yet.</>
            : <><CheckCircle2 size={13} /> No evidence yet — upload screenshots or video to prove test completion.</>
          }
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => (
            <div key={item.id} className="relative group rounded-lg overflow-hidden border border-border bg-muted/20">
              {isImage(item) && (
                <img
                  src={srcUrl(item)}
                  alt={item.file_name}
                  className="w-full h-28 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setLightbox(item)}
                />
              )}
              {isVideo(item) && (
                <video
                  src={srcUrl(item)}
                  className="w-full h-28 object-cover cursor-pointer"
                  controls={false}
                  onClick={() => setLightbox(item)}
                />
              )}
              {!isImage(item) && !isVideo(item) && (
                <div className="h-28 flex items-center justify-center text-muted-foreground">
                  <Video size={24} />
                </div>
              )}
              {/* Type badge */}
              <div className="absolute top-1.5 left-1.5">
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/60 text-white">
                  {isImage(item) ? 'IMG' : 'VID'}
                </span>
              </div>
              {/* Delete */}
              {!readOnly && (
                <button
                  onClick={() => handleDelete(item.id)}
                  className="absolute top-1.5 right-1.5 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <Trash2 size={10} />
                </button>
              )}
              {/* File name */}
              <div className="px-2 py-1 text-[9px] text-muted-foreground truncate border-t border-border/50">
                {item.file_name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative w-[55vw] min-w-[360px] max-w-[900px] bg-[#111] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — filename + close, never overlaps content */}
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {isImage(lightbox) ? <ImageIcon size={13} className="text-white/50 shrink-0" /> : <Video size={13} className="text-white/50 shrink-0" />}
                <span className="text-white/70 text-xs font-medium truncate">{lightbox.file_name}</span>
              </div>
              <button
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                onClick={() => setLightbox(null)}
              >
                <X size={15} />
              </button>
            </div>

            {/* Media content */}
            {isImage(lightbox) && (
              <img
                src={srcUrl(lightbox)}
                alt={lightbox.file_name}
                className="w-full max-h-[75vh] object-contain bg-black"
              />
            )}
            {isVideo(lightbox) && (
              <video
                src={srcUrl(lightbox)}
                controls
                autoPlay
                className="w-full max-h-[75vh] bg-black block"
                // controls are part of the video element itself — nothing sits on top
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
