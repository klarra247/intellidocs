package com.intellidocs.domain.document.controller;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.config.SecurityConfig;
import com.intellidocs.domain.auth.service.JwtService;
import com.intellidocs.domain.document.dto.ChunkDto;
import com.intellidocs.domain.document.entity.DocumentChunk;
import com.intellidocs.domain.document.service.ChunkService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ChunkController.class)
@Import(SecurityConfig.class)
class ChunkControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ChunkService chunkService;

    @MockitoBean
    private JwtService jwtService;

    private static final UUID DOC_ID = UUID.randomUUID();

    @Test
    void getChunk_returnsOk() throws Exception {
        ChunkDto.Response response = ChunkDto.Response.builder()
                .documentId(DOC_ID)
                .chunkIndex(0)
                .text("sample text")
                .pageNumber(1)
                .sectionTitle("Introduction")
                .chunkType(DocumentChunk.ChunkType.TEXT)
                .tokenCount(42)
                .build();

        when(chunkService.getChunk(DOC_ID, 0)).thenReturn(response);

        mockMvc.perform(get("/api/v1/documents/{documentId}/chunks/{chunkIndex}", DOC_ID, 0))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.chunkIndex").value(0))
                .andExpect(jsonPath("$.data.text").value("sample text"))
                .andExpect(jsonPath("$.data.pageNumber").value(1));
    }

    @Test
    void getChunk_notFound_returns404() throws Exception {
        when(chunkService.getChunk(DOC_ID, 999))
                .thenThrow(BusinessException.notFound("Chunk", DOC_ID + "/999"));

        mockMvc.perform(get("/api/v1/documents/{documentId}/chunks/{chunkIndex}", DOC_ID, 999))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    void getChunks_returnsOk() throws Exception {
        ChunkDto.Response chunk0 = ChunkDto.Response.builder()
                .documentId(DOC_ID)
                .chunkIndex(0)
                .text("text 0")
                .chunkType(DocumentChunk.ChunkType.TEXT)
                .tokenCount(10)
                .build();
        ChunkDto.Response chunk1 = ChunkDto.Response.builder()
                .documentId(DOC_ID)
                .chunkIndex(1)
                .text("text 1")
                .chunkType(DocumentChunk.ChunkType.TABLE)
                .tokenCount(20)
                .build();

        ChunkDto.BulkResponse bulkResponse = ChunkDto.BulkResponse.builder()
                .documentId(DOC_ID)
                .chunks(List.of(chunk0, chunk1))
                .notFound(List.of(5))
                .build();

        when(chunkService.getChunks(DOC_ID, List.of(0, 1, 5))).thenReturn(bulkResponse);

        mockMvc.perform(get("/api/v1/documents/{documentId}/chunks", DOC_ID)
                        .param("indices", "0", "1", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.chunks.length()").value(2))
                .andExpect(jsonPath("$.data.notFound[0]").value(5));
    }

    @Test
    void getChunks_tooMany_returns400() throws Exception {
        List<Integer> tooMany = java.util.stream.IntStream.range(0, 21).boxed().toList();

        when(chunkService.getChunks(DOC_ID, tooMany))
                .thenThrow(BusinessException.tooManyChunks(21, 20));

        String[] params = tooMany.stream().map(String::valueOf).toArray(String[]::new);
        mockMvc.perform(get("/api/v1/documents/{documentId}/chunks", DOC_ID)
                        .param("indices", params))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("TOO_MANY_CHUNKS"));
    }

    @Test
    void getChunk_negativeIndex_returns400() throws Exception {
        when(chunkService.getChunk(DOC_ID, -1))
                .thenThrow(BusinessException.badRequest("유효하지 않은 청크 인덱스: -1"));

        mockMvc.perform(get("/api/v1/documents/{documentId}/chunks/{chunkIndex}", DOC_ID, -1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void getChunk_invalidUuid_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/documents/{documentId}/chunks/{chunkIndex}", "not-a-uuid", 0))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_PARAMETER"));
    }

    @Test
    void getChunks_missingIndices_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/documents/{documentId}/chunks", DOC_ID))
                .andExpect(status().isBadRequest());
    }
}
