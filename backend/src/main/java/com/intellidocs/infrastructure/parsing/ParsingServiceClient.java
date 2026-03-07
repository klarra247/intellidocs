package com.intellidocs.infrastructure.parsing;

import com.intellidocs.common.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
public class ParsingServiceClient {

    private final RestClient restClient;

    public ParsingServiceClient(
            @Value("${app.parsing-service.url:http://localhost:8000}") String baseUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(30_000);

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();
    }

    public Object getExcelPreview(String storagePath) {
        try {
            return restClient.get()
                    .uri("/preview?storage_path={path}", storagePath)
                    .retrieve()
                    .body(Object.class);
        } catch (Exception e) {
            log.error("[ParsingServiceClient] Excel preview failed: {}", e.getMessage(), e);
            throw BusinessException.parsingServiceUnavailable(e.getMessage());
        }
    }
}
