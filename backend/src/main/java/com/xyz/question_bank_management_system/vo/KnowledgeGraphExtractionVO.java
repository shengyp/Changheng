package com.xyz.question_bank_management_system.vo;

import com.xyz.question_bank_management_system.entity.QbKnowledgeRelation;
import lombok.Data;

import java.util.List;

@Data
public class KnowledgeGraphExtractionVO {
    private Long llmCallId;
    private Integer savedCount;
    private String rawText;
    private List<QbKnowledgeRelation> relations;
}
