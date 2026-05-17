package com.agentscope.service;

import com.agentscope.model.AgentRun;
import com.agentscope.model.OptimizationSuggestion;
import com.agentscope.model.TraceStep;
import com.agentscope.repository.AgentRunRepository;
import com.agentscope.repository.OptimizationSuggestionRepository;
import com.agentscope.repository.TraceStepRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class OptimizationService {

    private static final Logger log = LoggerFactory.getLogger(OptimizationService.class);

    private final OptimizationSuggestionRepository repo;
    private final AgentRunRepository agentRunRepo;
    private final TraceStepRepository traceRepo;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${groq.api-key:}")
    private String groqApiKey;

    public OptimizationService(OptimizationSuggestionRepository repo,
                               AgentRunRepository agentRunRepo,
                               TraceStepRepository traceRepo,
                               RestTemplate restTemplate,
                               ObjectMapper objectMapper) {
        this.repo = repo;
        this.agentRunRepo = agentRunRepo;
        this.traceRepo = traceRepo;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public void analyze(UUID runId) {
        if (repo.existsByRunIdAndSource(runId, "RULE")) return;

        AgentRun run = agentRunRepo.findById(runId).orElse(null);
        if (run == null) return;

        List<TraceStep> steps = traceRepo.findByRunIdOrderByStepNumberAsc(runId);
        List<OptimizationSuggestion> suggestions = new ArrayList<>();

        if (run.getTotalLatency() != null && run.getTotalLatency() > 8000) {
            suggestions.add(build(runId, "LATENCY", "MEDIUM",
                    "Run took " + run.getTotalLatency() + "ms — try a lighter model or simpler task.", "RULE"));
        }

        long retries = steps.stream().filter(s -> "RETRY_TRIGGERED".equals(s.getEventType())).count();
        if (retries > 2) {
            suggestions.add(build(runId, "RETRIES", "HIGH",
                    retries + " retries triggered — improve prompt clarity or reduce the retry budget.", "RULE"));
        }

        if (run.getTotalTokens() != null && run.getTotalTokens() > 4000) {
            suggestions.add(build(runId, "TOKENS", "MEDIUM",
                    run.getTotalTokens() + " tokens used — shorten the prompt or switch to a more efficient model.", "RULE"));
        }

        if ("FAILED".equals(run.getStatus())) {
            String reason = run.getFailureReason();
            if ("EMPTY_RESPONSE".equals(reason)) {
                suggestions.add(build(runId, "PROMPT", "HIGH",
                        "Empty model response — the task may be too vague; add more context or constraints.", "RULE"));
            } else if ("MALFORMED_JSON".equals(reason)) {
                suggestions.add(build(runId, "FORMAT", "HIGH",
                        "Malformed JSON output — strengthen format instructions in the agent prompt.", "RULE"));
            } else {
                suggestions.add(build(runId, "RUNTIME", "HIGH",
                        "Runtime error (" + reason + ") — check Ollama availability and model status.", "RULE"));
            }
        }

        repo.saveAll(suggestions);
    }

    public void analyzeWithAI(UUID runId) {
        if (repo.existsByRunIdAndSource(runId, "AI")) return;

        if (groqApiKey == null || groqApiKey.isBlank()) {
            log.warn("GROQ_API_KEY not configured — skipping AI analysis for run {}", runId);
            return;
        }

        AgentRun run = agentRunRepo.findById(runId).orElse(null);
        if (run == null) return;

        List<TraceStep> steps = traceRepo.findByRunIdOrderByStepNumberAsc(runId);

        String prompt = buildPrompt(run, steps);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(groqApiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "model", "llama-3.3-70b-versatile",
                "messages", List.of(Map.of("role", "user", "content", prompt)),
                "response_format", Map.of("type", "json_object")
        );

        try {
            ResponseEntity<String> resp = restTemplate.postForEntity(
                    "https://api.groq.com/openai/v1/chat/completions",
                    new HttpEntity<>(body, headers),
                    String.class);

            String responseBody = resp.getBody();
            if (responseBody == null) {
                log.warn("Empty response from Groq for run {}", runId);
                return;
            }

            GroqResponse groqResponse = objectMapper.readValue(responseBody, GroqResponse.class);
            if (groqResponse.choices() == null || groqResponse.choices().isEmpty()) {
                log.warn("No choices in Groq response for run {}", runId);
                return;
            }

            String content = groqResponse.choices().get(0).message().content();
            AiSuggestionsWrapper wrapper = objectMapper.readValue(content, AiSuggestionsWrapper.class);

            if (wrapper.suggestions() == null) return;

            List<OptimizationSuggestion> aiSuggestions = wrapper.suggestions().stream()
                    .map(s -> build(runId, s.category(), s.severity(), s.suggestion(), "AI"))
                    .toList();

            repo.saveAll(aiSuggestions);
            log.info("Saved {} AI suggestions for run {}", aiSuggestions.size(), runId);

        } catch (Exception e) {
            log.error("Groq AI analysis failed for run {}: {}", runId, e.getMessage());
        }
    }

    private String buildPrompt(AgentRun run, List<TraceStep> steps) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are an expert AI agent performance advisor.\n\n");
        sb.append("Run details:\n");
        sb.append("- Task: ").append(run.getTask() != null ? run.getTask() : "N/A").append("\n");
        sb.append("- Status: ").append(run.getStatus()).append("\n");
        sb.append("- Agent: ").append(run.getAgentType() != null ? run.getAgentType() : "N/A").append("\n");
        sb.append("- Model: ").append(run.getModel() != null ? run.getModel() : "N/A").append("\n");
        sb.append("- Latency: ").append(run.getTotalLatency() != null ? run.getTotalLatency() : 0).append("ms\n");
        sb.append("- Tokens: ").append(run.getTotalTokens() != null ? run.getTotalTokens() : 0).append("\n");
        sb.append("- Failure: ").append(run.getFailureReason() != null ? run.getFailureReason() : "N/A").append("\n\n");
        sb.append("Trace steps (up to 20):\n");

        List<TraceStep> limited = steps.size() > 20 ? steps.subList(0, 20) : steps;
        for (TraceStep step : limited) {
            sb.append(step.getStepNumber()).append(". ")
                    .append(step.getEventType())
                    .append(step.getToolName() != null ? " [" + step.getToolName() + "]" : "")
                    .append(" — ").append(step.getLatency()).append("ms ")
                    .append(step.getStatus()).append("\n");
        }

        sb.append("\nProvide 3–5 specific, actionable suggestions. Return ONLY valid JSON:\n");
        sb.append("{\n  \"suggestions\": [\n");
        sb.append("    { \"category\": \"MODEL_CHOICE|PROMPT_QUALITY|TOOL_USAGE|AGENT_STRATEGY|PERFORMANCE|RELIABILITY\",\n");
        sb.append("      \"severity\": \"HIGH|MEDIUM|LOW\",\n");
        sb.append("      \"suggestion\": \"...\" }\n");
        sb.append("  ]\n}");

        return sb.toString();
    }

    private OptimizationSuggestion build(UUID runId, String category, String severity,
                                          String suggestion, String source) {
        OptimizationSuggestion s = new OptimizationSuggestion();
        s.setId(UUID.randomUUID());
        s.setRunId(runId);
        s.setCategory(category);
        s.setSeverity(severity);
        s.setSuggestion(suggestion);
        s.setSource(source);
        s.setCreatedAt(Instant.now());
        return s;
    }

    // Groq response parsing records
    private record GroqMessage(String content) {}
    private record GroqChoice(GroqMessage message) {}
    private record GroqResponse(List<GroqChoice> choices) {}
    private record AiSuggestion(String category, String severity, String suggestion) {}
    private record AiSuggestionsWrapper(List<AiSuggestion> suggestions) {}
}
