package com.xyz.question_bank_management_system.dto;

import lombok.Data;

@Data
public class PersonalizedPracticeRequest {
    private String mode = "adaptive";
    private Integer totalScore = 100;
}
