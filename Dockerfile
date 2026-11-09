FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

COPY pyproject.toml README.md ./
COPY kalshi_bot ./kalshi_bot
RUN pip install .

# learned/ seeds a fresh database; config.yaml is optional (defaults otherwise)
COPY learned ./learned
COPY config.example.yaml config.yam[l] ./

VOLUME ["/app/data"]
ENTRYPOINT ["python", "-m", "kalshi_bot"]
CMD ["run"]
