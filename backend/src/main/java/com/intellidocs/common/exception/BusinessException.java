package com.intellidocs.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class BusinessException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    public BusinessException(String code, String message, HttpStatus status) {
        super(message);
        this.code = code;
        this.status = status;
    }

    // === Factory Methods ===

    public static BusinessException notFound(String resource, Object id) {
        return new BusinessException(
                "NOT_FOUND",
                resource + " not found: " + id,
                HttpStatus.NOT_FOUND
        );
    }

    public static BusinessException badRequest(String message) {
        return new BusinessException("BAD_REQUEST", message, HttpStatus.BAD_REQUEST);
    }

    public static BusinessException unauthorized(String message) {
        return new BusinessException("UNAUTHORIZED", message, HttpStatus.UNAUTHORIZED);
    }

    public static BusinessException unsupportedFileType(String filename) {
        return new BusinessException(
                "UNSUPPORTED_FILE_TYPE",
                "Unsupported file type: " + filename,
                HttpStatus.BAD_REQUEST
        );
    }

    public static BusinessException parsingFailed(String reason) {
        return new BusinessException(
                "PARSING_FAILED",
                "Document parsing failed: " + reason,
                HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
}