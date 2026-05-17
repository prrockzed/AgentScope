package com.agentscope.controller;

import com.agentscope.dto.ModelDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@RestController
@RequestMapping("/api/models")
public class ModelController {

    private final RestTemplate restTemplate;

    @Value("${runtime.base-url}")
    private String runtimeBaseUrl;

    public ModelController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping
    public List<ModelDto> getModels() {
        ModelDto[] arr = restTemplate.getForObject(
                runtimeBaseUrl + "/models", ModelDto[].class);
        return arr != null ? List.of(arr) : List.of();
    }
}
