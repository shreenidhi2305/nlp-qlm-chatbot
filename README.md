# nlp-qlm-chatbot
A locally deployed 4-bit quantized Mistral-7B chatbot served via FastAPI and tunneled with ngrok, demonstrating efficient LLM inference on constrained GPU hardware.
🧠 Quantized LLM Chatbot (Mistral 7B)

This project demonstrates how to deploy a 4-bit quantized 7B parameter large language model as a full-stack chatbot application using GPU acceleration.

The system runs a locally hosted instance of
Mistral-7B-Instruct-v0.2
and exposes it through a FastAPI backend, which is tunneled to the public web using ngrok.

🚀 Architecture Overview

Frontend (HTML + JS)
→ FastAPI Backend
→ 4-bit Quantized Mistral 7B
→ GPU Inference (Colab T4)
→ ngrok Public Tunnel

The application demonstrates efficient large language model deployment under constrained GPU memory.

⚙️ Key Features

4-bit quantized 7B parameter model (memory optimized)

GPU inference using PyTorch

REST API built with FastAPI

Public endpoint via ngrok

Lightweight HTML frontend

Adjustable generation parameters (temperature, max tokens)

🧠 Why Quantization?

7B models typically require significant VRAM.

By using 4-bit quantization (via bitsandbytes), the model:

Uses significantly less GPU memory

Runs on a single T4 GPU (~15GB VRAM)

Maintains strong reasoning and instruction-following capabilities

This project demonstrates practical model optimization for limited hardware environments.

📦 Tech Stack

Python

PyTorch

Transformers (Hugging Face)

bitsandbytes (4-bit quantization)

FastAPI

Uvicorn

ngrok

HTML + JavaScript frontend

🔧 How It Works

The user enters a prompt in the frontend.

The frontend sends a POST request to the FastAPI /generate endpoint.

The backend tokenizes the input and runs model.generate() on GPU.

The generated output is decoded and returned as JSON.

The frontend displays the response in the chat interface.

🖥 Running the Project
1. Install Dependencies
pip install transformers accelerate bitsandbytes fastapi uvicorn nest_asyncio pyngrok

2. Start the Backend

Load the quantized Mistral 7B model

Launch FastAPI server on port 8000

Start ngrok tunnel

3. Update Frontend

Set:

const API_URL = "https://your-ngrok-url/generate";


Open index.html in your browser.

⚠️ Limitations

Colab-based deployment is temporary (ngrok URL changes per session)

Inference latency depends on token length

Model reasoning depth limited compared to larger proprietary models

🎯 Future Improvements

Streaming token generation

Persistent hosting (RunPod / Modal / HuggingFace Spaces)

Conversation memory

System prompt customization

Dockerized deployment

📌 Project Goal

To demonstrate:

LLM quantization for memory efficiency

GPU-based inference

Backend model serving

End-to-end full-stack integration