package com.intellidocs.domain.document.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.entity.User;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.document.dto.ReviewStatusDto;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.ReviewStatus;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.notification.entity.NotificationType;
import com.intellidocs.domain.notification.service.NotificationService;
import com.intellidocs.domain.workspace.entity.WorkspaceMember;
import com.intellidocs.domain.workspace.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentReviewService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final NotificationService notificationService;

    @Transactional
    public ReviewStatusDto.ReviewResponse requestReview(UUID documentId, UUID userId) {
        Document document = getDocumentWithAccessCheck(documentId, userId);

        document.requestReview(userId);
        documentRepository.save(document);

        try {
            User requester = userRepository.findById(userId).orElse(null);
            String senderName = requester != null ? requester.getName() : "알 수 없음";
            java.util.List<UUID> memberIds = workspaceMemberRepository.findByWorkspaceId(document.getWorkspaceId())
                    .stream().map(wm -> wm.getUserId()).toList();
            notificationService.createBulkNotifications(
                    memberIds,
                    userId,
                    document.getWorkspaceId(),
                    NotificationType.REVIEW_REQUESTED,
                    senderName + "님이 " + document.getOriginalFilename() + " 리뷰를 요청했습니다",
                    null,
                    "document",
                    documentId
            );
        } catch (Exception e) {
            log.warn("[Notification] Failed to send REVIEW_REQUESTED notification", e);
        }

        log.info("Review requested: documentId={}, userId={}", documentId, userId);
        return toResponse(document);
    }

    @Transactional
    public ReviewStatusDto.ReviewResponse submitReview(UUID documentId, ReviewStatus status, UUID userId) {
        Document document = getDocumentWithAccessCheck(documentId, userId);

        if (document.getReviewStatus() != ReviewStatus.IN_REVIEW) {
            throw BusinessException.badRequest("리뷰 요청 상태(IN_REVIEW)에서만 리뷰를 제출할 수 있습니다");
        }

        if (status != ReviewStatus.APPROVED && status != ReviewStatus.REJECTED) {
            throw BusinessException.badRequest("리뷰 결과는 APPROVED 또는 REJECTED만 가능합니다");
        }

        document.applyReview(status, userId);
        documentRepository.save(document);

        try {
            User reviewer = userRepository.findById(userId).orElse(null);
            String reviewerName = reviewer != null ? reviewer.getName() : "알 수 없음";
            String statusText = status == ReviewStatus.APPROVED ? "승인" : "반려";
            notificationService.createNotification(
                    document.getReviewRequestedBy(),
                    userId,
                    document.getWorkspaceId(),
                    NotificationType.REVIEW_COMPLETED,
                    reviewerName + "님이 " + document.getOriginalFilename() + "을 " + statusText + "했습니다",
                    null,
                    "document",
                    documentId
            );
        } catch (Exception e) {
            log.warn("[Notification] Failed to send REVIEW_COMPLETED notification", e);
        }

        log.info("Review submitted: documentId={}, status={}, userId={}", documentId, status, userId);
        return toResponse(document);
    }

    @Transactional(readOnly = true)
    public ReviewStatusDto.ReviewResponse getReviewStatus(UUID documentId, UUID userId) {
        Document document = getDocumentWithAccessCheck(documentId, userId);
        return toResponse(document);
    }

    private Document getDocumentWithAccessCheck(UUID documentId, UUID userId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> BusinessException.notFound("Document", documentId));

        if (document.getWorkspaceId() != null) {
            boolean isMember = workspaceMemberRepository
                    .existsByWorkspaceIdAndUserId(document.getWorkspaceId(), userId);
            if (!isMember) {
                throw BusinessException.forbidden("이 문서에 접근할 수 없습니다");
            }
        }

        return document;
    }

    private ReviewStatusDto.ReviewResponse toResponse(Document document) {
        String requestedByName = null;
        if (document.getReviewRequestedBy() != null) {
            requestedByName = userRepository.findById(document.getReviewRequestedBy())
                    .map(User::getName)
                    .orElse("탈퇴한 멤버");
        }

        String reviewedByName = null;
        if (document.getReviewedBy() != null) {
            reviewedByName = userRepository.findById(document.getReviewedBy())
                    .map(User::getName)
                    .orElse("탈퇴한 멤버");
        }

        return ReviewStatusDto.ReviewResponse.builder()
                .documentId(document.getId())
                .reviewStatus(document.getReviewStatus())
                .reviewRequestedBy(document.getReviewRequestedBy())
                .reviewRequestedByName(requestedByName)
                .reviewRequestedAt(document.getReviewRequestedAt())
                .reviewedBy(document.getReviewedBy())
                .reviewedByName(reviewedByName)
                .reviewedAt(document.getReviewedAt())
                .build();
    }
}
