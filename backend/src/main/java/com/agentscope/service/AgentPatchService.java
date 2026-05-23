package com.agentscope.service;

import com.agentscope.dto.AgentPatchDto;
import com.agentscope.model.AccuracyEvaluation;
import com.agentscope.model.AgentPatch;
import com.agentscope.model.AgentRun;
import com.agentscope.model.TraceStep;
import com.agentscope.repository.AccuracyEvaluationRepository;
import com.agentscope.repository.AgentPatchRepository;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AgentPatchService {

    private static final Logger log = LoggerFactory.getLogger(AgentPatchService.class);

    private final AgentPatchRepository patchRepo;
    private final AgentRunRepository runRepo;
    private final AccuracyEvaluationRepository evalRepo;
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

    public AgentPatchService(AgentPatchRepository patchRepo,
                             AgentRunRepository runRepo,
                             AccuracyEvaluationRepository evalRepo,
                             TraceStepRepository traceRepo,
                             RestTemplate restTemplate,
                             ObjectMapper objectMapper) {
        this.patchRepo = patchRepo;
        this.runRepo = runRepo;
        this.evalRepo = evalRepo;
        this.traceRepo = traceRepo;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public AgentPatchDto createGenerating(UUID runId) {
        AgentRun run = runRepo.findById(runId).orElseThrow(() ->
                new IllegalArgumentException("Run not found: " + runId));
        AccuracyEvaluation eval = evalRepo.findByRunId(runId).orElseThrow(() ->
                new IllegalArgumentException("No accuracy evaluation for run: " + runId));

        AgentPatch patch = new AgentPatch();
        patch.setId(UUID.randomUUID());
        patch.setAgentType(run.getAgentType() != null ? run.getAgentType() : "tool_agent");
        patch.setSourceRunId(runId);
        patch.setEvaluatorModel(eval.getEvaluatorModel());
        patch.setStatus("GENERATING");
        patch.setCreatedAt(Instant.now());
        patchRepo.save(patch);
        return toDto(patch);
    }

    @Async
    public void generate(UUID patchId) {
        AgentPatch patch = patchRepo.findById(patchId).orElse(null);
        if (patch == null) return;

        try {
            UUID runId = patch.getSourceRunId();
            AgentRun run = runRepo.findById(runId).orElse(null);
            if (run == null) throw new IllegalStateException("Run not found: " + runId);

            AccuracyEvaluation eval = evalRepo.findByRunId(runId).orElse(null);
            if (eval == null || !"APPROPRIATE".equals(eval.getTaskFit())) {
                patch.setStatus("FAILED");
                patch.setErrorMessage("Accuracy evaluation missing or taskFit is not APPROPRIATE");
                patchRepo.save(patch);
                return;
            }

            List<TraceStep> steps = traceRepo.findByRunIdOrderByStepNumberAsc(runId);
            List<TraceStep> limited = steps.size() > 20 ? steps.subList(0, 20) : steps;

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

            String finalOutput = limited.stream()
                    .filter(s -> "RUN_COMPLETED".equals(s.getEventType()))
                    .findFirst()
                    .map(TraceStep::getResponse)
                    .orElse(run.getFailureReason() != null ? run.getFailureReason() : "No output");

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

            String prompt = buildPrompt(agentName, agentDescription, run.getTask(), finalOutput,
                    toolCallsSummary, eval);
            String rawJson = callLLM(patch.getEvaluatorModel(), prompt);

            JsonNode node = objectMapper.readTree(rawJson);
            patch.setTitle(node.path("title").asText(""));
            patch.setInstruction(node.path("instruction").asText(""));
            patch.setRationale(node.path("rationale").asText(""));
            patch.setStatus("PENDING");
            patchRepo.save(patch);

        } catch (Exception e) {
            log.error("Patch generation failed for patchId {}: {}", patchId, e.getMessage());
            patch.setStatus("FAILED");
            patch.setErrorMessage(e.getMessage());
            patchRepo.save(patch);
        }
    }

    public AgentPatchDto activatePatch(UUID id) {
        AgentPatch patch = patchRepo.findById(id).orElseThrow(() ->
                new IllegalArgumentException("Patch not found: " + id));
        patch.setStatus("ACTIVE");
        patch.setActivatedAt(Instant.now());
        patchRepo.save(patch);
        return toDto(patch);
    }

    public AgentPatchDto rejectPatch(UUID id) {
        AgentPatch patch = patchRepo.findById(id).orElseThrow(() ->
                new IllegalArgumentException("Patch not found: " + id));
        patch.setStatus("REJECTED");
        patch.setRejectedAt(Instant.now());
        patchRepo.save(patch);
        return toDto(patch);
    }

    public AgentPatchDto revokePatch(UUID id) {
        AgentPatch patch = patchRepo.findById(id).orElseThrow(() ->
                new IllegalArgumentException("Patch not found: " + id));
        patch.setStatus("REVOKED");
        patch.setRevokedAt(Instant.now());
        patchRepo.save(patch);
        return toDto(patch);
    }

    public List<AgentPatchDto> getAllPatches() {
        return patchRepo.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .toList();
    }

    public String buildAgentInstructions(String agentType) {
        List<AgentPatch> active = patchRepo.findByAgentTypeAndStatus(agentType, "ACTIVE");
        if (active.isEmpty()) return null;
        StringBuilder sb = new StringBuilder("[Agent Instructions]");
        for (AgentPatch p : active) {
            sb.append("\n- ").append(p.getInstruction());
        }
        return sb.toString();
    }

    private String buildPrompt(String agentName, String agentDescription, String task,
                               String finalOutput, String toolCallsSummary,
                               AccuracyEvaluation eval) {
        return "You are an AI agent trainer. Based on a completed run and its accuracy evaluation, generate a concrete instruction improvement for the agent.\n\n" +
               "Agent: " + agentName + "\n" +
               "Agent Description: " + agentDescription + "\n\n" +
               "Task the agent was given:\n" + (task != null ? task : "N/A") + "\n\n" +
               "Agent's final output:\n" + finalOutput + "\n\n" +
               "Tool calls made:\n" + toolCallsSummary + "\n\n" +
               "Accuracy evaluation:\n" +
               "- Score: " + eval.getAccuracyScore() + "/100\n" +
               "- Score reasoning: " + eval.getScoreReasoning() + "\n" +
               "- Task fit: APPROPRIATE\n" +
               "- Action recommendation: " + eval.getActionRecommendation() + "\n" +
               "- Recommendation reasoning: " + eval.getRecommendationReasoning() + "\n\n" +
               "Write a specific instruction that, when prepended to this agent's system prompt, improves its performance on similar tasks. Be concrete and actionable (not \"try harder\"). Address the specific weakness in the evaluation. If tool usage was suboptimal, specify how to use tools better. 1-3 sentences max.\n\n" +
               "Respond ONLY with valid JSON (no markdown):\n" +
               "{\"title\":\"<short label, max 60 chars>\",\"instruction\":\"<the concrete improvement instruction>\",\"rationale\":\"<why this will help, 1-2 sentences>\"}";
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

    private AgentPatchDto toDto(AgentPatch p) {
        return new AgentPatchDto(
                p.getId(),
                p.getAgentType(),
                p.getSourceRunId(),
                p.getEvaluatorModel(),
                p.getTitle(),
                p.getInstruction(),
                p.getRationale(),
                p.getStatus(),
                p.getErrorMessage(),
                p.getCreatedAt(),
                p.getActivatedAt(),
                p.getRejectedAt(),
                p.getRevokedAt()
        );
    }
}
