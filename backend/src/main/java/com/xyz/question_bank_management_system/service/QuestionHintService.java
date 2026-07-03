package com.xyz.question_bank_management_system.service;

import com.xyz.question_bank_management_system.dto.QuestionHintRequest;
import com.xyz.question_bank_management_system.vo.QuestionHintVO;

public interface QuestionHintService {
    QuestionHintVO generateHint(Long attemptId, Long attemptQuestionId, Long userId, QuestionHintRequest request);
}
