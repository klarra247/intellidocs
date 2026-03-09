package com.intellidocs.domain.document.controller;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.config.SecurityConfig;
import com.intellidocs.domain.auth.service.JwtService;
import com.intellidocs.domain.document.dto.DocumentDto;
import com.intellidocs.domain.document.service.DocumentReviewService;
import com.intellidocs.domain.document.service.DocumentService;
import com.intellidocs.domain.document.service.DocumentSseEmitterService;
import com.intellidocs.domain.workspace.repository.WorkspaceMemberRepository;
import com.intellidocs.domain.workspace.repository.WorkspaceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DocumentController.class)
@Import(SecurityConfig.class)
class DocumentFilePreviewTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DocumentService documentService;

    @MockitoBean
    private DocumentSseEmitterService sseEmitterService;

    @MockitoBean
    private DocumentReviewService reviewService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private WorkspaceRepository workspaceRepository;

    @MockitoBean
    private WorkspaceMemberRepository workspaceMemberRepository;

    private static final UUID DOC_ID = UUID.randomUUID();

    @Test
    void getFile_pdf_returnsStream() throws Exception {
        byte[] content = "PDF content".getBytes(StandardCharsets.UTF_8);
        StreamingResponseBody body = outputStream -> outputStream.write(content);
        ResponseEntity<StreamingResponseBody> response = ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "application/pdf")
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename*=UTF-8''test.pdf")
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(content.length))
                .body(body);

        when(documentService.streamFile(DOC_ID)).thenReturn(response);

        mockMvc.perform(get("/api/v1/documents/{id}/file", DOC_ID))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "application/pdf"));
    }

    @Test
    void getFile_documentNotReady_returns409() throws Exception {
        when(documentService.streamFile(DOC_ID))
                .thenThrow(BusinessException.documentNotReady(DOC_ID));

        mockMvc.perform(get("/api/v1/documents/{id}/file", DOC_ID))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("DOCUMENT_NOT_READY"));
    }

    @Test
    void getFile_fileMissing_returns500() throws Exception {
        when(documentService.streamFile(DOC_ID))
                .thenThrow(BusinessException.fileMissing(DOC_ID));

        mockMvc.perform(get("/api/v1/documents/{id}/file", DOC_ID))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("FILE_MISSING"));
    }

    @Test
    void getPreview_excel_returnsOk() throws Exception {
        Map<String, Object> previewData = Map.of("sheets", java.util.List.of());
        when(documentService.getPreview(DOC_ID)).thenReturn(previewData);

        mockMvc.perform(get("/api/v1/documents/{id}/preview", DOC_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sheets").isArray());
    }

    @Test
    void getPreview_unsupportedType_returns400() throws Exception {
        when(documentService.getPreview(DOC_ID))
                .thenThrow(BusinessException.unsupportedPreviewType("PDF"));

        mockMvc.perform(get("/api/v1/documents/{id}/preview", DOC_ID))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("UNSUPPORTED_PREVIEW_TYPE"));
    }
}
