package com.intellidocs.domain.diff.service;

import com.intellidocs.common.WorkspaceContext;
import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.diff.dto.DiffDto;
import com.intellidocs.domain.diff.entity.DiffResultData;
import com.intellidocs.domain.diff.entity.DiffStatus;
import com.intellidocs.domain.diff.entity.DiffType;
import com.intellidocs.domain.diff.entity.DocumentVersionDiff;
import com.intellidocs.domain.diff.repository.DiffRepository;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.workspace.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DiffService {

    private final DiffRepository diffRepository;
    private final DocumentRepository documentRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final DocumentDiffEngine diffEngine;
    private final DiffSseEmitterService sseEmitterService;

    @Transactional
    public DiffDto.DiffResponse createManualDiff(DiffDto.DiffRequest request, UUID userId) {
        UUID sourceId = request.getSourceDocumentId();
        UUID targetId = request.getTargetDocumentId();

        // 같은 문서 방지
        if (sourceId.equals(targetId)) {
            throw BusinessException.badRequest("같은 문서끼리는 비교할 수 없습니다");
        }

        // 문서 존재 + INDEXED 확인
        Document source = documentRepository.findById(sourceId)
                .orElseThrow(() -> BusinessException.notFound("Document", sourceId));
        Document target = documentRepository.findById(targetId)
                .orElseThrow(() -> BusinessException.notFound("Document", targetId));

        if (source.getStatus() != DocumentStatus.INDEXED) {
            throw BusinessException.conflict("소스 문서의 처리가 완료되지 않았습니다");
        }
        if (target.getStatus() != DocumentStatus.INDEXED) {
            throw BusinessException.conflict("대상 문서의 처리가 완료되지 않았습니다");
        }

        // 워크스페이스 접근 확인
        UUID workspaceId = source.getWorkspaceId();
        if (workspaceId != null) {
            if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
                throw BusinessException.forbidden("해당 워크스페이스에 접근 권한이 없습니다");
            }
        }

        // 이미 존재하는 diff 확인
        Optional<DocumentVersionDiff> existing = diffRepository.findBySourceDocumentIdAndTargetDocumentId(sourceId, targetId);
        if (existing.isPresent()) {
            DocumentVersionDiff existingDiff = existing.get();
            // 진행 중이면 기존 결과 반환
            if (existingDiff.getStatus() == DiffStatus.COMPARING || existingDiff.getStatus() == DiffStatus.PENDING) {
                return DiffDto.DiffResponse.builder()
                        .diffId(existingDiff.getId())
                        .status(existingDiff.getStatus().name())
                        .build();
            }
            // COMPLETED 또는 FAILED → 삭제 후 재실행
            log.info("[DiffService] Deleting existing diff {} (status={}) for re-run", existingDiff.getId(), existingDiff.getStatus());
            diffRepository.delete(existingDiff);
            diffRepository.flush();
        }

        // 새 diff 생성
        DocumentVersionDiff diff = DocumentVersionDiff.builder()
                .sourceDocumentId(sourceId)
                .targetDocumentId(targetId)
                .workspaceId(workspaceId)
                .diffType(DiffType.MANUAL)
                .build();
        diffRepository.save(diff);

        return DiffDto.DiffResponse.builder()
                .diffId(diff.getId())
                .status(diff.getStatus().name())
                .build();
    }

    public void executeDiff(UUID diffId) {
        DocumentVersionDiff diff = diffRepository.findById(diffId)
                .orElseThrow(() -> BusinessException.notFound("DocumentVersionDiff", diffId));

        try {
            diff.startComparing();
            diffRepository.save(diff);
            sendProgress(diffId, DiffStatus.COMPARING, "비교 시작", 10);

            Document source = documentRepository.findById(diff.getSourceDocumentId())
                    .orElseThrow(() -> BusinessException.notFound("Document", diff.getSourceDocumentId()));
            Document target = documentRepository.findById(diff.getTargetDocumentId())
                    .orElseThrow(() -> BusinessException.notFound("Document", diff.getTargetDocumentId()));

            log.info("[DiffService] executeDiff: diffId={}, sourceId={} ({}), targetId={} ({})",
                    diffId, source.getId(), source.getOriginalFilename(),
                    target.getId(), target.getOriginalFilename());

            sendProgress(diffId, DiffStatus.COMPARING, "수치 비교 중...", 40);
            sendProgress(diffId, DiffStatus.COMPARING, "텍스트 비교 중...", 70);

            DiffResultData resultData = diffEngine.buildFullResult(source, target);

            sendProgress(diffId, DiffStatus.COMPARING, "요약 생성 중...", 90);

            diff.complete(resultData);
            diffRepository.save(diff);

            sendProgress(diffId, DiffStatus.COMPLETED, "비교 완료", 100);

        } catch (Exception e) {
            log.error("Diff execution failed for diffId: {}", diffId, e);
            diff.fail(e.getMessage());
            diffRepository.save(diff);
            sendProgress(diffId, DiffStatus.FAILED, "비교 중 오류 발생: " + e.getMessage(), 0);
        } finally {
            sseEmitterService.complete(diffId);
        }
    }

    @Transactional(readOnly = true)
    public DiffDto.DiffDetailResponse getDiffResult(UUID diffId, UUID userId) {
        DocumentVersionDiff diff = diffRepository.findById(diffId)
                .orElseThrow(() -> BusinessException.notFound("DocumentVersionDiff", diffId));

        // 워크스페이스 접근 확인
        if (diff.getWorkspaceId() != null) {
            if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(diff.getWorkspaceId(), userId)) {
                throw BusinessException.forbidden("해당 워크스페이스에 접근 권한이 없습니다");
            }
        }

        return DiffDto.DiffDetailResponse.from(diff);
    }

    private void sendProgress(UUID diffId, DiffStatus status, String message, int progress) {
        sseEmitterService.send(diffId, DiffDto.StatusEvent.builder()
                .diffId(diffId)
                .status(status.name())
                .message(message)
                .progress(progress)
                .build());
    }
}
