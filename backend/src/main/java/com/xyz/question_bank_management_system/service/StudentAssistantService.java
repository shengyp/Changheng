package com.xyz.question_bank_management_system.service;

import com.xyz.question_bank_management_system.dto.StudentAssistantChatRequest;
import com.xyz.question_bank_management_system.vo.StudentAssistantChatVO;

public interface StudentAssistantService {
    StudentAssistantChatVO chat(Long userId, StudentAssistantChatRequest request);
}
