package com.intellidocs.domain.knowledgegraph.controller;

import com.intellidocs.common.WorkspaceContext;
import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.knowledgegraph.dto.KnowledgeGraphDto;
import com.intellidocs.domain.knowledgegraph.service.KnowledgeGraphService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/knowledge-graph")
@RequiredArgsConstructor
public class KnowledgeGraphController {

    private final KnowledgeGraphService knowledgeGraphService;

    @GetMapping
    public ResponseEntity<ApiResponse<KnowledgeGraphDto.GraphResponse>> getGraph(
            @RequestParam(required = false) List<String> entityTypes,
            @RequestParam(required = false) List<UUID> documentIds) {
        UUID workspaceId = WorkspaceContext.getCurrentWorkspaceId();
        return ResponseEntity.ok(ApiResponse.ok(
                knowledgeGraphService.getGraph(workspaceId, entityTypes, documentIds)));
    }

    @GetMapping("/entities/{entityId}")
    public ResponseEntity<ApiResponse<KnowledgeGraphDto.EntityDetailResponse>> getEntityDetail(
            @PathVariable UUID entityId) {
        UUID workspaceId = WorkspaceContext.getCurrentWorkspaceId();
        return ResponseEntity.ok(ApiResponse.ok(
                knowledgeGraphService.getEntityDetail(entityId, workspaceId)));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<KnowledgeGraphDto.SearchResponse>> search(
            @RequestParam String q) {
        UUID workspaceId = WorkspaceContext.getCurrentWorkspaceId();
        return ResponseEntity.ok(ApiResponse.ok(
                knowledgeGraphService.searchEntities(workspaceId, q)));
    }

    @PostMapping("/rebuild")
    public ResponseEntity<ApiResponse<KnowledgeGraphDto.RebuildResponse>> rebuild() {
        UUID workspaceId = WorkspaceContext.getCurrentWorkspaceId();
        return ResponseEntity.accepted().body(ApiResponse.ok(
                knowledgeGraphService.rebuild(workspaceId)));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<KnowledgeGraphDto.StatsResponse>> getStats() {
        UUID workspaceId = WorkspaceContext.getCurrentWorkspaceId();
        return ResponseEntity.ok(ApiResponse.ok(
                knowledgeGraphService.getStats(workspaceId)));
    }
}
