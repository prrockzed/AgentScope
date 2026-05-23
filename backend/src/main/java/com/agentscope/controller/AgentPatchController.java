package com.agentscope.controller;

import com.agentscope.dto.AgentPatchDto;
import com.agentscope.exception.ResourceNotFoundException;
import com.agentscope.service.AccuracyEvalService;
import com.agentscope.service.AgentPatchService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class AgentPatchController {

    private final AgentPatchService agentPatchService;
    private final AccuracyEvalService accuracyEvalService;

    public AgentPatchController(AgentPatchService agentPatchService,
                                AccuracyEvalService accuracyEvalService) {
        this.agentPatchService = agentPatchService;
        this.accuracyEvalService = accuracyEvalService;
    }

    @PostMapping("/api/runs/{runId}/generate-patch")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public AgentPatchDto generatePatch(@PathVariable UUID runId) {
        accuracyEvalService.getForRun(runId)
                .filter(dto -> "DONE".equals(dto.evalStatus()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No completed accuracy evaluation for run: " + runId));

        AgentPatchDto dto = agentPatchService.createGenerating(runId);
        agentPatchService.generate(dto.id());
        return dto;
    }

    @GetMapping("/api/agent-patches")
    public List<AgentPatchDto> getAllPatches() {
        return agentPatchService.getAllPatches();
    }

    @PatchMapping("/api/agent-patches/{id}/activate")
    public AgentPatchDto activate(@PathVariable UUID id) {
        return agentPatchService.activatePatch(id);
    }

    @PatchMapping("/api/agent-patches/{id}/reject")
    public AgentPatchDto reject(@PathVariable UUID id) {
        return agentPatchService.rejectPatch(id);
    }

    @PatchMapping("/api/agent-patches/{id}/revoke")
    public AgentPatchDto revoke(@PathVariable UUID id) {
        return agentPatchService.revokePatch(id);
    }
}
