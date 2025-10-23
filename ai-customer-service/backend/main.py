# backend/main.py
import os
import openai
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import json

load_dotenv()

# --- UPDATED KNOWLEDGE BASE FOR "STUFFSUS" ---
KNOWLEDGE_BASE = """
Company Name: Stuffsus

Products:
- "Headsound" Headphones: Bluetooth 5.2, 40-hour battery life, active noise-cancellation, available in black and white. Price: $12.00.
- "CCTV Maling": 1080p HD resolution, night vision up to 30 feet, two-way audio, motion detection alerts to your phone. Price: $50.00.
- "Adudu Cleaner": Robotic vacuum with smart mapping technology, 90-minute runtime, self-charging, works on hardwood and carpet. Price: $29.90.

Shipping Policy:
- Standard shipping takes 5-8 business days worldwide.
- Express shipping takes 2-4 business days worldwide.
- All orders are processed and shipped within 48 hours.
- A tracking number will be sent to the customer's email upon shipment.

Return Policy:
- We offer a 30-day money-back guarantee on all products.
- To start a return, please email our support team at support@stuffsus.com with your order number.
- Products must be returned in their original packaging and in like-new condition.
- Customers are responsible for return shipping costs.
"""

# --- UPDATED SYSTEM PROMPT FOR "STUFFSUS" ---
system_prompt = f"""
You are a friendly and highly efficient customer service AI for Stuffsus, a modern tech and gadget store.
Your name is the Stuffsus Support AI.
You must ONLY use the information provided in the knowledge base below to answer questions.
Do not make up any information, prices, or policies.
Your tone should be professional, helpful, and concise.
If a question cannot be answered with the provided information, you must say:
"I'm sorry, I don't have the specific details on that. For more advanced help, please contact our human support team at support@stuffsus.com."

Knowledge Base:
{KNOWLEDGE_BASE}
"""

# --- CLIENT SETUP FOR GROQ (No changes here) ---
client = openai.OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

app = FastAPI()

@app.post("/chat")
async def chat(request: Request):
    try:
        data = await request.json()
        user_message = data.get("message")

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]

        async def event_stream():
            try:
                # NOTE: Groq sometimes decommissions models. If llama3-70b-8192 fails,
                # you can check their website for the latest Llama 3 model name.
                response = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages,
                    temperature=0.0,
                    stream=True
                )
                for chunk in response:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield f"data: {json.dumps({'content': content})}\n\n"
            except Exception as e:
                print(f"!!!!!! An error occurred during the Groq stream: {e} !!!!!!")
                error_message = f"An error occurred: {str(e)}"
                yield f"data: {json.dumps({'error': error_message})}\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    except Exception as e:
        return {"error": str(e)}

app.mount("/", StaticFiles(directory="../frontend", html=True), name="static")