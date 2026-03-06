package com.intellidocs.domain.agent.service;

import com.intellidocs.domain.agent.dto.SourceInfo;
import com.intellidocs.domain.search.dto.SearchResult;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SearchResultUtilsTest {

    // --- computeConfidence ---

    @Test
    void computeConfidence_emptyList_returnsZero() {
        assertThat(SearchResultUtils.computeConfidence(Collections.emptyList())).isEqualTo(0.0);
    }

    @Test
    void computeConfidence_singleResult_usesItsScore() {
        SearchResult r = SearchResult.builder().score(0.01).build();
        double confidence = SearchResultUtils.computeConfidence(List.of(r));
        // 0.01 * 60 = 0.6
        assertThat(confidence).isEqualTo(0.6);
    }

    @Test
    void computeConfidence_twoResults_usesAverage() {
        SearchResult r1 = SearchResult.builder().score(0.01).build();
        SearchResult r2 = SearchResult.builder().score(0.02).build();
        double confidence = SearchResultUtils.computeConfidence(List.of(r1, r2));
        // avg(0.01, 0.02) = 0.015, * 60 = 0.9
        assertThat(confidence).isEqualTo(0.9);
    }

    @Test
    void computeConfidence_tenResults_usesTop3Average() {
        // 10 results with scores 0.001 to 0.010
        List<SearchResult> results = new java.util.ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            results.add(SearchResult.builder().score(i * 0.001).build());
        }
        double confidence = SearchResultUtils.computeConfidence(results);
        // top-3 scores: 0.008, 0.009, 0.010 → avg = 0.009 → * 60 = 0.54
        assertThat(confidence).isCloseTo(0.54, org.assertj.core.data.Offset.offset(0.001));
    }

    @Test
    void computeConfidence_clampedToOne() {
        SearchResult r = SearchResult.builder().score(0.05).build();
        double confidence = SearchResultUtils.computeConfidence(List.of(r));
        // 0.05 * 60 = 3.0, clamped to 1.0
        assertThat(confidence).isEqualTo(1.0);
    }

    // --- computeConfidence with calculation boost ---

    @Test
    void computeConfidence_withCalculationBoost_floorsAtMedium() {
        // Low search score (0.003 * 60 = 0.18 → VERY_LOW normally)
        SearchResult r = SearchResult.builder().score(0.003).build();
        double withoutBoost = SearchResultUtils.computeConfidence(List.of(r), 0);
        double withBoost = SearchResultUtils.computeConfidence(List.of(r), 1);

        assertThat(withoutBoost).isCloseTo(0.18, org.assertj.core.data.Offset.offset(0.001));
        // With 1 calc: max(0.18, 0.5) + 0.15 = 0.65
        assertThat(withBoost).isCloseTo(0.65, org.assertj.core.data.Offset.offset(0.001));
    }

    @Test
    void computeConfidence_multipleCalcs_capsAtOne() {
        SearchResult r = SearchResult.builder().score(0.01).build();
        double confidence = SearchResultUtils.computeConfidence(List.of(r), 5);
        // max(0.6, 0.5) + 0.15*5 = 0.6 + 0.75 = 1.35 → capped at 1.0
        assertThat(confidence).isEqualTo(1.0);
    }

    @Test
    void computeConfidence_calcOnlyNoSearch_returnsBoost() {
        double confidence = SearchResultUtils.computeConfidence(Collections.emptyList(), 1);
        // max(0.0, 0.5) + 0.15 = 0.65
        assertThat(confidence).isCloseTo(0.65, org.assertj.core.data.Offset.offset(0.001));
    }

    // --- computeConfidenceLevel ---

    @Test
    void computeConfidenceLevel_boundaries() {
        assertThat(SearchResultUtils.computeConfidenceLevel(1.0)).isEqualTo("HIGH");
        assertThat(SearchResultUtils.computeConfidenceLevel(0.8)).isEqualTo("HIGH");
        assertThat(SearchResultUtils.computeConfidenceLevel(0.79)).isEqualTo("MEDIUM");
        assertThat(SearchResultUtils.computeConfidenceLevel(0.5)).isEqualTo("MEDIUM");
        assertThat(SearchResultUtils.computeConfidenceLevel(0.49)).isEqualTo("LOW");
        assertThat(SearchResultUtils.computeConfidenceLevel(0.2)).isEqualTo("LOW");
        assertThat(SearchResultUtils.computeConfidenceLevel(0.19)).isEqualTo("VERY_LOW");
        assertThat(SearchResultUtils.computeConfidenceLevel(0.0)).isEqualTo("VERY_LOW");
    }

    // --- deduplicateSources ---

    @Test
    void deduplicateSources_sameDocumentDifferentPages_mergedWithPageRange() {
        UUID docId = UUID.randomUUID();
        List<SearchResult> results = List.of(
                SearchResult.builder().documentId(docId).filename("report.pdf")
                        .pageNumber(1).chunkIndex(0).sectionTitle("intro").score(0.9).build(),
                SearchResult.builder().documentId(docId).filename("report.pdf")
                        .pageNumber(2).chunkIndex(1).sectionTitle("body").score(0.7).build(),
                SearchResult.builder().documentId(docId).filename("report.pdf")
                        .pageNumber(3).chunkIndex(2).sectionTitle("end").score(0.5).build()
        );

        List<SourceInfo> sources = SearchResultUtils.deduplicateSources(results);

        assertThat(sources).hasSize(1);
        assertThat(sources.get(0).getDocumentId()).isEqualTo(docId);
        assertThat(sources.get(0).getPageRange()).isEqualTo("p.1-3");
    }

    @Test
    void deduplicateSources_nonConsecutivePages_usesCommaNotation() {
        UUID docId = UUID.randomUUID();
        List<SearchResult> results = List.of(
                SearchResult.builder().documentId(docId).filename("report.pdf")
                        .pageNumber(1).chunkIndex(0).score(0.9).build(),
                SearchResult.builder().documentId(docId).filename("report.pdf")
                        .pageNumber(3).chunkIndex(2).score(0.7).build(),
                SearchResult.builder().documentId(docId).filename("report.pdf")
                        .pageNumber(7).chunkIndex(5).score(0.5).build()
        );

        List<SourceInfo> sources = SearchResultUtils.deduplicateSources(results);

        assertThat(sources).hasSize(1);
        assertThat(sources.get(0).getPageRange()).isEqualTo("p.1,3,7");
    }

    @Test
    void deduplicateSources_differentDocuments_separateEntries() {
        UUID doc1 = UUID.randomUUID();
        UUID doc2 = UUID.randomUUID();
        List<SearchResult> results = List.of(
                SearchResult.builder().documentId(doc1).filename("a.pdf")
                        .pageNumber(1).chunkIndex(0).score(0.9).build(),
                SearchResult.builder().documentId(doc2).filename("b.pdf")
                        .pageNumber(2).chunkIndex(3).score(0.8).build()
        );

        List<SourceInfo> sources = SearchResultUtils.deduplicateSources(results);

        assertThat(sources).hasSize(2);
        assertThat(sources.get(0).getFilename()).isEqualTo("a.pdf");
        assertThat(sources.get(1).getFilename()).isEqualTo("b.pdf");
    }

    @Test
    void deduplicateSources_nullDocumentId_skipped() {
        List<SearchResult> results = List.of(
                SearchResult.builder().filename("a.pdf").pageNumber(1).score(0.9).build()
        );

        List<SourceInfo> sources = SearchResultUtils.deduplicateSources(results);
        assertThat(sources).isEmpty();
    }

    @Test
    void deduplicateSources_mixedConsecutiveAndNonConsecutive_correctRange() {
        UUID docId = UUID.randomUUID();
        List<SearchResult> results = List.of(
                SearchResult.builder().documentId(docId).filename("r.pdf")
                        .pageNumber(1).chunkIndex(0).score(0.9).build(),
                SearchResult.builder().documentId(docId).filename("r.pdf")
                        .pageNumber(2).chunkIndex(1).score(0.8).build(),
                SearchResult.builder().documentId(docId).filename("r.pdf")
                        .pageNumber(3).chunkIndex(2).score(0.7).build(),
                SearchResult.builder().documentId(docId).filename("r.pdf")
                        .pageNumber(7).chunkIndex(5).score(0.6).build()
        );

        List<SourceInfo> sources = SearchResultUtils.deduplicateSources(results);

        assertThat(sources).hasSize(1);
        assertThat(sources.get(0).getPageRange()).isEqualTo("p.1-3,7");
    }

    @Test
    void deduplicateSources_preservesBestChunkIndex() {
        UUID docId = UUID.randomUUID();
        List<SearchResult> results = List.of(
                SearchResult.builder().documentId(docId).filename("report.pdf")
                        .pageNumber(3).chunkIndex(5).score(0.95).build(),
                SearchResult.builder().documentId(docId).filename("report.pdf")
                        .pageNumber(1).chunkIndex(0).score(0.70).build(),
                SearchResult.builder().documentId(docId).filename("report.pdf")
                        .pageNumber(2).chunkIndex(2).score(0.60).build()
        );

        List<SourceInfo> sources = SearchResultUtils.deduplicateSources(results);

        assertThat(sources).hasSize(1);
        // The best (highest score) chunk has chunkIndex=5
        assertThat(sources.get(0).getChunkIndex()).isEqualTo(5);
        assertThat(sources.get(0).getRelevanceScore()).isEqualTo(0.95);
    }
}
