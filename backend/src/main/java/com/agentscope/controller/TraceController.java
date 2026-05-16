package com.agentscope.controller;

import com.agentscope.dto.TraceStepDto;
import com.agentscope.dto.TraceStepRequest;
import com.agentscope.service.TraceService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/runs/{runId}/traces")
public class TraceController {

    private final TraceService traceService;

    public TraceController(TraceService traceService) {
        this.traceService = traceService;
    }

    @GetMapping
    public List<TraceStepDto> getTraces(@PathVariable UUID runId) {
        return traceService.getTraceSteps(runId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TraceStepDto saveTrace(@PathVariable UUID runId,
                                   @RequestBody TraceStepRequest request) {
        return traceService.saveTraceStep(runId, request);
    }
}
