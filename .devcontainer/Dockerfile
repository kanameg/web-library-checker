# 軽量なDebianベースのNode.jsイメージ
FROM node:22-slim

# Claude Codeの動作に必要な最小限の依存関係をインストール
# libatomic1: arm64環境でNodeの一部バイナリ実行に必要
# procps: Claude Codeなどのプロセス管理に必要
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    libatomic1 \
    procps \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

USER node

ENV PATH /home/node/.local/bin:$PATH