package com.agentscope.dto;

public record ModelDto(String id, String name, String description, String provider, boolean available, String unavailableReason) {}
