package com.intellidocs.domain.knowledgegraph.controller;

import com.intellidocs.domain.knowledgegraph.dto.KnowledgeGraphDto;
import com.intellidocs.domain.knowledgegraph.service.KnowledgeGraphService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
class KnowledgeGraphControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private KnowledgeGraphService knowledgeGraphService;

    @Test
    void 그래프_조회_빈_워크스페이스는_빈_결과_200() throws Exception {
        when(knowledgeGraphService.getGraph(any(), any(), any()))
                .thenReturn(KnowledgeGraphDto.GraphResponse.builder()
                        .nodes(List.of())
                        .edges(List.of())
                        .stats(KnowledgeGraphDto.Stats.builder()
                                .totalDocuments(0).totalMetrics(0)
                                .totalEdges(0).crossDocumentMetrics(0).build())
                        .build());

        mockMvc.perform(get("/api/v1/knowledge-graph"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nodes").isArray())
                .andExpect(jsonPath("$.data.nodes").isEmpty())
                .andExpect(jsonPath("$.data.stats.totalDocuments").value(0));
    }

    @Test
    void 통계_조회() throws Exception {
        when(knowledgeGraphService.getStats(any()))
                .thenReturn(KnowledgeGraphDto.StatsResponse.builder()
                        .totalDocuments(2)
                        .totalMetrics(5)
                        .crossDocumentMetrics(3)
                        .build());

        mockMvc.perform(get("/api/v1/knowledge-graph/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalDocuments").value(2))
                .andExpect(jsonPath("$.data.totalMetrics").value(5));
    }

    @Test
    void 지표_검색() throws Exception {
        KnowledgeGraphDto.Node node = KnowledgeGraphDto.Node.builder()
                .id("metric_매출액").type("metric")
                .name("매출액").build();

        when(knowledgeGraphService.searchMetrics(any(), eq("매출")))
                .thenReturn(KnowledgeGraphDto.SearchResponse.builder()
                        .results(List.of(node)).build());

        mockMvc.perform(get("/api/v1/knowledge-graph/search").param("q", "매출"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.results[0].name").value("매출액"));
    }
}
