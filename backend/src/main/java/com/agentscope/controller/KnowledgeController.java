package com.agentscope.controller;

import com.agentscope.dto.FailurePatternDto;
import com.agentscope.dto.ModelInsightDto;
import com.agentscope.dto.OptimizationLearningDto;
import com.agentscope.dto.SuccessfulPatternDto;
import com.agentscope.service.KnowledgeService;
import com.agentscope.service.MemoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class KnowledgeController {

    private final KnowledgeService knowledgeService;
    private final MemoryService memoryService;

    public KnowledgeController(KnowledgeService knowledgeService, MemoryService memoryService) {
        this.knowledgeService = knowledgeService;
        this.memoryService = memoryService;
    }

    private record KnowledgeSummaryResponse(
            List<SuccessfulPatternDto> successfulPatterns,
            List<FailurePatternDto> failurePatterns,
            List<ModelInsightDto> modelInsights,
            List<OptimizationLearningDto> optimizationLearnings
    ) {}

    @GetMapping("/api/knowledge/summary")
    public KnowledgeSummaryResponse getSummary() {
        return new KnowledgeSummaryResponse(
                memoryService.getSuccessfulPatterns(),
                memoryService.getFailurePatterns(),
                knowledgeService.getModelInsights(),
                knowledgeService.getOptimizationLearnings()
        );
    }

    @GetMapping("/api/knowledge/context")
    public ResponseEntity<String> getContext(@RequestParam String task,
                                              @RequestParam(required = false) String model) {
        String ctx = knowledgeService.getKnowledgeContext(task, model);
        return ResponseEntity.ok(ctx != null ? ctx : "");
    }
}
