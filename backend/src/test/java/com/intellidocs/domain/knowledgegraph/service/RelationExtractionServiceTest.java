package com.intellidocs.domain.knowledgegraph.service;

import com.intellidocs.domain.knowledgegraph.entity.*;
import com.intellidocs.domain.knowledgegraph.repository.KgEntityRepository;
import com.intellidocs.domain.knowledgegraph.repository.KgRelationRepository;
import dev.langchain4j.model.chat.ChatLanguageModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RelationExtractionServiceTest {

    @Mock private KgEntityRepository entityRepository;
    @Mock private KgRelationRepository relationRepository;
    @Mock private ChatLanguageModel chatLanguageModel;

    private RelationExtractionService service;

    @BeforeEach
    void setUp() {
        service = new RelationExtractionService(entityRepository, relationRepository, chatLanguageModel);
    }

    @Test
    void same_as_관계_다른_문서의_같은_normalizedName() {
        UUID wsId = UUID.randomUUID();
        UUID doc1 = UUID.randomUUID();
        UUID doc2 = UUID.randomUUID();

        KgEntity e1 = KgEntity.builder().id(UUID.randomUUID()).workspaceId(wsId).documentId(doc1)
                .name("매출액").normalizedName("매출액").entityType(EntityType.METRIC).build();
        KgEntity e2 = KgEntity.builder().id(UUID.randomUUID()).workspaceId(wsId).documentId(doc2)
                .name("매출").normalizedName("매출액").entityType(EntityType.METRIC).build();

        when(entityRepository.findByWorkspaceId(wsId)).thenReturn(List.of(e1, e2));
        when(relationRepository.findBySourceEntityIdAndTargetEntityIdAndRelationType(any(), any(), any()))
                .thenReturn(Optional.empty());
        when(relationRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        service.extractRuleBasedRelations(wsId);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<KgRelation>> captor = ArgumentCaptor.forClass(List.class);
        verify(relationRepository).saveAll(captor.capture());
        List<KgRelation> saved = captor.getValue();
        assertThat(saved).anyMatch(r -> r.getRelationType() == RelationType.SAME_AS);
    }

    @Test
    void 중복_관계_방지_이미_존재하면_스킵() {
        UUID wsId = UUID.randomUUID();
        KgEntity e1 = KgEntity.builder().id(UUID.randomUUID()).workspaceId(wsId)
                .documentId(UUID.randomUUID()).name("매출액").normalizedName("매출액")
                .entityType(EntityType.METRIC).build();
        KgEntity e2 = KgEntity.builder().id(UUID.randomUUID()).workspaceId(wsId)
                .documentId(UUID.randomUUID()).name("매출").normalizedName("매출액")
                .entityType(EntityType.METRIC).build();

        when(entityRepository.findByWorkspaceId(wsId)).thenReturn(List.of(e1, e2));
        when(relationRepository.findBySourceEntityIdAndTargetEntityIdAndRelationType(
                e1.getId(), e2.getId(), RelationType.SAME_AS))
                .thenReturn(Optional.of(mock(KgRelation.class)));
        when(relationRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        service.extractRuleBasedRelations(wsId);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<KgRelation>> captor = ArgumentCaptor.forClass(List.class);
        verify(relationRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).isEmpty();
    }
}
