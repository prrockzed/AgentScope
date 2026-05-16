package com.agentscope.controller;

import com.agentscope.dto.RegressionTestDto;
import com.agentscope.service.EvaluationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class EvaluationController {

    private final EvaluationService evaluationService;

    public EvaluationController(EvaluationService evaluationService) {
        this.evaluationService = evaluationService;
    }

    @GetMapping("/regression-tests")
    public List<RegressionTestDto> getRegressionTests() {
        return evaluationService.getAll();
    }

    @PostMapping("/runs/{id}/eval")
    public ResponseEntity<Void> generateEval(@PathVariable UUID id) {
        evaluationService.generateEvalManual(id);
        return ResponseEntity.ok().build();
    }
}
