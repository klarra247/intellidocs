package com.intellidocs.domain.diff.service;

import com.intellidocs.domain.diff.entity.DiffResultData;
import com.intellidocs.domain.discrepancy.service.DiscrepancyDetectionEngine;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.entity.FileType;
import com.intellidocs.domain.document.repository.DocumentChunkRepository;
import com.intellidocs.domain.search.service.HybridSearchService;
import dev.langchain4j.model.chat.ChatLanguageModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentDiffEngineTest {

    @Mock private DiscrepancyDetectionEngine discrepancyEngine;
    @Mock private DocumentChunkRepository chunkRepo;
    @Mock private HybridSearchService searchService;
    @Mock private ChatLanguageModel llm;

    private DocumentDiffEngine engine;

    @BeforeEach
    void setUp() {
        engine = new DocumentDiffEngine(discrepancyEngine, chunkRepo, searchService, llm);
    }

    private Document buildDocument(UUID id, String filename) {
        return Document.builder()
                .id(id)
                .userId(UUID.randomUUID())
                .workspaceId(UUID.randomUUID())
                .filename(filename)
                .originalFilename(filename)
                .fileType(FileType.PDF)
                .fileSize(1000L)
                .storagePath("/tmp/" + filename)
                .status(DocumentStatus.INDEXED)
                .build();
    }

    @Test
    void compareNumericValues_calculatesChangeCorrectly() {
        UUID srcId = UUID.randomUUID();
        UUID tgtId = UUID.randomUUID();
        Document source = buildDocument(srcId, "2023_report.pdf");
        Document target = buildDocument(tgtId, "2024_report.pdf");

        // Setup mock: identifyCommonFields returns one field
        when(discrepancyEngine.identifyCommonFields(anyList())).thenReturn(List.of("매출"));

        // Setup mock: extractValues returns values for both documents
        DiscrepancyDetectionEngine.ExtractedValue sv = new DiscrepancyDetectionEngine.ExtractedValue();
        sv.setField("매출");
        sv.setPeriod("2023");
        sv.setValue("100억");
        sv.setNumericValue(10_000_000_000.0);
        sv.setUnit("원");
        sv.setDocumentId(srcId.toString());

        DiscrepancyDetectionEngine.ExtractedValue tv = new DiscrepancyDetectionEngine.ExtractedValue();
        tv.setField("매출");
        tv.setPeriod("2023");
        tv.setValue("120억");
        tv.setNumericValue(12_000_000_000.0);
        tv.setUnit("원");
        tv.setDocumentId(tgtId.toString());

        Map<String, List<DiscrepancyDetectionEngine.ExtractedValue>> extracted = new LinkedHashMap<>();
        extracted.put("매출", List.of(sv, tv));
        when(discrepancyEngine.extractValues(anyList(), anyList())).thenReturn(extracted);

        List<DiffResultData.NumericChange> changes = engine.compareNumericValues(source, target);

        assertThat(changes).hasSize(1);
        DiffResultData.NumericChange change = changes.get(0);
        assertThat(change.getField()).isEqualTo("매출");
        assertThat(change.getChangeAbsolute()).isEqualTo(2_000_000_000.0);
        assertThat(change.getChangePercent()).isCloseTo(20.0, org.assertj.core.data.Offset.offset(0.1));
        assertThat(change.getDirection()).isEqualTo("INCREASED");
    }

    @Test
    void buildFullResult_summaryCountsCorrectly() {
        UUID srcId = UUID.randomUUID();
        UUID tgtId = UUID.randomUUID();
        Document source = buildDocument(srcId, "v1.pdf");
        Document target = buildDocument(tgtId, "v2.pdf");

        // No numeric fields found
        when(discrepancyEngine.identifyCommonFields(anyList())).thenReturn(List.of());

        // No section titles
        when(chunkRepo.findDistinctSectionTitlesByDocumentId(srcId)).thenReturn(List.of("섹션A"));
        when(chunkRepo.findDistinctSectionTitlesByDocumentId(tgtId)).thenReturn(List.of("섹션A", "섹션B"));

        // For section comparison (섹션A common), mock search returning empty
        when(searchService.search(org.mockito.ArgumentMatchers.any()))
                .thenReturn(com.intellidocs.domain.search.dto.SearchResponse.builder()
                        .results(List.of())
                        .build());

        DiffResultData result = engine.buildFullResult(source, target);

        assertThat(result.getSummary()).isNotNull();
        // 섹션B is ADDED (1 added)
        assertThat(result.getSummary().getAdded()).isEqualTo(1);
        assertThat(result.getTextChanges()).isNotEmpty();
        assertThat(result.getTextChanges().stream()
                .anyMatch(tc -> "ADDED".equals(tc.getType()) && "섹션B".equals(tc.getSectionTitle())))
                .isTrue();
    }
}
