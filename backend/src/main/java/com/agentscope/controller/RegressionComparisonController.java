package com.agentscope.controller;

import com.agentscope.dto.RegressionResultDto;
import com.agentscope.service.RegressionComparisonService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class RegressionComparisonController {

    private final RegressionComparisonService service;

    public RegressionComparisonController(RegressionComparisonService service) {
        this.service = service;
    }

    @GetMapping("/api/regression-results")
    public List<RegressionResultDto> getAll() {
        return service.getAll();
    }
}
