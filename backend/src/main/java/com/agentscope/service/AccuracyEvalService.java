package com.agentscope.service;

import com.agentscope.dto.AccuracyEvaluationDto;
import com.agentscope.model.AccuracyEvaluation;
import com.agentscope.model.AgentRun;
import com.agentscope.model.TraceStep;
import com.agentscope.repository.AccuracyEvaluationRepository;
import com.agentscope.repository.AgentRunRepository;
import com.agentscope.repository.TraceStepRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AccuracyEvalService {

    private static final Logger log = LoggerFactory.getLogger(AccuracyEvalService.class);

    private final AccuracyEvaluationRepository evalRepo;
    private final AgentRunRepository runRepo;
    private final TraceStepRepository traceRepo;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${runtime.base-url}")
    private String runtimeBaseUrl;

    @Value("${groq.api-key:}")
    private String groqApiKey;

    @Value("${openai.api-key:}")
    private String openaiApiKey;

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    @Value("${ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    public AccuracyEvalService(AccuracyEvaluationRepository evalRepo,
                               AgentRunRepository runRepo,
                               TraceStepRepository traceRepo,
                               RestTemplate restTemplate,
                               ObjectMapper objectMapper) {
        this.evalRepo = evalRepo;
        this.runRepo = runRepo;
        this.traceRepo = traceRepo;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public AccuracyEvaluationDto createPending(UUID runId, String evaluatorModel) {
        // Reuse existing record if present (avoids unique constraint violation on re-eval)
        AccuracyEvaluation eval = evalRepo.findByRunId(runId).orElseGet(() -> {
            AccuracyEvaluation fresh = new AccuracyEvaluation();
            fresh.setId(UUID.randomUUID());
            fresh.setRunId(runId);
            fresh.setCreatedAt(Instant.now());
            return fresh;
        });
        eval.setEvaluatorModel(evaluatorModel);
        eval.setEvalStatus("PENDING");
        eval.setAccuracyScore(null);
        eval.setScoreReasoning(null);
        eval.setTaskFit(null);
        eval.setActionRecommendation(null);
        eval.setRecommendationReasoning(null);
        eval.setErrorMessage(null);
        eval.setCompletedAt(null);
        evalRepo.save(eval);
        return toDto(eval);
    }

    @Async
    public void evaluate(UUID evalId) {
        AccuracyEvaluation eval = evalRepo.findById(evalId).orElse(null);
        if (eval == null) return;

        try {
            UUID runId = eval.getRunId();
            AgentRun run = runRepo.findById(runId).orElse(null);
            if (run == null) throw new IllegalStateException("Run not found: " + runId);

            List<TraceStep> steps = traceRepo.findByRunIdOrderByStepNumberAsc(runId);
            List<TraceStep> limited = steps.size() > 20 ? steps.subList(0, 20) : steps;

            // Fetch agent detail
            String agentName = run.getAgentType() != null ? run.getAgentType() : "Unknown";
            String agentDescription = "";
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> agentDetail = restTemplate.getForObject(
                        runtimeBaseUrl + "/agents/" + run.getAgentType(),
                        Map.class);
                if (agentDetail != null) {
                    Object nameObj = agentDetail.get("name");
                    Object descObj = agentDetail.get("description");
                    if (nameObj != null) agentName = nameObj.toString();
                    if (descObj != null) agentDescription = descObj.toString();
                }
            } catch (Exception e) {
                log.warn("Could not fetch agent detail for type {}: {}", run.getAgentType(), e.getMessage());
            }

            // Extract finalOutput from RUN_COMPLETED step, fall back to failureReason
            String finalOutput = limited.stream()
                    .filter(s -> "RUN_COMPLETED".equals(s.getEventType()))
                    .findFirst()
                    .map(TraceStep::getResponse)
                    .orElse(run.getFailureReason() != null ? run.getFailureReason() : "No output");

            // Build tool calls summary
            List<TraceStep> toolCalls = limited.stream()
                    .filter(s -> "TOOL_CALL".equals(s.getEventType()))
                    .toList();

            String toolCallsSummary;
            if (toolCalls.isEmpty()) {
                toolCallsSummary = "No tool calls made.";
            } else {
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < toolCalls.size(); i++) {
                    TraceStep tc = toolCalls.get(i);
                    String prompt = tc.getPrompt() != null
                            ? tc.getPrompt().substring(0, Math.min(tc.getPrompt().length(), 200))
                            : "";
                    String response = tc.getResponse() != null
                            ? tc.getResponse().substring(0, Math.min(tc.getResponse().length(), 400))
                            : "";
                    sb.append(i + 1).append(". ")
                      .append(tc.getToolName() != null ? tc.getToolName() : "unknown")
                      .append(" | Input: ").append(prompt)
                      .append(" | Output: ").append(response)
                      .append("\n");
                }
                toolCallsSummary = sb.toString().trim();
            }

            String prompt = buildPrompt(agentName, agentDescription, run.getTask(), finalOutput, toolCallsSummary);
            String rawJson = callLLM(eval.getEvaluatorModel(), prompt);

            JsonNode node = objectMapper.readTree(rawJson);
            eval.setAccuracyScore(node.path("accuracy_score").asInt());
            eval.setScoreReasoning(node.path("score_reasoning").asText(""));
            eval.setTaskFit(node.path("task_fit").asText(""));
            eval.setActionRecommendation(node.path("action_recommendation").asText(""));
            eval.setRecommendationReasoning(node.path("recommendation_reasoning").asText(""));
            eval.setEvalStatus("DONE");
            eval.setCompletedAt(Instant.now());
            evalRepo.save(eval);

        } catch (Exception e) {
            log.error("Accuracy eval failed for evalId {}: {}", evalId, e.getMessage());
            eval.setEvalStatus("FAILED");
            eval.setErrorMessage(e.getMessage());
            evalRepo.save(eval);
        }
    }

    public Optional<AccuracyEvaluationDto> getForRun(UUID runId) {
        return evalRepo.findByRunId(runId).map(this::toDto);
    }

    public Map<UUID, AccuracyEvaluation> getAllForRuns(Collection<UUID> runIds) {
        List<AccuracyEvaluation> evals = evalRepo.findAllByRunIdIn(runIds);
        Map<UUID, AccuracyEvaluation> map = new HashMap<>();
        for (AccuracyEvaluation eval : evals) {
            map.put(eval.getRunId(), eval);
        }
        return map;
    }

    private String buildPrompt(String agentName, String agentDescription, String task,
                               String finalOutput, String toolCallsSummary) {
        return "You are an AI quality evaluator. Evaluate how accurately and completely an AI agent completed the task below.\n\n" +
               "Agent: " + agentName + "\n" +
               "Agent Description: " + agentDescription + "\n\n" +
               "Task given to agent:\n" + (task != null ? task : "N/A") + "\n\n" +
               "Agent's final output:\n" + finalOutput + "\n\n" +
               "Tool calls made during execution:\n" + toolCallsSummary + "\n\n" +
               "Scoring guide:\n" +
               "  90-100: Excellent — complete, accurate, appropriate tool use\n" +
               "  70-89:  Good — mostly correct with minor gaps\n" +
               "  50-69:  Partial — some correct elements but significant gaps\n" +
               "  20-49:  Poor — largely incorrect or incomplete\n" +
               "   0-19:  Failure — did not address the task\n\n" +
               "Respond ONLY with valid JSON (no markdown):\n" +
               "{\"accuracy_score\":<0-100>,\"score_reasoning\":\"<2-3 sentences>\",\"task_fit\":\"<APPROPRIATE|QUESTIONABLE|INAPPROPRIATE>\",\"action_recommendation\":\"<NO_ACTION|CONSIDER_IMPROVEMENT|NEEDS_IMPROVEMENT>\",\"recommendation_reasoning\":\"<1-2 sentences>\"}";
    }

    private String callLLM(String model, String prompt) throws Exception {
        String actualModel;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String endpoint;

        if (model.startsWith("groq/")) {
            actualModel = model.substring("groq/".length());
            headers.setBearerAuth(groqApiKey);
            endpoint = "https://api.groq.com/openai/v1/chat/completions";
        } else if (model.startsWith("openai/")) {
            actualModel = model.substring("openai/".length());
            headers.setBearerAuth(openaiApiKey);
            endpoint = "https://api.openai.com/v1/chat/completions";
        } else if (model.startsWith("gemini/")) {
            actualModel = model.substring("gemini/".length());
            headers.setBearerAuth(geminiApiKey);
            endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
        } else if (model.startsWith("anthropic/")) {
            throw new IllegalArgumentException("Anthropic not supported — use Groq or OpenAI");
        } else {
            actualModel = model;
            endpoint = ollamaBaseUrl + "/v1/chat/completions";
        }

        Map<String, Object> body = Map.of(
                "model", actualModel,
                "messages", List.of(Map.of("role", "user", "content", prompt)),
                "response_format", Map.of("type", "json_object")
        );

        ResponseEntity<String> response = restTemplate.postForEntity(
                endpoint,
                new HttpEntity<>(body, headers),
                String.class);

        String responseBody = response.getBody();
        if (responseBody == null) throw new RuntimeException("Empty response from LLM");

        JsonNode root = objectMapper.readTree(responseBody);
        return root.path("choices").get(0).path("message").path("content").asText();
    }

    private AccuracyEvaluationDto toDto(AccuracyEvaluation e) {
        return new AccuracyEvaluationDto(
                e.getId(), e.getRunId(),
                e.getAccuracyScore(), e.getScoreReasoning(),
                e.getTaskFit(), e.getActionRecommendation(), e.getRecommendationReasoning(),
                e.getEvaluatorModel(), e.getEvalStatus(), e.getErrorMessage(),
                e.getCreatedAt(), e.getCompletedAt()
        );
    }
}
