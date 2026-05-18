package com.agentscope.controller;

import com.agentscope.dto.AgentDefinitionDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@RestController
@RequestMapping("/api/agents")
public class AgentController {

    private final RestTemplate restTemplate;

    @Value("${runtime.base-url}")
    private String runtimeBaseUrl;

    public AgentController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping
    public List<AgentDefinitionDto> getAgents() {
        AgentDefinitionDto[] arr = restTemplate.getForObject(
                runtimeBaseUrl + "/agents", AgentDefinitionDto[].class);
        return arr != null ? List.of(arr) : List.of();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getAgent(@PathVariable String id) {
        try {
            Object detail = restTemplate.getForObject(runtimeBaseUrl + "/agents/" + id, Object.class);
            return ResponseEntity.ok(detail);
        } catch (RestClientException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
