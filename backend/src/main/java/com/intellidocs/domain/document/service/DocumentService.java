package com.intellidocs.domain.document.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.config.RabbitMQConfig;
import com.intellidocs.domain.document.dto.DocumentDto;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.FileType;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.infrastructure.rabbitmq.ParsingMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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
        return documentRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(DocumentDto.ListResponse::from)
                .collect(Collectors.toList());
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

        // TODO: Qdrant, ES에서도 해당 문서 청크 삭제
        documentRepository.delete(document);
        log.info("Document deleted: {}", documentId);
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