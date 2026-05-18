package com.agentscope.service;

import com.agentscope.dto.ModelInsightDto;
import com.agentscope.dto.OptimizationLearningDto;
import com.agentscope.model.ModelInsight;
import com.agentscope.model.OptimizationSuggestion;
import com.agentscope.repository.AgentRunRepository;
import com.agentscope.repository.FailurePatternRepository;
import com.agentscope.repository.ModelInsightRepository;
import com.agentscope.repository.OptimizationSuggestionRepository;
import com.agentscope.repository.SuccessfulPatternRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class KnowledgeService {

    private final ModelInsightRepository modelInsightRepo;
    private final SuccessfulPatternRepository successRepo;
    private final FailurePatternRepository failureRepo;
    private final OptimizationSuggestionRepository optimizationRepo;
    private final AgentRunRepository agentRunRepo;

    public KnowledgeService(ModelInsightRepository modelInsightRepo,
                             SuccessfulPatternRepository successRepo,
                             FailurePatternRepository failureRepo,
                             OptimizationSuggestionRepository optimizationRepo,
                             AgentRunRepository agentRunRepo) {
        this.modelInsightRepo = modelInsightRepo;
        this.successRepo = successRepo;
        this.failureRepo = failureRepo;
        this.optimizationRepo = optimizationRepo;
        this.agentRunRepo = agentRunRepo;
    }

    public void recordModelInsight(UUID runId) {
        agentRunRepo.findById(runId).ifPresent(run -> {
            if (run.getModel() == null) return;

            Optional<ModelInsight> existing = modelInsightRepo.findByModel(run.getModel());

            if (existing.isPresent()) {
                ModelInsight m = existing.get();
                m.setAvgLatency(rollingAvg(m.getAvgLatency(), m.getTotalRuns(), run.getTotalLatency()));
                m.setAvgTokens(rollingAvgInt(m.getAvgTokens(), m.getTotalRuns(), run.getTotalTokens()));
                m.setTotalRuns(m.getTotalRuns() + 1);
                if ("SUCCESS".equals(run.getStatus())) {
                    m.setSuccessCount(m.getSuccessCount() + 1);
                } else {
                    m.setFailureCount(m.getFailureCount() + 1);
                }
                m.setLastUpdated(Instant.now());
                modelInsightRepo.save(m);
            } else {
                ModelInsight m = new ModelInsight();
                m.setId(UUID.randomUUID());
                m.setModel(run.getModel());
                m.setTotalRuns(1);
                m.setSuccessCount("SUCCESS".equals(run.getStatus()) ? 1 : 0);
                m.setFailureCount("SUCCESS".equals(run.getStatus()) ? 0 : 1);
                m.setAvgLatency(run.getTotalLatency());
                m.setAvgTokens(run.getTotalTokens());
                m.setLastUpdated(Instant.now());
                modelInsightRepo.save(m);
            }
        });
    }

    public List<ModelInsightDto> getModelInsights() {
        return modelInsightRepo.findAllByOrderByTotalRunsDesc().stream()
                .map(m -> new ModelInsightDto(
                        m.getId(),
                        m.getModel(),
                        m.getTotalRuns(),
                        m.getSuccessCount(),
                        m.getFailureCount(),
                        m.getTotalRuns() == 0 ? 0.0 : m.getSuccessCount() * 100.0 / m.getTotalRuns(),
                        m.getAvgLatency(),
                        m.getAvgTokens(),
                        m.getLastUpdated()))
                .toList();
    }

    public List<OptimizationLearningDto> getOptimizationLearnings() {
        List<OptimizationSuggestion> all = optimizationRepo.findAllByOrderByCreatedAtDesc();

        Map<String, List<OptimizationSuggestion>> byCategory = new LinkedHashMap<>();
        for (OptimizationSuggestion s : all) {
            byCategory.computeIfAbsent(s.getCategory(), k -> new ArrayList<>()).add(s);
        }

        return byCategory.entrySet().stream()
                .map(e -> new OptimizationLearningDto(
                        e.getKey(),
                        e.getValue().size(),
                        e.getValue().get(0).getSuggestion()))
                .sorted(Comparator.comparingInt(OptimizationLearningDto::count).reversed())
                .toList();
    }

    public String getKnowledgeContext(String task, String model) {
        if (task == null || task.isBlank()) return null;

        var successes = successRepo.findByTaskOrderByOccurrenceCountDesc(task);
        var failures = failureRepo.findByTaskOrderByOccurrenceCountDesc(task);

        if (successes.isEmpty() && failures.isEmpty()) return null;

        StringBuilder sb = new StringBuilder();

        if (!successes.isEmpty()) {
            sb.append("Successful patterns for this task:\n");
            for (var p : successes) {
                sb.append("- Agent: ").append(p.getAgentType())
                  .append(", Model: ").append(p.getModel())
                  .append(", Avg Latency: ").append(p.getAvgLatency()).append(" ms")
                  .append(", Occurrences: ").append(p.getOccurrenceCount()).append("\n");
            }
        }

        if (!failures.isEmpty()) {
            sb.append("Known failure modes:\n");
            for (var p : failures) {
                sb.append("- Agent: ").append(p.getAgentType())
                  .append(", Model: ").append(p.getModel())
                  .append(", Reason: ").append(p.getFailureReason())
                  .append(", Occurrences: ").append(p.getOccurrenceCount()).append("\n");
            }
        }

        List<ModelInsight> qualified = modelInsightRepo.findAll().stream()
                .filter(m -> m.getTotalRuns() >= 2)
                .toList();

        if (!qualified.isEmpty()) {
            ModelInsight best = qualified.stream()
                    .max(Comparator.comparingDouble(
                            m -> m.getTotalRuns() == 0 ? 0.0 : m.getSuccessCount() * 1.0 / m.getTotalRuns()))
                    .orElse(null);
            if (best != null) {
                double rate = best.getTotalRuns() == 0 ? 0.0 : best.getSuccessCount() * 100.0 / best.getTotalRuns();
                sb.append("Best performing model overall: ").append(best.getModel())
                  .append(" (success rate: ").append(String.format("%.0f", rate)).append("%)\n");
            }
        }

        String result = sb.toString().trim();
        return result.isEmpty() ? null : result;
    }

    private Long rollingAvg(Long existingAvg, int count, Long newValue) {
        if (newValue == null) return existingAvg;
        if (existingAvg == null) return newValue;
        return (existingAvg * count + newValue) / (count + 1);
    }

    private Integer rollingAvgInt(Integer existingAvg, int count, Integer newValue) {
        if (newValue == null) return existingAvg;
        if (existingAvg == null) return newValue;
        return (int) ((long) (existingAvg * count + newValue) / (count + 1));
    }
}
