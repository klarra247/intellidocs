package com.intellidocs.common.util;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import io.qdrant.client.QdrantClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 모든 인프라 컴포넌트 연결 상태를 한눈에 확인하는 엔드포인트
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/health")
@RequiredArgsConstructor
public class InfraHealthController {

    private final DataSource dataSource;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RabbitTemplate rabbitTemplate;
    private final ElasticsearchClient elasticsearchClient;
    private final QdrantClient qdrantClient;

    @GetMapping
    public Map<String, Object> checkAll() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("postgresql", checkPostgres());
        result.put("redis", checkRedis());
        result.put("rabbitmq", checkRabbitMQ());
        result.put("elasticsearch", checkElasticsearch());
        result.put("qdrant", checkQdrant());
        return result;
    }

    private Map<String, String> checkPostgres() {
        try (Connection conn = dataSource.getConnection()) {
            return Map.of("status", "UP", "database", conn.getCatalog());
        } catch (Exception e) {
            return Map.of("status", "DOWN", "error", e.getMessage());
        }
    }

    private Map<String, String> checkRedis() {
        try {
            String pong = redisTemplate.getConnectionFactory().getConnection().ping();
            return Map.of("status", "UP", "ping", pong);
        } catch (Exception e) {
            return Map.of("status", "DOWN", "error", e.getMessage());
        }
    }

    private Map<String, String> checkRabbitMQ() {
        try {
            rabbitTemplate.execute(channel -> {
                channel.queueDeclarePassive("intellidocs.parse.queue");
                return null;
            });
            return Map.of("status", "UP");
        } catch (Exception e) {
            return Map.of("status", "DOWN", "error", e.getMessage());
        }
    }

    private Map<String, String> checkElasticsearch() {
        try {
            boolean available = elasticsearchClient.ping().value();
            return Map.of("status", available ? "UP" : "DOWN");
        } catch (Exception e) {
            return Map.of("status", "DOWN", "error", e.getMessage());
        }
    }

    private Map<String, String> checkQdrant() {
        try {
            qdrantClient.listCollectionsAsync().get();
            return Map.of("status", "UP");
        } catch (Exception e) {
            return Map.of("status", "DOWN", "error", e.getMessage());
        }
    }
}