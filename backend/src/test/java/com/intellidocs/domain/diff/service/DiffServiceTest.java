package com.intellidocs.domain.diff.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.diff.dto.DiffDto;
import com.intellidocs.domain.diff.entity.DiffResultData;
import com.intellidocs.domain.diff.entity.DiffStatus;
import com.intellidocs.domain.diff.entity.DocumentVersionDiff;
import com.intellidocs.domain.diff.repository.DiffRepository;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.entity.FileType;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.workspace.repository.WorkspaceMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DiffServiceTest {

    @Mock private DiffRepository diffRepository;
    @Mock private DocumentRepository documentRepository;
    @Mock private WorkspaceMemberRepository workspaceMemberRepository;
    @Mock private DocumentDiffEngine diffEngine;
    @Mock private DiffSseEmitterService sseEmitterService;

    private DiffService service;

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID WORKSPACE_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new DiffService(diffRepository, documentRepository,
                workspaceMemberRepository, diffEngine, sseEmitterService);
    }

    private Document buildDocument(UUID id) {
        return Document.builder()
                .id(id)
                .userId(USER_ID)
                .workspaceId(WORKSPACE_ID)
                .filename("test.pdf")
                .originalFilename("test.pdf")
                .fileType(FileType.PDF)
                .fileSize(1000L)
                .storagePath("/tmp/test.pdf")
                .status(DocumentStatus.INDEXED)
                .build();
    }

    @Test
    void createManualDiff_sameDocument_throws400() {
        UUID docId = UUID.randomUUID();
        DiffDto.DiffRequest request = new DiffDto.DiffRequest();
        request.setSourceDocumentId(docId);
        request.setTargetDocumentId(docId);

        assertThatThrownBy(() -> service.createManualDiff(request, USER_ID))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("같은 문서");
    }

    @Test
    void createManualDiff_success() {
        UUID srcId = UUID.randomUUID();
        UUID tgtId = UUID.randomUUID();

        when(documentRepository.findById(srcId)).thenReturn(Optional.of(buildDocument(srcId)));
        when(documentRepository.findById(tgtId)).thenReturn(Optional.of(buildDocument(tgtId)));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(WORKSPACE_ID, USER_ID)).thenReturn(true);
        when(diffRepository.findBySourceDocumentIdAndTargetDocumentId(srcId, tgtId)).thenReturn(Optional.empty());
        when(diffRepository.save(any(DocumentVersionDiff.class))).thenAnswer(inv -> {
            DocumentVersionDiff d = inv.getArgument(0);
            return d;
        });

        DiffDto.DiffRequest request = new DiffDto.DiffRequest();
        request.setSourceDocumentId(srcId);
        request.setTargetDocumentId(tgtId);

        DiffDto.DiffResponse response = service.createManualDiff(request, USER_ID);

        assertThat(response.getStatus()).isEqualTo("PENDING");
        verify(diffRepository).save(any(DocumentVersionDiff.class));
    }

    @Test
    void createManualDiff_alreadyExists_returnsExisting() {
        UUID srcId = UUID.randomUUID();
        UUID tgtId = UUID.randomUUID();
        UUID diffId = UUID.randomUUID();

        DocumentVersionDiff existingDiff = DocumentVersionDiff.builder()
                .id(diffId)
                .sourceDocumentId(srcId)
                .targetDocumentId(tgtId)
                .status(DiffStatus.COMPLETED)
                .build();

        when(documentRepository.findById(srcId)).thenReturn(Optional.of(buildDocument(srcId)));
        when(documentRepository.findById(tgtId)).thenReturn(Optional.of(buildDocument(tgtId)));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(WORKSPACE_ID, USER_ID)).thenReturn(true);
        when(diffRepository.findBySourceDocumentIdAndTargetDocumentId(srcId, tgtId)).thenReturn(Optional.of(existingDiff));

        DiffDto.DiffRequest request = new DiffDto.DiffRequest();
        request.setSourceDocumentId(srcId);
        request.setTargetDocumentId(tgtId);

        DiffDto.DiffResponse response = service.createManualDiff(request, USER_ID);

        assertThat(response.getDiffId()).isEqualTo(diffId);
        assertThat(response.getStatus()).isEqualTo("COMPLETED");
        verify(diffRepository, never()).save(any());
    }

    @Test
    void executeDiff_success_completesWithResultData() {
        UUID diffId = UUID.randomUUID();
        UUID srcId = UUID.randomUUID();
        UUID tgtId = UUID.randomUUID();

        DocumentVersionDiff diff = DocumentVersionDiff.builder()
                .id(diffId)
                .sourceDocumentId(srcId)
                .targetDocumentId(tgtId)
                .build();

        Document src = buildDocument(srcId);
        Document tgt = buildDocument(tgtId);

        DiffResultData resultData = DiffResultData.builder()
                .summary(DiffResultData.DiffSummary.builder()
                        .totalChanges(2)
                        .added(1)
                        .removed(0)
                        .modified(1)
                        .unchanged(0)
                        .build())
                .numericChanges(List.of())
                .textChanges(List.of())
                .build();

        when(diffRepository.findById(diffId)).thenReturn(Optional.of(diff));
        when(documentRepository.findById(srcId)).thenReturn(Optional.of(src));
        when(documentRepository.findById(tgtId)).thenReturn(Optional.of(tgt));
        when(diffEngine.buildFullResult(src, tgt)).thenReturn(resultData);
        when(diffRepository.save(any(DocumentVersionDiff.class))).thenAnswer(inv -> inv.getArgument(0));

        service.executeDiff(diffId);

        ArgumentCaptor<DocumentVersionDiff> captor = ArgumentCaptor.forClass(DocumentVersionDiff.class);
        verify(diffRepository, atLeast(2)).save(captor.capture());

        // Last save should have COMPLETED status
        DocumentVersionDiff lastSaved = captor.getAllValues().get(captor.getAllValues().size() - 1);
        assertThat(lastSaved.getStatus()).isEqualTo(DiffStatus.COMPLETED);
        assertThat(lastSaved.getResultData()).isNotNull();

        verify(sseEmitterService).complete(diffId);
    }
}
