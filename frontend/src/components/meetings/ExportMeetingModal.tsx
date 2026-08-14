'use client';

import { useState } from 'react';
import { MeetingDetail } from '@/lib/types';
import { formatTime, formatDate } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';

interface ExportMeetingModalProps {
  meeting: MeetingDetail;
  onClose: () => void;
}

type ExportFormat = 'pdf' | 'md' | 'txt';
type ExportScope = 'full' | 'summary' | 'transcript';

export default function ExportMeetingModal({ meeting, onClose }: ExportMeetingModalProps) {
  const { toast } = useToast();
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [scope, setScope] = useState<ExportScope>('full');
  const [exporting, setExporting] = useState(false);

  const generateMarkdown = () => {
    let content = `# ${meeting.title}\n\n`;
    content += `**Date:** ${formatDate(meeting.date)}\n`;
    content += `**Host:** ${meeting.host}\n`;
    content += `**Participants:** ${(meeting.participants || []).join(', ')}\n`;
    content += `**Duration:** ${Math.round(meeting.duration_seconds / 60)} minutes\n\n`;

    if ((scope === 'full' || scope === 'summary') && meeting.summary) {
      content += `## Executive Summary\n\n${meeting.summary.overview}\n\n`;

      if (meeting.summary.key_topics?.length > 0) {
        content += `### Key Topics\n\n${meeting.summary.key_topics.map(t => `- \`${t}\``).join('\n')}\n\n`;
      }

      if (meeting.summary.chapters?.length > 0) {
        content += `### Outline\n\n`;
        meeting.summary.chapters.forEach(ch => {
          content += `#### [${formatTime(ch.timestamp)}] ${ch.title}\n${ch.description}\n\n`;
        });
      }

      if (meeting.action_items?.length > 0) {
        content += `### Action Items\n\n`;
        meeting.action_items.forEach(item => {
          const status = item.completed ? '[x]' : '[ ]';
          const assignee = item.assignee ? ` (@${item.assignee})` : '';
          content += `- ${status} ${item.text}${assignee}\n`;
        });
        content += '\n';
      }
    }

    if ((scope === 'full' || scope === 'transcript') && meeting.transcript_lines?.length > 0) {
      content += `## Meeting Transcript\n\n`;
      meeting.transcript_lines.forEach(line => {
        content += `**[${formatTime(line.start_time)}] ${line.speaker}:** ${line.text}\n\n`;
      });
    }

    return content;
  };

  const generateText = () => {
    let content = `${meeting.title.toUpperCase()}\n`;
    content += `Date: ${formatDate(meeting.date)}\n`;
    content += `Host: ${meeting.host}\n`;
    content += `Participants: ${(meeting.participants || []).join(', ')}\n`;
    content += `========================================\n\n`;

    if ((scope === 'full' || scope === 'summary') && meeting.summary) {
      content += `EXECUTIVE SUMMARY:\n${meeting.summary.overview}\n\n`;

      if (meeting.summary.key_topics?.length > 0) {
        content += `KEY TOPICS: ${meeting.summary.key_topics.join(', ')}\n\n`;
      }

      if (meeting.action_items?.length > 0) {
        content += `ACTION ITEMS:\n`;
        meeting.action_items.forEach(item => {
          content += `- [${item.completed ? 'DONE' : 'TODO'}] ${item.text}\n`;
        });
        content += '\n';
      }
    }

    if ((scope === 'full' || scope === 'transcript') && meeting.transcript_lines?.length > 0) {
      content += `TRANSCRIPT:\n`;
      meeting.transcript_lines.forEach(line => {
        content += `[${formatTime(line.start_time)}] ${line.speaker}: ${line.text}\n`;
      });
    }

    return content;
  };

  const downloadFile = (filename: string, text: string, type: string) => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    setExporting(true);
    const cleanTitle = meeting.title.replace(/[^a-zA-Z0-9_-]/g, '_');

    try {
      if (format === 'md') {
        const mdText = generateMarkdown();
        downloadFile(`${cleanTitle}_notes.md`, mdText, 'text/markdown');
        toast('Exported as Markdown (.md)', 'success');
      } else if (format === 'txt') {
        const txtText = generateText();
        downloadFile(`${cleanTitle}_notes.txt`, txtText, 'text/plain');
        toast('Exported as Text (.txt)', 'success');
      } else if (format === 'pdf') {
        // PDF Printable Window
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>${meeting.title} — RulerAI Export</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; }
                h1 { color: #6938ef; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 8px; }
                .meta { color: #64748b; font-size: 14px; margin-bottom: 24px; }
                .section-title { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 24px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
                .chip { display: inline-block; background: #f1f5f9; padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; color: #475569; margin-right: 6px; }
                .transcript-line { margin-bottom: 12px; }
                .speaker { font-weight: bold; color: #6938ef; }
                .time { color: #94a3b8; font-size: 12px; margin-right: 8px; }
                .action-item { padding: 6px 0; border-bottom: 1px stroke #f1f5f9; }
                @media print { body { padding: 0; } }
              </style>
            </head>
            <body>
              <h1>${meeting.title}</h1>
              <div class="meta">
                Date: ${formatDate(meeting.date)} &bull; Host: ${meeting.host} &bull; Duration: ${Math.round(meeting.duration_seconds / 60)} mins
              </div>

              ${(scope === 'full' || scope === 'summary') && meeting.summary ? `
                <div class="section-title">Executive Summary</div>
                <p>${meeting.summary.overview}</p>

                ${meeting.summary.key_topics?.length > 0 ? `
                  <div style="margin: 16px 0;">
                    ${meeting.summary.key_topics.map(t => `<span class="chip">${t}</span>`).join('')}
                  </div>
                ` : ''}

                ${meeting.action_items?.length > 0 ? `
                  <div class="section-title">Action Items</div>
                  ${meeting.action_items.map(item => `
                    <div class="action-item">
                      ${item.completed ? '☑' : '☐'} <strong>${item.text}</strong> ${item.assignee ? `(Assignee: ${item.assignee})` : ''}
                    </div>
                  `).join('')}
                ` : ''}
              ` : ''}

              ${(scope === 'full' || scope === 'transcript') && meeting.transcript_lines?.length > 0 ? `
                <div class="section-title">Meeting Transcript</div>
                ${meeting.transcript_lines.map(line => `
                  <div class="transcript-line">
                    <span class="time">[${formatTime(line.start_time)}]</span>
                    <span class="speaker">${line.speaker}:</span>
                    <span>${line.text}</span>
                  </div>
                `).join('')}
              ` : ''}

              <script>
                window.onload = function() {
                  window.print();
                };
              </script>
            </body>
            </html>
          `;
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          toast('PDF Export view launched for printing/saving', 'success');
        }
      }
    } catch {
      toast('Export failed', 'error');
    } finally {
      setExporting(false);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <h2 className="modal-title">Export Meeting Notes</h2>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body space-y-6">
          {/* Scope Selector */}
          <div>
            <label className="form-label mb-2" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              Export Scope
            </label>
            <div className="export-scope-grid">
              {[
                { id: 'full', label: 'Full Document' },
                { id: 'summary', label: 'Summary Only' },
                { id: 'transcript', label: 'Transcript Only' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScope(item.id as ExportScope)}
                  className={`export-scope-btn ${scope === item.id ? 'active' : ''}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format Selector */}
          <div>
            <label className="form-label mb-2" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              File Format
            </label>
            <div className="export-format-grid">
              {[
                { id: 'pdf', name: 'PDF', icon: '', desc: 'Printable / PDF' },
                { id: 'md', name: 'Markdown', icon: '', desc: '.md Document' },
                { id: 'txt', name: 'Text', icon: '', desc: '.txt Plain Text' },
              ].map(fmt => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setFormat(fmt.id as ExportFormat)}
                  className={`export-format-card ${format === fmt.id ? 'active' : ''}`}
                >
                  <div className="export-format-icon">{fmt.icon}</div>
                  <div className="export-format-title">{fmt.name}</div>
                  <div className="export-format-desc">{fmt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>


        <div className="modal-footer flex items-center justify-end gap-3">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
            onClick={handleExport}
            disabled={exporting}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download {format.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
}
