package com.intellidocs.domain.document.service;

import com.intellidocs.common.WorkspaceContext;
import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.config.RabbitMQConfig;
import com.intellidocs.domain.diff.entity.DocumentVersionDiff;
import com.intellidocs.domain.diff.repository.DiffRepository;
import com.intellidocs.domain.document.dto.DocumentDto;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.entity.FileType;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.workspace.repository.WorkspaceMemberRepository;
import com.intellidocs.infrastructure.elasticsearch.ElasticsearchIndexService;
import com.intellidocs.infrastructure.parsing.ParsingServiceClient;
import com.intellidocs.infrastructure.qdrant.QdrantIndexService;
import com.intellidocs.infrastructure.rabbitmq.ParsingMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final RabbitTemplate rabbitTemplate;
    private final DocumentSseEmitterService sseEmitterService;
    private final QdrantIndexService qdrantIndexService;
    private final ElasticsearchIndexService esIndexService;
    private final CacheManager cacheManager;
    private final ParsingServiceClient parsingServiceClient;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final DiffRepository diffRepository;

    @Value("${app.storage.upload-dir}")
    private String uploadDir;

    /**
     * 문서 업로드 → 저장 → 파싱 큐 발행
     */
    @Transactional
    public DocumentDto.UploadResponse upload(MultipartFile file, UUID userId) {
        // 1. 파일 유효성 검사
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !FileType.isSupported(originalFilename)) {
            throw BusinessException.unsupportedFileType(originalFilename);
        }

        FileType fileType = FileType.fromFilename(originalFilename);

        // 2. 파일 저장
        String storedFilename = UUID.randomUUID() + "." + fileType.getExtension();
        Path storagePath = saveFile(file, storedFilename);

        // 3. DB 저장
        Document document = Document.builder()
                .userId(userId)
                .workspaceId(WorkspaceContext.getCurrentWorkspaceId())
                .filename(storedFilename)
                .originalFilename(originalFilename)
                .fileType(fileType)
                .fileSize(file.getSize())
                .storagePath(storagePath.toString())
                .build();

        document = documentRepository.save(document);
        log.info("Document saved: id={}, filename={}", document.getId(), originalFilename);

        // 4. SSE로 업로드 완료 알림
        sseEmitterService.send(document.getId(),
                DocumentDto.StatusEvent.builder()
                        .documentId(document.getId())
                        .status(document.getStatus())
                        .message("파일 업로드 완료. 파싱을 시작합니다.")
                        .progress(10)
                        .build());

        // 5. 파싱 작업 큐 발행
        document.startParsing();
        documentRepository.save(document);

        ParsingMessage.ParseRequest parseRequest = ParsingMessage.ParseRequest.builder()
                .documentId(document.getId())
                .filename(originalFilename)
                .fileType(fileType.name())
                .storagePath(storagePath.toString())
                .build();

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.PARSE_ROUTING_KEY,
                parseRequest
        );
        evictSearchCache();
        log.info("Parse request published for document: {}", document.getId());

        return DocumentDto.UploadResponse.builder()
                .documentId(document.getId())
                .filename(originalFilename)
                .fileType(fileType)
                .status(document.getStatus())
                .build();
    }

    @Transactional(readOnly = true)
    public List<DocumentDto.ListResponse> getDocuments(UUID userId) {
        UUID workspaceId = WorkspaceContext.getCurrentWorkspaceId();
        if (workspaceId != null) {
            return documentRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).stream()
                    .map(DocumentDto.ListResponse::from)
                    .collect(Collectors.toList());
        }
        return documentRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(DocumentDto.ListResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DocumentDto.PageResponse getDocumentsPaged(UUID userId, Pageable pageable) {
        UUID workspaceId = WorkspaceContext.getCurrentWorkspaceId();
        if (workspaceId != null) {
            Page<Document> page = documentRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId, pageable);
            return DocumentDto.PageResponse.builder()
                    .content(page.getContent().stream().map(DocumentDto.ListResponse::from).toList())
                    .currentPage(page.getNumber())
                    .totalPages(page.getTotalPages())
                    .totalElements(page.getTotalElements())
                    .build();
        }
        // fallback: 워크스페이스 미설정 시 전체 반환
        List<DocumentDto.ListResponse> all = documentRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(DocumentDto.ListResponse::from).toList();
        return DocumentDto.PageResponse.builder()
                .content(all)
                .currentPage(0)
                .totalPages(1)
                .totalElements(all.size())
                .build();
    }

    @Transactional(readOnly = true)
    public DocumentDto.DetailResponse getDocument(UUID documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> BusinessException.notFound("Document", documentId));
        return DocumentDto.DetailResponse.from(document);
    }

    @Transactional
    public void deleteDocument(UUID documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> BusinessException.notFound("Document", documentId));

        // 파일 삭제
        try {
            Files.deleteIfExists(Paths.get(document.getStoragePath()));
        } catch (IOException e) {
            log.warn("Failed to delete file: {}", document.getStoragePath(), e);
        }

        qdrantIndexService.deleteByDocumentId(documentId);
        esIndexService.deleteByDocumentId(documentId);
        documentRepository.delete(document);
        evictSearchCache();
        log.info("Document deleted: {}", documentId);
    }

    /**
     * 문서 버전 업로드 — 기존 문서의 새 버전을 생성
     */
    @Transactional
    public DocumentDto.VersionUploadResponse uploadVersion(UUID parentDocumentId, MultipartFile file, UUID userId) {
        // 1. 부모 문서 존재 확인
        Document parent = documentRepository.findById(parentDocumentId)
                .orElseThrow(() -> BusinessException.notFound("Document", parentDocumentId));

        // 2. 부모 INDEXED 확인
        if (parent.getStatus() != DocumentStatus.INDEXED) {
            throw BusinessException.conflict("이전 버전 문서의 처리가 완료되지 않았습니다");
        }

        // 3. 워크스페이스 접근 확인
        if (parent.getWorkspaceId() != null) {
            if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(parent.getWorkspaceId(), userId)) {
                throw BusinessException.forbidden("해당 워크스페이스에 접근 권한이 없습니다");
            }
        }

        // 4. versionGroupId 결정 (lazy init)
        UUID versionGroupId = parent.getVersionGroupId();
        if (versionGroupId == null) {
            versionGroupId = parent.getId();
            parent.setVersionInfo(versionGroupId, 1, null);
            documentRepository.save(parent);
        }

        // 5. 다음 버전 번호
        int nextVersion = documentRepository.findMaxVersionNumber(versionGroupId).orElse(1) + 1;

        // 6. 파일 검증
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !FileType.isSupported(originalFilename)) {
            throw BusinessException.unsupportedFileType(originalFilename);
        }
        FileType fileType = FileType.fromFilename(originalFilename);

        // 7. 파일 저장
        String storedFilename = UUID.randomUUID() + "." + fileType.getExtension();
        Path storagePath = saveFile(file, storedFilename);

        // 8. DB 저장
        Document document = Document.builder()
                .userId(userId)
                .workspaceId(parent.getWorkspaceId())
                .filename(storedFilename)
                .originalFilename(originalFilename)
                .fileType(fileType)
                .fileSize(file.getSize())
                .storagePath(storagePath.toString())
                .build();
        document.setVersionInfo(versionGroupId, nextVersion, parentDocumentId);
        document = documentRepository.save(document);
        log.info("Version {} uploaded: id={}, parentId={}, groupId={}",
                nextVersion, document.getId(), parentDocumentId, versionGroupId);

        // 9. SSE + 파싱 큐 발행
        sseEmitterService.send(document.getId(),
                DocumentDto.StatusEvent.builder()
                        .documentId(document.getId())
                        .status(document.getStatus())
                        .message("파일 업로드 완료. 파싱을 시작합니다.")
                        .progress(10)
                        .build());

        document.startParsing();
        documentRepository.save(document);

        ParsingMessage.ParseRequest parseRequest = ParsingMessage.ParseRequest.builder()
                .documentId(document.getId())
                .filename(originalFilename)
                .fileType(fileType.name())
                .storagePath(storagePath.toString())
                .build();

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.PARSE_ROUTING_KEY,
                parseRequest
        );
        evictSearchCache();

        return DocumentDto.VersionUploadResponse.builder()
                .documentId(document.getId())
                .versionGroupId(versionGroupId)
                .versionNumber(nextVersion)
                .parentVersionId(parentDocumentId)
                .status(document.getStatus())
                .build();
    }

    /**
     * 문서 버전 히스토리 조회
     */
    @Transactional(readOnly = true)
    public List<DocumentDto.VersionInfo> getVersionHistory(UUID documentId, UUID userId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> BusinessException.notFound("Document", documentId));

        UUID versionGroupId = document.getVersionGroupId();
        if (versionGroupId == null) {
            // 단일 버전 — 자신만 반환
            return List.of(DocumentDto.VersionInfo.from(document, null));
        }

        List<Document> versions = documentRepository.findByVersionGroupIdOrderByVersionNumberDesc(versionGroupId);

        // 해당 그룹의 모든 문서 ID 수집
        List<UUID> docIds = versions.stream().map(Document::getId).toList();
        List<DocumentVersionDiff> diffs = diffRepository.findBySourceDocumentIdInOrTargetDocumentIdIn(docIds, docIds);

        return versions.stream().map(v -> {
            String diffStatus = diffs.stream()
                    .filter(d -> d.getTargetDocumentId().equals(v.getId()) || d.getSourceDocumentId().equals(v.getId()))
                    .findFirst()
                    .map(d -> d.getStatus().name())
                    .orElse(null);
            return DocumentDto.VersionInfo.from(v, diffStatus);
        }).toList();
    }

    // TODO: JWT 구현 시 소유자 검증 추가

    @Transactional(readOnly = true)
    public ResponseEntity<StreamingResponseBody> streamFile(UUID documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> BusinessException.notFound("Document", documentId));

        if (document.getStatus() != DocumentStatus.INDEXED) {
            throw BusinessException.documentNotReady(documentId);
        }

        Path filePath = Paths.get(document.getStoragePath());
        if (!Files.exists(filePath)) {
            throw BusinessException.fileMissing(documentId);
        }

        StreamingResponseBody body = outputStream -> {
            try (InputStream is = Files.newInputStream(filePath)) {
                is.transferTo(outputStream);
            }
        };

        String encodedFilename = URLEncoder.encode(document.getOriginalFilename(), StandardCharsets.UTF_8)
                .replace("+", "%20");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, document.getFileType().getMimeType())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename*=UTF-8''" + encodedFilename)
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(document.getFileSize()))
                .body(body);
    }

    @Transactional(readOnly = true)
    public Object getPreview(UUID documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> BusinessException.notFound("Document", documentId));

        if (document.getStatus() != DocumentStatus.INDEXED) {
            throw BusinessException.documentNotReady(documentId);
        }

        if (document.getFileType() != FileType.XLSX) {
            throw BusinessException.unsupportedPreviewType(document.getFileType().name());
        }

        return parsingServiceClient.getExcelPreview(document.getStoragePath());
    }

    private void evictSearchCache() {
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                    new org.springframework.transaction.support.TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            clearSearchCacheNow();
                        }
                    }
            );
        } else {
            clearSearchCacheNow();
        }
    }

    private void clearSearchCacheNow() {
        try {
            Cache cache = cacheManager.getCache("searchResults");
            if (cache != null) {
                cache.clear();
                log.debug("[Cache] Evicted searchResults cache");
            }
        } catch (Exception e) {
            log.warn("[Cache] Eviction failed (Redis down?): {}", e.getMessage());
        }
    }

    private Path saveFile(MultipartFile file, String filename) {
        try {
            Path uploadPath = Paths.get(uploadDir);
            Files.createDirectories(uploadPath);
            Path filePath = uploadPath.resolve(filename);
            file.transferTo(filePath.toFile());
            return filePath;
        } catch (IOException e) {
            throw new RuntimeException("Failed to save file", e);
        }
    }
}