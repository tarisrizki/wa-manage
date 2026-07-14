import React from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface FileUploadAreaProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate?: () => void;
  title?: string;
  description?: string;
  accept?: string;
  fileInputRef?: React.RefObject<HTMLInputElement>;
}

export function FileUploadArea({
  onFileUpload,
  onDownloadTemplate,
  title = "Upload Data",
  description = "Pilih file Excel/CSV",
  accept = ".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/plain",
  fileInputRef
}: FileUploadAreaProps) {
  const defaultRef = React.useRef<HTMLInputElement>(null);
  const refToUse = fileInputRef || defaultRef;

  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-xl p-8 bg-muted/20 hover:bg-muted/40 transition-colors">
      <div className="bg-wa-primary/10 p-4 rounded-full mb-4">
        <Upload size={32} className="text-wa-primary" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
        {description}
      </p>
      
      <div className="flex gap-3">
        <button
          onClick={() => refToUse.current?.click()}
          className="flex items-center px-4 py-2 bg-wa-primary hover:bg-wa-primary/90 text-primary-foreground rounded-md text-sm font-medium transition-colors"
        >
          <FileSpreadsheet size={16} className="mr-2" />
          Pilih File
        </button>
        {onDownloadTemplate && (
          <button
            onClick={onDownloadTemplate}
            className="flex items-center px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md text-sm font-medium transition-colors"
          >
            Download Template
          </button>
        )}
      </div>
      
      <input
        type="file"
        accept={accept}
        ref={refToUse}
        onChange={onFileUpload}
        className="hidden"
      />
    </div>
  );
}
