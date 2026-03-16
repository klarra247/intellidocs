package com.intellidocs.domain.document.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.diff.entity.DiffStatus;
import com.intellidocs.domain.diff.entity.DocumentVersionDiff;
import com.intellidocs.domain.diff.repository.DiffRepository;
import com.intellidocs.domain.document.dto.DocumentDto;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.entity.FileType;
import com.intellidocs.domain.document.repository.DocumentCommentRepository;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.workspace.repository.WorkspaceMemberRepository;
import com.intellidocs.infrastructure.elasticsearch.ElasticsearchIndexService;
import com.intellidocs.infrastructure.parsing.ParsingServiceClient;
import com.intellidocs.infrastructure.qdrant.QdrantIndexService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.cache.CacheManager;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentServiceVersionTest {

    @Mock private DocumentRepository documentRepository;
    @Mock private DocumentCommentRepository documentCommentRepository;
    @Mock private RabbitTemplate rabbitTemplate;
    @Mock private DocumentSseEmitterService sseEmitterService;
    @Mock private QdrantIndexService qdrantIndexService;
    @Mock private ElasticsearchIndexService esIndexService;
    @Mock private CacheManager cacheManager;
    @Mock private ParsingServiceClient parsingServiceClient;
    @Mock private WorkspaceMemberRepository workspaceMemberRepository;
    @Mock private DiffRepository diffRepository;
    @Mock private MultipartFile mockFile;

    @TempDir
    Path tempDir;

    private DocumentService service;

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID WORKSPACE_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new DocumentService(
                documentRepository, documentCommentRepository, rabbitTemplate, sseEmitterService,
                qdrantIndexService, esIndexService, cacheManager,
                parsingServiceClient, workspaceMemberRepository, diffRepository
        );
        ReflectionTestUtils.setField(service, "uploadDir", tempDir.toString());
    }

    private Document buildIndexedDocument(UUID id, UUID versionGroupId, int versionNumber) {
        Document doc = Document.builder()
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
        if (versionGroupId != null) {
            doc.setVersionInfo(versionGroupId, versionNumber, null);
        }
        return doc;
    }

    @Test
    void uploadVersion_parentNotFound_throws404() {
        UUID parentId = UUID.randomUUID();
        when(documentRepository.findById(parentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.uploadVersion(parentId, mockFile, USER_ID))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not found");
    }

    @Test
    void uploadVersion_parentNotIndexed_throws409() {
        UUID parentId = UUID.randomUUID();
        Document parent = Document.builder()
                .id(parentId)
                .userId(USER_ID)
                .workspaceId(WORKSPACE_ID)
                .filename("test.pdf")
                .originalFilename("test.pdf")
                .fileType(FileType.PDF)
                .fileSize(1000L)
                .storagePath("/tmp/test.pdf")
                .status(DocumentStatus.PARSING)
                .build();
        when(documentRepository.findById(parentId)).thenReturn(Optional.of(parent));

        assertThatThrownBy(() -> service.uploadVersion(parentId, mockFile, USER_ID))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("처리가 완료되지 않았습니다");
    }

    @Test
    void uploadVersion_incrementsVersionNumber() {
        UUID parentId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        Document parent = buildIndexedDocument(parentId, groupId, 1);

        when(documentRepository.findById(parentId)).thenReturn(Optional.of(parent));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(WORKSPACE_ID, USER_ID)).thenReturn(true);
        when(documentRepository.findMaxVersionNumber(groupId)).thenReturn(Optional.of(2));
        when(mockFile.getOriginalFilename()).thenReturn("test_v3.pdf");
        when(mockFile.getSize()).thenReturn(2000L);
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> {
            Document d = inv.getArgument(0);
            return d;
        });

        DocumentDto.VersionUploadResponse response = service.uploadVersion(parentId, mockFile, USER_ID);

        assertThat(response.getVersionNumber()).isEqualTo(3);
        assertThat(response.getParentVersionId()).isEqualTo(parentId);
        assertThat(response.getVersionGroupId()).isEqualTo(groupId);
    }

    @Test
    void uploadVersion_lazyInitVersionGroup() {
        UUID parentId = UUID.randomUUID();
        Document parent = buildIndexedDocument(parentId, null, 1);

        when(documentRepository.findById(parentId)).thenReturn(Optional.of(parent));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(WORKSPACE_ID, USER_ID)).thenReturn(true);
        when(documentRepository.findMaxVersionNumber(parentId)).thenReturn(Optional.of(1));
        when(mockFile.getOriginalFilename()).thenReturn("test_v2.pdf");
        when(mockFile.getSize()).thenReturn(2000L);
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));

        DocumentDto.VersionUploadResponse response = service.uploadVersion(parentId, mockFile, USER_ID);

        assertThat(response.getVersionNumber()).isEqualTo(2);
        assertThat(response.getVersionGroupId()).isEqualTo(parentId);
    }

    @Test
    void getVersionHistory_singleVersion_returnsOne() {
        UUID docId = UUID.randomUUID();
        Document doc = buildIndexedDocument(docId, null, 1);

        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));

        List<DocumentDto.VersionInfo> history = service.getVersionHistory(docId, USER_ID);

        assertThat(history).hasSize(1);
        assertThat(history.get(0).getVersionNumber()).isEqualTo(1);
    }

    @Test
    void getVersionHistory_multipleVersions_returnsDiffStatus() {
        UUID groupId = UUID.randomUUID();
        UUID docId1 = UUID.randomUUID();
        UUID docId2 = UUID.randomUUID();

        Document doc1 = buildIndexedDocument(docId1, groupId, 1);
        Document doc2 = buildIndexedDocument(docId2, groupId, 2);

        DocumentVersionDiff diff = DocumentVersionDiff.builder()
                .id(UUID.randomUUID())
                .sourceDocumentId(docId1)
                .targetDocumentId(docId2)
                .status(DiffStatus.COMPLETED)
                .build();

        when(documentRepository.findById(docId2)).thenReturn(Optional.of(doc2));
        when(documentRepository.findByVersionGroupIdOrderByVersionNumberDesc(groupId))
                .thenReturn(List.of(doc2, doc1));
        when(diffRepository.findBySourceDocumentIdInOrTargetDocumentIdIn(any(), any()))
                .thenReturn(List.of(diff));

        List<DocumentDto.VersionInfo> history = service.getVersionHistory(docId2, USER_ID);

        assertThat(history).hasSize(2);
        assertThat(history.get(0).getDiffStatus()).isEqualTo("COMPLETED");
    }
}
