package com.intellidocs.domain.knowledgegraph.tool;

import com.intellidocs.common.WorkspaceContext;
import com.intellidocs.domain.knowledgegraph.entity.DocumentMetric;
import com.intellidocs.domain.knowledgegraph.repository.DocumentMetricRepository;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.repository.DocumentRepository;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class KnowledgeGraphTools {

    private final DocumentMetricRepository metricRepository;
    private final DocumentRepository documentRepository;

    @Tool("워크스페이스의 Knowledge Graph에서 지표별 문서 간 비교를 탐색한다. " +
          "'매출액이 어떻게 변했나?', '두 문서의 영업이익 차이는?' 같은 질문에 사용")
    public String exploreMetrics(
            @P("탐색할 지표명 또는 키워드") String query) {

        UUID workspaceId = WorkspaceContext.getCurrentWorkspaceId();
        if (workspaceId == null) {
            return "워크스페이스 컨텍스트가 없습니다.";
        }

        List<DocumentMetric> matched = metricRepository.searchByNormalizedMetric(workspaceId, query);
        if (matched.isEmpty()) {
            return "\"" + query + "\"와 관련된 지표를 찾을 수 없습니다.";
        }

        // Group by normalized metric
        Map<String, List<DocumentMetric>> metricGroups = matched.stream()
                .collect(Collectors.groupingBy(DocumentMetric::getNormalizedMetric));

        // Load documents
        Set<UUID> docIds = matched.stream()
                .map(DocumentMetric::getDocumentId)
                .collect(Collectors.toSet());
        Map<UUID, Document> docMap = documentRepository.findAllById(docIds).stream()
                .collect(Collectors.toMap(Document::getId, d -> d));

        StringBuilder sb = new StringBuilder();
        sb.append("## \"").append(query).append("\" 관련 지표 비교\n\n");

        for (Map.Entry<String, List<DocumentMetric>> entry : metricGroups.entrySet()) {
            String metricName = entry.getKey();
            List<DocumentMetric> group = entry.getValue();

            sb.append("### ").append(metricName).append("\n");
            sb.append("| 문서 | 기간 | 값 |\n");
            sb.append("|------|------|----|\n");

            for (DocumentMetric m : group) {
                Document doc = docMap.get(m.getDocumentId());
                String docName = doc != null ? doc.getOriginalFilename() : "?";
                String period = m.getPeriod() != null ? m.getPeriod() : "-";
                String value = m.getValue() != null ? m.getValue() : "-";
                sb.append("| ").append(docName)
                  .append(" | ").append(period)
                  .append(" | ").append(value)
                  .append(" |\n");
            }

            // Change calculation
            if (group.size() >= 2) {
                List<DocumentMetric> withNumeric = group.stream()
                        .filter(m -> m.getNumericValue() != null)
                        .sorted(Comparator.comparing(m -> m.getPeriod() != null ? m.getPeriod() : ""))
                        .toList();
                if (withNumeric.size() >= 2) {
                    var first = withNumeric.get(0);
                    var last = withNumeric.get(withNumeric.size() - 1);
                    var diff = last.getNumericValue().subtract(first.getNumericValue());
                    sb.append("\n변동: ").append(first.getValue()).append(" → ").append(last.getValue());
                    sb.append(" (").append(diff.signum() > 0 ? "+" : "").append(diff).append(")\n");
                }
            }
            sb.append("\n");
        }

        log.info("[KG Tool] exploreMetrics query='{}' results={}", query, matched.size());
        return sb.toString();
    }
}
