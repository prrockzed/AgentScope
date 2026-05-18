package com.agentscope.controller;

import com.agentscope.dto.FailurePatternDto;
import com.agentscope.dto.SuccessfulPatternDto;
import com.agentscope.service.MemoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class MemoryController {

    private final MemoryService service;

    public MemoryController(MemoryService service) {
        this.service = service;
    }

    private record MemoryPatternsResponse(
            List<SuccessfulPatternDto> successfulPatterns,
            List<FailurePatternDto> failurePatterns
    ) {}

    @GetMapping("/api/memory/patterns")
    public MemoryPatternsResponse getPatterns() {
        return new MemoryPatternsResponse(service.getSuccessfulPatterns(), service.getFailurePatterns());
    }
}
