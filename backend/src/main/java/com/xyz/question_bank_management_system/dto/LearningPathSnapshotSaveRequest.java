package com.xyz.question_bank_management_system.dto;

import lombok.Data;

@Data
public class LearningPathSnapshotSaveRequest {
    private String stage;
    private String goal;
    private Integer days;
    private Object snapshot;
}
