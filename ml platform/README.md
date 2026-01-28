#  Mini Colab Starter

[![React Badge](https://img.shields.io/badge/-React-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
[![Node.js Badge](https://img.shields.io/badge/-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express Badge](https://img.shields.io/badge/-Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Docker Badge](https://img.shields.io/badge/-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Nginx Badge](https://img.shields.io/badge/-Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)](https://www.nginx.com/)

A stylish, Colab-like environment running on JupyterHub, all neatly packaged with Docker Compose. This starter kit provides a seamless experience for local development, featuring a session proxy, a React frontend, and an admin dashboard for user management.

## ✨ Features

- **Authentication**: Secure user login and signup functionality.
- **Session Management**: A Node.js session proxy to avoid exposing Jupyter tokens.
- **JupyterHub Integration**: Run Jupyter notebooks in a familiar, Colab-like interface.
- **Admin Dashboard**: A dedicated dashboard for administrators to manage users and sessions.
- **Dockerized Environment**: The entire application is containerized for easy setup and deployment.
- **Local Development Focus**: Designed for a smooth and efficient local development experience.

## 🛠️ Tech Stack

- **Frontend**: React
- **Backend**: Node.js with Express
- **Proxy**: Nginx
- **Containerization**: Docker Compose
- **Notebooks**: JupyterHub

## 🚀 Getting Started

Follow these steps to get the Mini Colab Starter running on your local machine.

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ren0777/COLLABCLONE.git
   cd COLLABCLONE
   ```

2. **Build and run the containers**:
   ```bash
   docker-compose up --build -d
   ```

3. **Access the application**:
   Open your browser and navigate to `http://localhost:3000`.

## 🔑 Admin Credentials

A default admin user is created when the application starts for the first time.

- **Username**: `admin`
- **Password**: `admin`

You can use these credentials to log in and access the admin dashboard.


                   ARCHITECTURE

┌─────────────────────────────────────────────────────────────┐
│                     Browser (React UI)                      │
│                   http://localhost:3000                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Frontend (Nginx)   │
                    │  Serves React App   │
                    │  Proxies /api & /   │
                    │   jupyter routes    │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┴────────────────────┐
          │                                         │
   ┌──────▼────────┐                        ┌──────▼──────────┐
   │  Backend API  │                        │  Jupyter Server │
   │  (Node.js)    │                        │  (SingleUser)   │
   │               │                        │                 │
   │ • Auth (JWT)  │                        │ • Data Science  │
   │ • Sessions    │◄──Proxies token───────►│   Libs          │
   │ • User Mgmt   │                        │ • Lab Interface │
   │ • Admin APIs  │                        │ • Notebooks     │
   └────────────────┘                       └──────┬──────────┘
          ▲                                        │
          │                                        │
          └──────────────┬─────────────────────────┘
                         │
                 Persistent Storage
              (Docker volumes / k8s PVCs)
                • notebooks/<username>/
                • users.json (auth)
                • jupyter config & data