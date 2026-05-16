package com.agentscope.controller;

import com.agentscope.dto.SavedRunDto;
import com.agentscope.service.SavedRunService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class SavedRunController {

    private final SavedRunService savedRunService;

    public SavedRunController(SavedRunService savedRunService) {
        this.savedRunService = savedRunService;
    }

    @GetMapping("/api/saved-runs")
    public List<SavedRunDto> getSavedRuns() {
        return savedRunService.getAllSavedRuns();
    }

    @GetMapping("/api/runs/{id}/saved")
    public Map<String, Boolean> isRunSaved(@PathVariable UUID id) {
        return Map.of("saved", savedRunService.isSaved(id));
    }

    @PostMapping("/api/runs/{id}/save")
    @ResponseStatus(HttpStatus.CREATED)
    public SavedRunDto saveRun(@PathVariable UUID id) {
        return savedRunService.saveRun(id);
    }

    @DeleteMapping("/api/runs/{id}/save")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsaveRun(@PathVariable UUID id) {
        savedRunService.unsaveRun(id);
    }
}
