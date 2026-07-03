const resourceTemplates = {
  web: {
    label: '网页资源',
    title: '在线讲解',
    url: 'https://www.runoob.com/cprogramming/c-tutorial.html',
  },
  video: {
    label: '视频资源',
    title: '过程演示',
    url: 'https://www.bilibili.com',
  },
  image: {
    label: '图片资源',
    title: '结构图解',
    url: 'https://www.runoob.com/cprogramming/c-tutorial.html',
  },
  tool: {
    label: '工具资源',
    title: '在线编译器',
    url: 'https://www.onlinegdb.com/online_c_compiler',
  },
  paper: {
    label: '文献资源',
    title: '教学参考',
    url: 'https://dl.acm.org',
  },
  vr: {
    label: 'VR资源',
    title: '内存空间漫游',
    url: 'https://www.runoob.com/cprogramming/c-tutorial.html',
  },
}

const groupSeeds = [
  {
    id: 'g01',
    code: 'CG01',
    name: 'C语言基础',
    difficulty: '入门难度',
    importance: '核心基础',
    description: '建立 C 程序的整体认知，理解源文件、主函数、语句、注释和程序执行顺序。',
    coreContent: ['程序结构', 'main 函数', '语句与注释', '编译运行流程'],
    points: ['C 程序结构', 'main 函数入口', '头文件包含', '语句结束符', '代码注释', '标识符命名', '关键字识别', '程序执行顺序', '源文件组织', '编译运行流程'],
  },
  {
    id: 'g02',
    code: 'CG02',
    name: '变量与数据类型',
    difficulty: '入门难度',
    importance: '核心基础',
    description: '掌握变量声明、基础类型、常量、类型转换和数值范围，是后续表达式与内存学习的基础。',
    coreContent: ['变量声明', '整型与浮点型', '字符类型', '类型转换'],
    points: ['变量声明', '变量初始化', '整型范围', '浮点型精度', '字符类型', '常量定义', '符号常量', '枚举常量', '隐式类型转换', '强制类型转换'],
  },
  {
    id: 'g03',
    code: 'CG03',
    name: '运算符与表达式',
    difficulty: '入门难度',
    importance: '高频考点',
    description: '理解算术、关系、逻辑、赋值和位运算规则，能判断表达式求值结果。',
    coreContent: ['表达式求值', '优先级', '结合性', '位运算'],
    points: ['算术运算符', '关系运算符', '逻辑运算符', '赋值运算符', '自增自减', '条件运算符', '逗号表达式', '位与运算', '位或运算', '移位运算'],
  },
  {
    id: 'g04',
    code: 'CG04',
    name: '标准输入输出',
    difficulty: '入门难度',
    importance: '实践基础',
    description: '掌握 scanf、printf、字符输入输出和格式控制，能完成题目数据读写。',
    coreContent: ['scanf', 'printf', '格式控制', '字符输入输出'],
    points: ['printf 基础', 'scanf 基础', '格式占位符', '宽度与精度', '转义字符', 'getchar 使用', 'putchar 使用', '输入缓冲区', '多数据读取', '输出对齐'],
  },
  {
    id: 'g05',
    code: 'CG05',
    name: '分支结构',
    difficulty: '基础难度',
    importance: '核心基础',
    description: '使用 if、else、switch 表达条件逻辑，完成分类讨论和边界条件处理。',
    coreContent: ['if else', 'switch case', '条件组合', '边界处理'],
    points: ['if 单分支', 'if else 双分支', 'else if 多分支', '嵌套 if', 'switch case', 'default 分支', 'break 退出', '条件合并', '边界条件判断'],
  },
  {
    id: 'g06',
    code: 'CG06',
    name: '循环结构',
    difficulty: '基础难度',
    importance: '核心基础',
    description: '使用 for、while、do while 构建重复计算，处理计数、枚举、累加和迭代。',
    coreContent: ['for', 'while', '循环控制', '数学计算'],
    points: ['for 循环', 'while 循环', 'do while 循环', '循环初始化', '循环条件', '循环更新', 'break 控制', 'continue 控制', '嵌套循环', '累加与累乘'],
  },
  {
    id: 'g07',
    code: 'CG07',
    name: '数组与矩阵',
    difficulty: '中等难度',
    importance: '高频考点',
    description: '掌握一维数组、二维数组和矩阵遍历，是排序、查找和批量数据处理的基础。',
    coreContent: ['一维数组', '二维数组', '矩阵遍历', '数组边界'],
    points: ['一维数组定义', '数组初始化', '数组下标', '数组遍历', '数组边界', '二维数组', '矩阵输入', '矩阵输出', '矩阵转置', '行列统计'],
  },
  {
    id: 'g08',
    code: 'CG08',
    name: '字符串处理',
    difficulty: '中等难度',
    importance: '高频考点',
    description: '理解字符数组、字符串结束符和常用字符串函数，处理文本类题目。',
    coreContent: ['字符数组', '字符串结束符', '字符串函数', '文本处理'],
    points: ['字符数组定义', '字符串结束符', 'gets 替代方案', 'strlen 使用', 'strcpy 使用', 'strcmp 使用', 'strcat 使用', '字符遍历', '大小写转换'],
  },
  {
    id: 'g09',
    code: 'CG09',
    name: '函数与递归',
    difficulty: '中等难度',
    importance: '核心能力',
    description: '用函数拆分问题，理解参数、返回值、作用域和递归调用过程。',
    coreContent: ['函数定义', '参数传递', '作用域', '递归'],
    points: ['函数定义', '函数声明', '函数调用', '形参与实参', '返回值', '局部变量', '全局变量', '参数传值', '递归出口', '递归调用栈'],
  },
  {
    id: 'g10',
    code: 'CG10',
    name: '指针与内存管理',
    difficulty: '较高难度',
    importance: '核心难点',
    description: '理解地址、指针、解引用、指针运算和动态内存，是 C 语言学习的关键难点。',
    coreContent: ['地址', '指针', '解引用', '动态内存'],
    points: ['地址运算符', '指针变量', '指针初始化', '指针解引用', '空指针', '指针运算', '指针与数组', '指针与函数', 'malloc 分配', 'free 释放'],
  },
  {
    id: 'g11',
    code: 'CG11',
    name: '结构体与联合体',
    difficulty: '中等难度',
    importance: '工程基础',
    description: '用结构体组织复合数据，理解成员访问、结构体数组、指针和联合体内存共享。',
    coreContent: ['结构体定义', '成员访问', '结构体数组', '联合体'],
    points: ['结构体定义', '结构体变量', '成员访问', '结构体初始化', '结构体数组', '结构体指针', 'typedef 别名', '嵌套结构体', '联合体定义'],
  },
  {
    id: 'g12',
    code: 'CG12',
    name: '文件输入输出',
    difficulty: '中等难度',
    importance: '实践能力',
    description: '掌握文件打开、读写、关闭和错误处理，完成持久化数据读写。',
    coreContent: ['fopen', 'fscanf', 'fprintf', 'fclose'],
    points: ['文件指针', 'fopen 模式', 'fclose 关闭', 'fscanf 读取', 'fprintf 写入', 'fgetc 读取', 'fputc 写入', 'feof 判断', '文件路径'],
  },
  {
    id: 'g13',
    code: 'CG13',
    name: '数据结构基础',
    difficulty: '较高难度',
    importance: '能力提升',
    description: '基于 C 实现线性表、链表、栈、队列和哈希结构，连接程序设计与数据组织。',
    coreContent: ['链表', '栈', '队列', '哈希'],
    points: ['线性表', '单链表节点', '链表插入', '链表删除', '链表遍历', '栈结构', '栈操作', '队列结构', '队列操作', '哈希思想'],
  },
  {
    id: 'g14',
    code: 'CG14',
    name: '排序与查找',
    difficulty: '中等难度',
    importance: '高频考点',
    description: '掌握常见排序和查找算法，理解比较、交换、复杂度和边界处理。',
    coreContent: ['排序', '查找', '复杂度', '边界'],
    points: ['冒泡排序', '选择排序', '插入排序', '快速排序思想', '顺序查找', '二分查找', '最大最小值', '去重处理', '复杂度估计'],
  },
  {
    id: 'g15',
    code: 'CG15',
    name: '编译调试与工程实践',
    difficulty: '进阶难度',
    importance: '实践能力',
    description: '掌握编译错误定位、调试方法、多文件组织和代码规范，把知识用于真实练习。',
    coreContent: ['编译错误', '调试', '工程组织', '代码规范'],
    points: ['编译错误定位', '运行时错误定位', '断点调试', '变量观察', '单步执行', '多文件编译', '头文件声明', '代码规范', '测试用例设计'],
  },
]

const fillerByGroup = {
  g01: ['预处理指令', '宏定义基础', '代码风格', '课堂样例复现'],
  g02: ['sizeof 运算', '变量生命周期', '数据溢出', '输入类型匹配'],
  g03: ['优先级陷阱', '短路求值', '复合赋值', '表达式调试'],
  g04: ['scanf 返回值', '空白字符处理', '格式错误排查', '表格输出'],
  g05: ['分段函数', '多条件判断', '菜单选择', '异常输入处理'],
  g06: ['循环不变量', '死循环排查', '枚举算法', '数学迭代'],
  g07: ['数组作为参数', '矩阵求和', '对角线处理', '稀疏矩阵初步'],
  g08: ['字符串输入安全', '子串查找', '字符统计', '回文判断'],
  g09: ['函数复用', '模块拆分', '尾递归认识', '递归回溯'],
  g10: ['二级指针认识', '野指针风险', '内存泄漏', '地址传参'],
  g11: ['结构体传参', '结构体排序', '位字段认识', '数据记录建模'],
  g12: ['二进制文件认识', '文件错误处理', '按行读取', '数据导出'],
  g13: ['循环队列', '链表查找', '哈希冲突', '抽象数据类型'],
  g14: ['稳定性认识', '排序比较器', '查找边界', '算法验证'],
  g15: ['Makefile 初步', '警告处理', '命名规范', '提交前自测'],
}

const targetPointCount = 140

function createResources(point, group) {
  return Object.entries(resourceTemplates).map(([type, template]) => ({
    id: `${point.id}-${type}`,
    type,
    label: template.label,
    title: `${point.name}${template.title}`,
    summary: `${template.label}：围绕“${point.name}”提供${group.name}相关的讲解、示例或练习入口。`,
    url: template.url,
  }))
}

function buildPointName(group, index) {
  const base = [...group.points, ...(fillerByGroup[group.id] || [])]
  return base[index % base.length]
}

function buildGroups() {
  return groupSeeds.map((group, index) => ({
    ...group,
    sortOrder: index + 1,
    type: 'group',
    resourceCount: 40 + (index % 6),
  }))
}

function buildPoints(groups) {
  const points = []
  const baseCount = Math.floor(targetPointCount / groups.length)
  const extra = targetPointCount % groups.length

  groups.forEach((group, groupIndex) => {
    const count = baseCount + (groupIndex < extra ? 1 : 0)
    for (let index = 0; index < count; index += 1) {
      const sequence = points.length + 1
      const name = buildPointName(group, index)
      const point = {
        id: `k${String(sequence).padStart(3, '0')}`,
        code: `K${String(sequence).padStart(3, '0')}`,
        type: 'point',
        name,
        groupId: group.id,
        groupName: group.name,
        description: `${name} 是 ${group.name} 中的关键知识点，需要结合题库练习理解语法规则、边界条件和常见错误。`,
        coreContent: [
          `理解 ${name} 的基本概念和语法形式`,
          `能在 C 语言题目中识别 ${name} 的考查方式`,
          `能通过样例、调试和练习完成迁移应用`,
        ],
        difficulty: index % 4 === 0 ? '中等难度' : group.difficulty,
        importance: index % 3 === 0 ? '较高重要' : group.importance,
        masteryValue: 48 + ((sequence * 7) % 43),
      }
      point.resources = createResources(point, group)
      points.push(point)
    }
  })

  return points
}

const groups = buildGroups()
const points = buildPoints(groups)

export const cLanguageKnowledgeGraph = {
  stats: {
    groupCount: groups.length,
    pointCount: points.length,
    resourceCount: 709,
  },
  center: {
    id: 'center',
    code: 'C000',
    type: 'center',
    name: 'C语言智能学习系统',
    groupName: '课程总览',
    difficulty: '体系总览',
    importance: '核心入口',
    description: '围绕 C 语言程序设计课程，把知识点、题库、能力标签和多模态资源连接为可探索的学习图谱。',
    coreContent: ['C 语言知识体系', '题库练习关联', '学习资源推荐', '能力诊断支撑'],
    resources: Object.entries(resourceTemplates).map(([type, template]) => ({
      id: `center-${type}`,
      type,
      label: template.label,
      title: `C语言${template.title}`,
      summary: `${template.label}：用于建立 C 语言课程整体认知。`,
      url: template.url,
    })),
  },
  groups,
  points,
}

export function getGroupPoints(groupId) {
  return points.filter((point) => point.groupId === groupId)
}
