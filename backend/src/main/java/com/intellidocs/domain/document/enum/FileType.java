package com.intellidocs.domain.document.entity;

import java.util.Arrays;

public enum FileType {
    PDF("application/pdf", "pdf"),
    DOCX("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"),
    XLSX("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"),
    TXT("text/plain", "txt"),
    MD("text/markdown", "md");

    private final String mimeType;
    private final String extension;

    FileType(String mimeType, String extension) {
        this.mimeType = mimeType;
        this.extension = extension;
    }

    public String getMimeType() {
        return mimeType;
    }

    public String getExtension() {
        return extension;
    }

    public static FileType fromFilename(String filename) {
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        return Arrays.stream(values())
                .filter(ft -> ft.extension.equals(ext))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported file type: " + ext));
    }

    public static boolean isSupported(String filename) {
        try {
            fromFilename(filename);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}