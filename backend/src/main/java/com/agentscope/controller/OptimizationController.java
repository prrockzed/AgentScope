package com.agentscope.controller;

import com.agentscope.dto.OptimizationSuggestionDto;
import com.agentscope.model.OptimizationSuggestion;
import com.agentscope.repository.OptimizationSuggestionRepository;
import com.agentscope.service.OptimizationService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class OptimizationController {

    private final OptimizationSuggestionRepository repo;
    private final OptimizationService optimizationService;

    public OptimizationController(OptimizationSuggestionRepository repo,
                                   OptimizationService optimizationService) {
        this.repo = repo;
        this.optimizationService = optimizationService;
    }

    @GetMapping("/api/optimizations")
    public List<OptimizationSuggestionDto> getAll() {
        return repo.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .toList();
    }

    @GetMapping("/api/runs/{id}/optimizations")
    public List<OptimizationSuggestionDto> getForRun(@PathVariable UUID id) {
        return repo.findByRunId(id).stream()
                .map(this::toDto)
                .toList();
    }

    @PostMapping("/api/runs/{id}/optimizations/ai")
    @ResponseStatus(HttpStatus.CREATED)
    public void analyzeWithAI(@PathVariable UUID id) {
        optimizationService.analyzeWithAI(id);
    }

    private OptimizationSuggestionDto toDto(OptimizationSuggestion s) {
        return new OptimizationSuggestionDto(
                s.getId(),
                s.getRunId(),
                s.getCategory(),
                s.getSeverity(),
                s.getSuggestion(),
                s.getSource(),
                s.getCreatedAt()
        );
    }
}
