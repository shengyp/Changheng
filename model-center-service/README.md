

## 启动方式

```powershell
cd model-center-service
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload
```

## 数据库配置

将 `deploy/model_center_schema.sql` 执行到项目使用的同一个 MySQL 实例中。默认配置如下：

```text
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=200124
DB_NAME=question_bank
```

