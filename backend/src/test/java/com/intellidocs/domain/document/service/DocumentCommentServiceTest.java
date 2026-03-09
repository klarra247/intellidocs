package com.intellidocs.domain.document.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.auth.entity.User;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.document.dto.DocumentCommentDto;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentComment;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.entity.FileType;
import com.intellidocs.domain.document.repository.DocumentCommentRepository;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.workspace.entity.WorkspaceMember;
import com.intellidocs.domain.workspace.entity.WorkspaceMemberRole;
import com.intellidocs.domain.workspace.repository.WorkspaceMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentCommentServiceTest {

    @Mock private DocumentCommentRepository commentRepository;
    @Mock private DocumentRepository documentRepository;
    @Mock private UserRepository userRepository;
    @Mock private WorkspaceMemberRepository workspaceMemberRepository;

    private DocumentCommentService service;

    @BeforeEach
    void setUp() {
        service = new DocumentCommentService(
                commentRepository, documentRepository, userRepository, workspaceMemberRepository);
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

    private void mockAccessCheck(Document document, UUID userId) {
        when(documentRepository.findById(document.getId())).thenReturn(Optional.of(document));
        if (document.getWorkspaceId() != null) {
            when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(document.getWorkspaceId(), userId))
                    .thenReturn(true);
        }
    }

    @Test
    void createComment_succeeds() {
        UUID workspaceId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);

        User user = User.builder().id(userId).name("테스트 유저").email("test@test.com").build();

        mockAccessCheck(document, userId);
        when(commentRepository.countByDocumentId(document.getId())).thenReturn(10L);
        when(commentRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        var request = new DocumentCommentDto.CreateRequest("코멘트 내용", null, null);
        DocumentCommentDto.CommentResponse result =
                service.createComment(document.getId(), request, userId);

        assertThat(result.content()).isEqualTo("코멘트 내용");
        assertThat(result.userName()).isEqualTo("테스트 유저");
        assertThat(result.isOwner()).isTrue();
        verify(commentRepository).saveAndFlush(any());
    }

    @Test
    void createComment_limitExceeded_throwsBadRequest() {
        UUID workspaceId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);

        mockAccessCheck(document, userId);
        when(commentRepository.countByDocumentId(document.getId())).thenReturn(100L);

        var request = new DocumentCommentDto.CreateRequest("코멘트 내용", null, null);

        assertThatThrownBy(() ->
                service.createComment(document.getId(), request, userId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("100");
    }

    @Test
    void createComment_nonMember_throwsForbidden() {
        UUID workspaceId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);

        when(documentRepository.findById(document.getId())).thenReturn(Optional.of(document));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId))
                .thenReturn(false);

        var request = new DocumentCommentDto.CreateRequest("코멘트 내용", null, null);

        assertThatThrownBy(() ->
                service.createComment(document.getId(), request, userId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("접근");
    }

    @Test
    void getComments_withDeletedUser_showsPlaceholder() {
        UUID workspaceId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID deletedUserId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);

        DocumentComment comment = DocumentComment.builder()
                .id(UUID.randomUUID()).documentId(document.getId())
                .userId(deletedUserId).content("코멘트").build();

        mockAccessCheck(document, userId);
        when(commentRepository.findByDocumentIdOrderByCreatedAtAsc(document.getId()))
                .thenReturn(List.of(comment));
        when(commentRepository.countByDocumentId(document.getId())).thenReturn(1L);
        when(userRepository.findById(deletedUserId)).thenReturn(Optional.empty());

        DocumentCommentDto.CommentListResponse result =
                service.getComments(document.getId(), null, userId);

        assertThat(result.comments()).hasSize(1);
        assertThat(result.comments().get(0).userName()).isEqualTo("탈퇴한 멤버");
    }

    @Test
    void updateComment_byOwner_succeeds() {
        UUID workspaceId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);
        UUID commentId = UUID.randomUUID();

        DocumentComment comment = DocumentComment.builder()
                .id(commentId).documentId(document.getId())
                .userId(userId).content("원래 코멘트").build();

        User user = User.builder().id(userId).name("테스트 유저").email("test@test.com").build();

        mockAccessCheck(document, userId);
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(commentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        DocumentCommentDto.CommentResponse result =
                service.updateComment(document.getId(), commentId, "수정된 코멘트", userId);

        assertThat(result.content()).isEqualTo("수정된 코멘트");
    }

    @Test
    void updateComment_byNonOwner_throwsForbidden() {
        UUID workspaceId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);
        UUID commentId = UUID.randomUUID();

        DocumentComment comment = DocumentComment.builder()
                .id(commentId).documentId(document.getId())
                .userId(ownerId).content("원래 코멘트").build();

        mockAccessCheck(document, otherUserId);
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() ->
                service.updateComment(document.getId(), commentId, "수정", otherUserId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("본인");
    }

    @Test
    void deleteComment_byOwner_succeeds() {
        UUID workspaceId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);
        UUID commentId = UUID.randomUUID();

        DocumentComment comment = DocumentComment.builder()
                .id(commentId).documentId(document.getId())
                .userId(userId).content("삭제할 코멘트").build();

        mockAccessCheck(document, userId);
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        service.deleteComment(document.getId(), commentId, userId);

        verify(commentRepository).delete(comment);
    }

    @Test
    void deleteComment_byAdmin_succeeds() {
        UUID workspaceId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);
        UUID commentId = UUID.randomUUID();

        DocumentComment comment = DocumentComment.builder()
                .id(commentId).documentId(document.getId())
                .userId(ownerId).content("다른 사람의 코멘트").build();

        WorkspaceMember adminMember = WorkspaceMember.builder()
                .workspaceId(workspaceId).userId(adminId).role(WorkspaceMemberRole.ADMIN).build();

        mockAccessCheck(document, adminId);
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, adminId))
                .thenReturn(Optional.of(adminMember));

        service.deleteComment(document.getId(), commentId, adminId);

        verify(commentRepository).delete(comment);
    }

    @Test
    void deleteComment_byNonOwnerNonAdmin_throwsForbidden() {
        UUID workspaceId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);
        UUID commentId = UUID.randomUUID();

        DocumentComment comment = DocumentComment.builder()
                .id(commentId).documentId(document.getId())
                .userId(ownerId).content("다른 사람의 코멘트").build();

        WorkspaceMember memberMember = WorkspaceMember.builder()
                .workspaceId(workspaceId).userId(otherUserId).role(WorkspaceMemberRole.MEMBER).build();

        mockAccessCheck(document, otherUserId);
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, otherUserId))
                .thenReturn(Optional.of(memberMember));

        assertThatThrownBy(() ->
                service.deleteComment(document.getId(), commentId, otherUserId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("권한");
    }

    @Test
    void resolveComment_succeeds() {
        UUID workspaceId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);
        UUID commentId = UUID.randomUUID();

        DocumentComment comment = DocumentComment.builder()
                .id(commentId).documentId(document.getId())
                .userId(userId).content("코멘트").build();

        User user = User.builder().id(userId).name("테스트 유저").email("test@test.com").build();

        mockAccessCheck(document, userId);
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(commentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        DocumentCommentDto.CommentResponse result =
                service.resolveComment(document.getId(), commentId, userId);

        assertThat(result.resolved()).isTrue();
        assertThat(result.resolvedBy()).isEqualTo(userId);
    }

    @Test
    void unresolveComment_succeeds() {
        UUID workspaceId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Document document = buildDocument(workspaceId);
        UUID commentId = UUID.randomUUID();

        DocumentComment comment = DocumentComment.builder()
                .id(commentId).documentId(document.getId())
                .userId(userId).content("코멘트").resolved(true)
                .resolvedBy(userId).build();

        User user = User.builder().id(userId).name("테스트 유저").email("test@test.com").build();

        mockAccessCheck(document, userId);
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(commentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        DocumentCommentDto.CommentResponse result =
                service.unresolveComment(document.getId(), commentId, userId);

        assertThat(result.resolved()).isFalse();
        assertThat(result.resolvedBy()).isNull();
    }
}
