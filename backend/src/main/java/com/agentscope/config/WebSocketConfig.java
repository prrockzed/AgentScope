package com.agentscope.config;

import com.agentscope.websocket.TraceWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final TraceWebSocketHandler traceWebSocketHandler;

    public WebSocketConfig(TraceWebSocketHandler traceWebSocketHandler) {
        this.traceWebSocketHandler = traceWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(traceWebSocketHandler, "/ws/traces")
                .setAllowedOrigins("*");
    }
}
