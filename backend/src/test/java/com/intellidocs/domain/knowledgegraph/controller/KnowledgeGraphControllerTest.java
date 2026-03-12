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
import java.util.Map;
import java.util.UUID;

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
                                .totalNodes(0).totalEdges(0).entityTypes(Map.of()).build())
                        .build());

        mockMvc.perform(get("/api/v1/knowledge-graph"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nodes").isArray())
                .andExpect(jsonPath("$.data.nodes").isEmpty())
                .andExpect(jsonPath("$.data.stats.totalNodes").value(0));
    }

    @Test
    void 통계_조회() throws Exception {
        when(knowledgeGraphService.getStats(any()))
                .thenReturn(KnowledgeGraphDto.StatsResponse.builder()
                        .totalEntities(10)
                        .totalRelations(5)
                        .byType(Map.of("METRIC", 4L, "COMPANY", 3L))
                        .build());

        mockMvc.perform(get("/api/v1/knowledge-graph/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalEntities").value(10))
                .andExpect(jsonPath("$.data.totalRelations").value(5));
    }

    @Test
    void 엔티티_검색() throws Exception {
        KnowledgeGraphDto.Node node = KnowledgeGraphDto.Node.builder()
                .id(UUID.randomUUID()).type("entity").entityType("METRIC")
                .name("매출액").normalizedName("매출액").build();

        when(knowledgeGraphService.searchEntities(any(), eq("매출")))
                .thenReturn(KnowledgeGraphDto.SearchResponse.builder()
                        .entities(List.of(node)).build());

        mockMvc.perform(get("/api/v1/knowledge-graph/search").param("q", "매출"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.entities[0].name").value("매출액"));
    }
}
