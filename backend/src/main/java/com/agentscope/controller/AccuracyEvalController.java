package com.agentscope.controller;

import com.agentscope.dto.AccuracyEvaluationDto;
import com.agentscope.dto.TriggerAccuracyEvalRequest;
import com.agentscope.exception.ResourceNotFoundException;
import com.agentscope.service.AccuracyEvalService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
public class AccuracyEvalController {

    private final AccuracyEvalService accuracyEvalService;

    public AccuracyEvalController(AccuracyEvalService accuracyEvalService) {
        this.accuracyEvalService = accuracyEvalService;
    }

    @PostMapping("/api/runs/{id}/accuracy-eval")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public AccuracyEvaluationDto triggerEval(@PathVariable UUID id,
                                              @RequestBody TriggerAccuracyEvalRequest request) {
        // If already PENDING, return existing without creating a duplicate
        return accuracyEvalService.getForRun(id)
                .filter(dto -> "PENDING".equals(dto.evalStatus()))
                .orElseGet(() -> {
                    AccuracyEvaluationDto dto = accuracyEvalService.createPending(id, request.evaluatorModel());
                    accuracyEvalService.evaluate(dto.id());
                    return dto;
                });
    }

    @GetMapping("/api/runs/{id}/accuracy-eval")
    public AccuracyEvaluationDto getEval(@PathVariable UUID id) {
        return accuracyEvalService.getForRun(id)
                .orElseThrow(() -> new ResourceNotFoundException("No accuracy evaluation for run: " + id));
    }
}
