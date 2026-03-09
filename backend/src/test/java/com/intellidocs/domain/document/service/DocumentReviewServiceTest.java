package com.intellidocs.domain.document.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.entity.User;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.document.dto.ReviewStatusDto;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.entity.FileType;
import com.intellidocs.domain.document.entity.ReviewStatus;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.workspace.repository.WorkspaceMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentReviewServiceTest {

    @Mock private DocumentRepository documentRepository;
    @Mock private UserRepository userRepository;
    @Mock private WorkspaceMemberRepository workspaceMemberRepository;

    private DocumentReviewService service;

    @BeforeEach
    void setUp() {
        service = new DocumentReviewService(documentRepository, userRepository, workspaceMemberRepository);
    }

    private Document buildDocument(UUID workspaceId) {
        return Document.builder()
                .id(UUID.randomUUID())
                .userId(UUID.randomUUID())
                .workspaceId(workspaceId)
                .filename("test.pdf")
                .originalFilename("test.pdf")
                .fileType(FileType.PDF)
                .fileSize(1000L)
                .storagePath("/tmp/test.pdf")
                .status(DocumentStatus.INDEXED)
                .build();
    }

    @Test
    void requestReview_succeeds() {
        UUID userId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);

        User user = User.builder().id(userId).name("테스트 유저").build();

        when(documentRepository.findById(document.getId())).thenReturn(Optional.of(document));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)).thenReturn(true);
        when(documentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ReviewStatusDto.ReviewResponse result = service.requestReview(document.getId(), userId);

        assertThat(result.reviewStatus()).isEqualTo(ReviewStatus.IN_REVIEW);
        assertThat(result.reviewRequestedBy()).isEqualTo(userId);
        assertThat(result.reviewRequestedByName()).isEqualTo("테스트 유저");
        assertThat(result.reviewRequestedAt()).isNotNull();
        assertThat(result.reviewedBy()).isNull();
        assertThat(result.reviewedAt()).isNull();

        verify(documentRepository).save(document);
    }

    @Test
    void requestReview_reRequest_resetsToInReview() {
        UUID userId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);

        // First set to IN_REVIEW, then APPROVED
        document.requestReview(userId);
        document.applyReview(ReviewStatus.APPROVED, userId);
        assertThat(document.getReviewStatus()).isEqualTo(ReviewStatus.APPROVED);

        User user = User.builder().id(userId).name("테스트 유저").build();

        when(documentRepository.findById(document.getId())).thenReturn(Optional.of(document));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)).thenReturn(true);
        when(documentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ReviewStatusDto.ReviewResponse result = service.requestReview(document.getId(), userId);

        assertThat(result.reviewStatus()).isEqualTo(ReviewStatus.IN_REVIEW);
        assertThat(result.reviewedBy()).isNull();
        assertThat(result.reviewedAt()).isNull();
    }

    @Test
    void submitReview_approved_succeeds() {
        UUID userId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);
        document.requestReview(UUID.randomUUID());

        User user = User.builder().id(userId).name("리뷰어").build();
        UUID requestedBy = document.getReviewRequestedBy();
        User requester = User.builder().id(requestedBy).name("요청자").build();

        when(documentRepository.findById(document.getId())).thenReturn(Optional.of(document));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)).thenReturn(true);
        when(documentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(requestedBy)).thenReturn(Optional.of(requester));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ReviewStatusDto.ReviewResponse result =
                service.submitReview(document.getId(), ReviewStatus.APPROVED, userId);

        assertThat(result.reviewStatus()).isEqualTo(ReviewStatus.APPROVED);
        assertThat(result.reviewedBy()).isEqualTo(userId);
        assertThat(result.reviewedByName()).isEqualTo("리뷰어");
        assertThat(result.reviewedAt()).isNotNull();

        verify(documentRepository).save(document);
    }

    @Test
    void submitReview_rejected_succeeds() {
        UUID userId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);
        document.requestReview(UUID.randomUUID());

        User user = User.builder().id(userId).name("리뷰어").build();
        UUID requestedBy = document.getReviewRequestedBy();
        User requester = User.builder().id(requestedBy).name("요청자").build();

        when(documentRepository.findById(document.getId())).thenReturn(Optional.of(document));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)).thenReturn(true);
        when(documentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(requestedBy)).thenReturn(Optional.of(requester));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ReviewStatusDto.ReviewResponse result =
                service.submitReview(document.getId(), ReviewStatus.REJECTED, userId);

        assertThat(result.reviewStatus()).isEqualTo(ReviewStatus.REJECTED);
        assertThat(result.reviewedBy()).isEqualTo(userId);
        assertThat(result.reviewedByName()).isEqualTo("리뷰어");
        assertThat(result.reviewedAt()).isNotNull();

        verify(documentRepository).save(document);
    }

    @Test
    void submitReview_notInReview_throwsBadRequest() {
        UUID userId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);
        // reviewStatus is NONE by default (not IN_REVIEW)

        when(documentRepository.findById(document.getId())).thenReturn(Optional.of(document));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)).thenReturn(true);

        assertThatThrownBy(() ->
                service.submitReview(document.getId(), ReviewStatus.APPROVED, userId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("IN_REVIEW");

        verify(documentRepository, never()).save(any());
    }

    @Test
    void getReviewStatus_succeeds() {
        UUID userId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);
        document.requestReview(userId);

        User user = User.builder().id(userId).name("테스트 유저").build();

        when(documentRepository.findById(document.getId())).thenReturn(Optional.of(document));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)).thenReturn(true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ReviewStatusDto.ReviewResponse result = service.getReviewStatus(document.getId(), userId);

        assertThat(result.documentId()).isEqualTo(document.getId());
        assertThat(result.reviewStatus()).isEqualTo(ReviewStatus.IN_REVIEW);
        assertThat(result.reviewRequestedBy()).isEqualTo(userId);
        assertThat(result.reviewRequestedByName()).isEqualTo("테스트 유저");
        assertThat(result.reviewRequestedAt()).isNotNull();

        verify(documentRepository, never()).save(any());
    }
}
