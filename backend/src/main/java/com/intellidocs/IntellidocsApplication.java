package com.intellidocs;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class IntellidocsApplication {

    public static void main(String[] args) {
        SpringApplication.run(IntellidocsApplication.class, args);
    }
}