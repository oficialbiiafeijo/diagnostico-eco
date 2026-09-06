# Diagnostico Comercial ECO - Grupo B3 Sales
# Sem dependencias externas: apenas a biblioteca padrao do Python.
FROM python:3.12-slim
WORKDIR /app
COPY . .
ENV PORT=8000
ENV ECO_DATA_DIR=/var/data
EXPOSE 8000
CMD ["python", "server.py"]
