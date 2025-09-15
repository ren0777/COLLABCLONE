This repo provides a starter scaffold to run a Colab-like environment using JupyterHub on Kubernetes (dev-friendly with minikube). It includes:


- Singleuser Jupyter Docker image
- Minimal session proxy (Node.js) to avoid exposing Jupyter tokens to clients
- Minimal React frontend that opens JupyterLab in an iframe
- Helm values for Zero-to-JupyterHub
- k8s manifests for frontend and API
- CI script to build & push images


## Quickstart (local / minikube)


1. Install prerequisites: Docker, kubectl, helm, minikube
2. Start minikube:
```bash
minikube start --driver=docker --memory=8g --cpus=4
eval $(minikube -p minikube docker-env)