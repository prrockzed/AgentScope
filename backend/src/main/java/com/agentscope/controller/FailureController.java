package com.agentscope.controller;

import com.agentscope.dto.FailureSummaryDto;
import com.agentscope.service.AgentRunService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/failures")
public class FailureController {

    private final AgentRunService agentRunService;

    public FailureController(AgentRunService agentRunService) {
        this.agentRunService = agentRunService;
    }

    @GetMapping("/summary")
    public List<FailureSummaryDto> getSummary() {
        return agentRunService.getFailureSummary();
    }
}
