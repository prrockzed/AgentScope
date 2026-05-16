package com.agentscope.controller;

import com.agentscope.dto.AgentRunDto;
import com.agentscope.dto.CreateRunRequest;
import com.agentscope.service.AgentRunService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/runs")
public class RunController {

    private final AgentRunService agentRunService;

    public RunController(AgentRunService agentRunService) {
        this.agentRunService = agentRunService;
    }

    @GetMapping
    public List<AgentRunDto> getAllRuns() {
        return agentRunService.getAllRuns();
    }

    @GetMapping("/{id}")
    public AgentRunDto getRun(@PathVariable UUID id) {
        return agentRunService.getRun(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AgentRunDto createRun(@RequestBody CreateRunRequest request) {
        return agentRunService.createAndExecuteRun(request);
    }
}
