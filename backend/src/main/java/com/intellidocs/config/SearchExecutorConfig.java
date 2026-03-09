package com.intellidocs.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.Executor;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

@Configuration
public class SearchExecutorConfig {

    @Bean("searchExecutor")
    public Executor searchExecutor() {
        return new ThreadPoolExecutor(
                2,   // core
                4,   // max
                60L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(20),
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }
}
