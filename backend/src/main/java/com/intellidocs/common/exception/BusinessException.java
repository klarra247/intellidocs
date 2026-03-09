package com.intellidocs.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.util.UUID;

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

    public static BusinessException documentNotReady(UUID id) {
        return new BusinessException(
                "DOCUMENT_NOT_READY",
                "문서 처리가 완료되지 않았습니다: " + id,
                HttpStatus.CONFLICT
        );
    }

    public static BusinessException fileMissing(UUID id) {
        return new BusinessException(
                "FILE_MISSING",
                "파일을 찾을 수 없습니다. 관리자에게 문의하세요: " + id,
                HttpStatus.INTERNAL_SERVER_ERROR
        );
    }

    public static BusinessException unsupportedPreviewType(String type) {
        return new BusinessException(
                "UNSUPPORTED_PREVIEW_TYPE",
                "미리보기는 Excel 파일만 지원합니다: " + type,
                HttpStatus.BAD_REQUEST
        );
    }

    public static BusinessException parsingServiceUnavailable(String reason) {
        return new BusinessException(
                "PARSING_SERVICE_UNAVAILABLE",
                "파싱 서비스와 통신할 수 없습니다: " + reason,
                HttpStatus.BAD_GATEWAY
        );
    }

    public static BusinessException tooManyChunks(int requested, int max) {
        return new BusinessException(
                "TOO_MANY_CHUNKS",
                "한 번에 최대 " + max + "개의 청크만 조회할 수 있습니다 (요청: " + requested + "개)",
                HttpStatus.BAD_REQUEST
        );
    }

    public static BusinessException forbidden(String message) {
        return new BusinessException("FORBIDDEN", message, HttpStatus.FORBIDDEN);
    }

    public static BusinessException conflict(String message) {
        return new BusinessException("CONFLICT", message, HttpStatus.CONFLICT);
    }

    public static BusinessException tooManyRequests(String message) {
        return new BusinessException("TOO_MANY_REQUESTS", message, HttpStatus.TOO_MANY_REQUESTS);
    }
}