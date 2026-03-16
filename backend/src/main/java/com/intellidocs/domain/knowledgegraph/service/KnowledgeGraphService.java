package com.intellidocs.domain.knowledgegraph.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.knowledgegraph.dto.KnowledgeGraphDto;
import com.intellidocs.domain.knowledgegraph.entity.DocumentMetric;
import com.intellidocs.domain.knowledgegraph.repository.DocumentMetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class KnowledgeGraphService {

    private final DocumentMetricRepository metricRepository;
    private final DocumentRepository documentRepository;
    private final KgExtractionAsyncExecutor asyncExecutor;

    private static final int MAX_NODES = 200;
    private static final int MAX_EDGES = 500;

    private final Set<UUID> rebuildingWorkspaces = ConcurrentHashMap.newKeySet();

    @Transactional(readOnly = true)
    public KnowledgeGraphDto.GraphResponse getGraph(UUID workspaceId,
                                                     List<UUID> documentIds,
                                                     String changeDirection) {
        List<DocumentMetric> metrics;
        if (documentIds != null && !documentIds.isEmpty()) {
            metrics = metricRepository.findByWorkspaceIdAndDocumentIdIn(workspaceId, documentIds);
        } else {
            metrics = metricRepository.findByWorkspaceId(workspaceId);
        }

        // Build document map
        Set<UUID> docIds = metrics.stream()
                .map(DocumentMetric::getDocumentId)
                .collect(Collectors.toSet());
        Map<UUID, Document> docMap = documentRepository.findAllById(docIds).stream()
                .collect(Collectors.toMap(Document::getId, d -> d));

        // Group metrics by normalizedMetric
        Map<String, List<DocumentMetric>> metricGroups = metrics.stream()
                .collect(Collectors.groupingBy(DocumentMetric::getNormalizedMetric));

        List<KnowledgeGraphDto.Node> nodes = new ArrayList<>();
        List<KnowledgeGraphDto.Edge> edges = new ArrayList<>();

        // Add document nodes
        for (Document doc : docMap.values()) {
            long metricsCount = metrics.stream()
                    .filter(m -> doc.getId().equals(m.getDocumentId()))
                    .map(DocumentMetric::getNormalizedMetric)
                    .distinct()
                    .count();
            nodes.add(KnowledgeGraphDto.Node.builder()
                    .id("doc_" + doc.getId())
                    .type("document")
                    .name(doc.getOriginalFilename())
                    .fileType(doc.getFileType().name())
                    .status(doc.getStatus().name())
                    .metricsCount((int) metricsCount)
                    .build());
        }

        // Add metric nodes and edges
        for (Map.Entry<String, List<DocumentMetric>> entry : metricGroups.entrySet()) {
            String normalizedMetric = entry.getKey();
            List<DocumentMetric> group = entry.getValue();

            List<KnowledgeGraphDto.MetricOccurrence> occurrences = group.stream()
                    .map(m -> {
                        Document doc = docMap.get(m.getDocumentId());
                        return KnowledgeGraphDto.MetricOccurrence.builder()
                                .documentId(m.getDocumentId())
                                .documentName(doc != null ? doc.getOriginalFilename() : null)
                                .value(m.getValue())
                                .numericValue(m.getNumericValue())
                                .unit(m.getUnit())
                                .period(m.getPeriod())
                                .pageNumber(m.getPageNumber())
                                .build();
                    })
                    .toList();

            KnowledgeGraphDto.MetricChange change = computeChange(occurrences);

            // Filter by changeDirection if specified
            if (changeDirection != null && change != null && !changeDirection.equals(change.getDirection())) {
                continue;
            }
            if (changeDirection != null && change == null) {
                continue; // Skip metrics without change data when filtering
            }

            nodes.add(KnowledgeGraphDto.Node.builder()
                    .id("metric_" + normalizedMetric)
                    .type("metric")
                    .name(group.get(0).getMetricName())
                    .occurrences(occurrences)
                    .change(change)
                    .build());

            // Create edges from documents to this metric
            for (DocumentMetric m : group) {
                edges.add(KnowledgeGraphDto.Edge.builder()
                        .id("edge_" + m.getId())
                        .source("doc_" + m.getDocumentId())
                        .target("metric_" + normalizedMetric)
                        .period(m.getPeriod())
                        .value(m.getValue())
                        .build());
            }
        }

        if (nodes.size() > MAX_NODES) {
            nodes = nodes.subList(0, MAX_NODES);
        }
        if (edges.size() > MAX_EDGES) {
            edges = edges.subList(0, MAX_EDGES);
        }

        long crossDocMetrics = metricGroups.values().stream()
                .filter(group -> group.stream()
                        .map(DocumentMetric::getDocumentId)
                        .distinct()
                        .count() > 1)
                .count();

        return KnowledgeGraphDto.GraphResponse.builder()
                .nodes(nodes)
                .edges(edges)
                .stats(KnowledgeGraphDto.Stats.builder()
                        .totalDocuments(docMap.size())
                        .totalMetrics(metricGroups.size())
                        .totalEdges(edges.size())
                        .crossDocumentMetrics(crossDocMetrics)
                        .build())
                .build();
    }

    @Transactional(readOnly = true)
    public KnowledgeGraphDto.MetricDetailResponse getMetricDetail(String normalizedMetric, UUID workspaceId) {
        List<DocumentMetric> metrics = metricRepository.searchByNormalizedMetric(workspaceId, normalizedMetric);
        if (metrics.isEmpty()) {
            throw BusinessException.notFound("Metric", normalizedMetric);
        }

        Set<UUID> docIds = metrics.stream()
                .map(DocumentMetric::getDocumentId)
                .collect(Collectors.toSet());
        Map<UUID, Document> docMap = documentRepository.findAllById(docIds).stream()
                .collect(Collectors.toMap(Document::getId, d -> d));

        List<KnowledgeGraphDto.MetricOccurrence> occurrences = metrics.stream()
                .map(m -> {
                    Document doc = docMap.get(m.getDocumentId());
                    return KnowledgeGraphDto.MetricOccurrence.builder()
                            .documentId(m.getDocumentId())
                            .documentName(doc != null ? doc.getOriginalFilename() : null)
                            .value(m.getValue())
                            .numericValue(m.getNumericValue())
                            .unit(m.getUnit())
                            .period(m.getPeriod())
                            .pageNumber(m.getPageNumber())
                            .build();
                })
                .toList();

        return KnowledgeGraphDto.MetricDetailResponse.builder()
                .metricName(metrics.get(0).getMetricName())
                .occurrences(occurrences)
                .change(computeChange(occurrences))
                .build();
    }

    @Transactional(readOnly = true)
    public KnowledgeGraphDto.SearchResponse searchMetrics(UUID workspaceId, String query) {
        List<DocumentMetric> metrics = metricRepository.searchByNormalizedMetric(workspaceId, query);

        Set<UUID> docIds = metrics.stream()
                .map(DocumentMetric::getDocumentId)
                .collect(Collectors.toSet());
        Map<UUID, Document> docMap = documentRepository.findAllById(docIds).stream()
                .collect(Collectors.toMap(Document::getId, d -> d));

        // Group by normalizedMetric to return metric nodes
        Map<String, List<DocumentMetric>> metricGroups = metrics.stream()
                .collect(Collectors.groupingBy(DocumentMetric::getNormalizedMetric));

        List<KnowledgeGraphDto.Node> results = new ArrayList<>();
        for (Map.Entry<String, List<DocumentMetric>> entry : metricGroups.entrySet()) {
            String normalizedMetric = entry.getKey();
            List<DocumentMetric> group = entry.getValue();

            List<KnowledgeGraphDto.MetricOccurrence> occurrences = group.stream()
                    .map(m -> {
                        Document doc = docMap.get(m.getDocumentId());
                        return KnowledgeGraphDto.MetricOccurrence.builder()
                                .documentId(m.getDocumentId())
                                .documentName(doc != null ? doc.getOriginalFilename() : null)
                                .value(m.getValue())
                                .numericValue(m.getNumericValue())
                                .unit(m.getUnit())
                                .period(m.getPeriod())
                                .pageNumber(m.getPageNumber())
                                .build();
                    })
                    .toList();

            results.add(KnowledgeGraphDto.Node.builder()
                    .id("metric_" + normalizedMetric)
                    .type("metric")
                    .name(group.get(0).getMetricName())
                    .occurrences(occurrences)
                    .change(computeChange(occurrences))
                    .build());
        }

        return KnowledgeGraphDto.SearchResponse.builder()
                .results(results)
                .build();
    }

    public KnowledgeGraphDto.RebuildResponse rebuild(UUID workspaceId) {
        if (!rebuildingWorkspaces.add(workspaceId)) {
            throw BusinessException.conflict("이미 재구축이 진행 중입니다");
        }

        List<Document> indexed = documentRepository.findByWorkspaceIdAndStatus(workspaceId, DocumentStatus.INDEXED);
        if (indexed.isEmpty()) {
            rebuildingWorkspaces.remove(workspaceId);
            throw BusinessException.badRequest("추출할 문서가 없습니다");
        }

        for (Document doc : indexed) {
            asyncExecutor.extractMetrics(doc.getId(), workspaceId);
        }

        rebuildingWorkspaces.remove(workspaceId);

        return KnowledgeGraphDto.RebuildResponse.builder()
                .status("PROCESSING")
                .message("총 " + indexed.size() + "개 문서에서 지표 추출을 시작합니다")
                .build();
    }

    @Transactional(readOnly = true)
    public KnowledgeGraphDto.StatsResponse getStats(UUID workspaceId) {
        List<DocumentMetric> allMetrics = metricRepository.findByWorkspaceId(workspaceId);

        Map<String, List<DocumentMetric>> metricGroups = allMetrics.stream()
                .collect(Collectors.groupingBy(DocumentMetric::getNormalizedMetric));

        long crossDocMetrics = metricGroups.values().stream()
                .filter(group -> group.stream()
                        .map(DocumentMetric::getDocumentId)
                        .distinct()
                        .count() > 1)
                .count();

        Set<UUID> docIds = allMetrics.stream()
                .map(DocumentMetric::getDocumentId)
                .collect(Collectors.toSet());

        return KnowledgeGraphDto.StatsResponse.builder()
                .totalDocuments(docIds.size())
                .totalMetrics(metricGroups.size())
                .crossDocumentMetrics(crossDocMetrics)
                .build();
    }

    private KnowledgeGraphDto.MetricChange computeChange(List<KnowledgeGraphDto.MetricOccurrence> occurrences) {
        List<KnowledgeGraphDto.MetricOccurrence> withNumeric = occurrences.stream()
                .filter(o -> o.getNumericValue() != null)
                .toList();

        if (withNumeric.size() < 2) return null;

        List<KnowledgeGraphDto.MetricOccurrence> sorted = new ArrayList<>(withNumeric);
        sorted.sort(Comparator.comparing(
                o -> o.getPeriod() != null ? o.getPeriod() : "",
                Comparator.naturalOrder()));

        BigDecimal from = sorted.get(0).getNumericValue();
        BigDecimal to = sorted.get(sorted.size() - 1).getNumericValue();

        BigDecimal changePercent = null;
        if (from.compareTo(BigDecimal.ZERO) != 0) {
            changePercent = to.subtract(from)
                    .divide(from.abs(), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .setScale(1, RoundingMode.HALF_UP);
        }

        int cmp = to.compareTo(from);
        String direction = cmp > 0 ? "increase" : cmp < 0 ? "decrease" : "unchanged";

        return KnowledgeGraphDto.MetricChange.builder()
                .from(from)
                .to(to)
                .changePercent(changePercent)
                .direction(direction)
                .build();
    }
}
