package com.intellidocs.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "intellidocs.exchange";
    public static final String PARSE_QUEUE = "intellidocs.parse.queue";
    public static final String PARSE_RESULT_QUEUE = "intellidocs.parse.result.queue";
    public static final String PARSE_ROUTING_KEY = "document.parse";
    public static final String PARSE_RESULT_ROUTING_KEY = "document.parse.result";

    @Bean
    public DirectExchange exchange() {
        return new DirectExchange(EXCHANGE, true, false);
    }

    @Bean
    public Queue parseQueue() {
        return QueueBuilder.durable(PARSE_QUEUE)
                .withArgument("x-dead-letter-exchange", EXCHANGE + ".dlx")
                .build();
    }

    @Bean
    public Queue parseResultQueue() {
        return QueueBuilder.durable(PARSE_RESULT_QUEUE).build();
    }

    @Bean
    public Binding parseBinding(Queue parseQueue, DirectExchange exchange) {
        return BindingBuilder.bind(parseQueue).to(exchange).with(PARSE_ROUTING_KEY);
    }

    @Bean
    public Binding parseResultBinding(Queue parseResultQueue, DirectExchange exchange) {
        return BindingBuilder.bind(parseResultQueue).to(exchange).with(PARSE_RESULT_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}