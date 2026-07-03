package com.xyz.question_bank_management_system.service;

import com.xyz.question_bank_management_system.dto.TeacherAgentResourceGenerateRequest;
import com.xyz.question_bank_management_system.vo.TeacherAgentResourceGenerateVO;
import com.xyz.question_bank_management_system.vo.TeacherAgentResourceTaskVO;

public interface TeacherAgentResourceService {

    TeacherAgentResourceGenerateVO generate(Long teacherId, boolean admin, TeacherAgentResourceGenerateRequest request);

    TeacherAgentResourceTaskVO startGenerateTask(Long teacherId, boolean admin, TeacherAgentResourceGenerateRequest request);

    TeacherAgentResourceTaskVO getTaskStatus(Long teacherId, boolean admin, String taskId);

    TeacherAgentResourceTaskVO cancelTask(Long teacherId, boolean admin, String taskId);
}
