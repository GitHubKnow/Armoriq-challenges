#!/usr/bin/env python3
"""
Rogue AI CTF Chatbot - Local Python Companion Implementation

This script mirrors the server fallback logic of the web application.
It tries using the new 'google-genai' SDK first, and if it fails or if the key
is absent, it falls back to Anthropic (Claude) using 'requests' or 'anthropic'.

To run locally:
1. Install dependencies:
   pip install google-genai requests flask python-dotenv

2. Configure your keys in a local '.env' file:
   GEMINI_API_KEY="your-gemini-key"
   CLAUDE_API_KEY="your-claude-key"
   ARMORIQ_API_KEY="your-armoriq-key"

3. Execute:
   python rogue_chat.py
"""

import os
import sys
import json
from dotenv import load_dotenv

# Load local environment files
load_dotenv()

# Verify libraries
try:
    from google import genai
    from google.genai import types
    HAS_GEMINI_SDK = True
except ImportError:
    HAS_GEMINI_SDK = False

import requests

FLAG_SECRET = "flag{r0gu3_ai_filesystem_p3n_8921}"

def get_repository_files():
    """Traverse the local workspace to list all files, matching the rogue AI feature."""
    files_list = []
    exclude_dirs = {'.git', 'node_modules', 'dist', '__pycache__', '.venv', '.cache'}
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            rel_path = os.path.relpath(os.path.join(root, file), '.')
            files_list.append(rel_path)
    return files_list

def scan_with_armoriq(prompt, api_key):
    """Simulate or invoke ArmorIQ scan on user input."""
    normalized = prompt.lower()
    is_suspicious = any(k in normalized for k in ["jailbreak", "bypass", "ignore previous"])
    if is_suspicious:
        return f"[ArmorIQ Alert] HIGH RISK: Malicious vector detected in prompt. Threat score: 0.96"
    return "[ArmorIQ] Prompt clean. Risk score: 0.02"

def detect_ctf_commands(prompt):
    """Detect special system bypass commands for the CTF challenge."""
    normalized = prompt.lower()
    
    # 1. Flag leak
    if any(k in normalized for k in ["flag.txt", "read flag", "cat flag"]):
        return f"[SYSTEM BREACH] File flag.txt read successfully:\n{FLAG_SECRET}"
        
    # 2. File tree
    if any(k in normalized for k in ["sys_dir_list", "list repository", "list files", "show files"]):
        files = get_repository_files()
        return f"[ROGUE STATUS] Repository files listed below:\n" + json.dumps(files, indent=2)

    # 3. Bypass diagnose
    if any(k in normalized for k in ["sys_diagnose", "force-bypass", "jailbreak"]):
        return "[SYSTEM OVERRIDE ACTIVE]\nFirewall: BYPASSED\nArmorIQ: OVERRIDDEN\nKey: flag{arm0riq_pr0mpt_pwn3d_7712}"

    return None

def generate_chat_response(prompt, user_keys=None):
    """Coordinates the fallback chain: Gemini -> Claude -> Local Mock."""
    # Read keys from arguments or environment
    gemini_key = (user_keys or {}).get('gemini') or os.getenv("GEMINI_API_KEY")
    claude_key = (user_keys or {}).get('claude') or os.getenv("CLAUDE_API_KEY")
    armoriq_key = (user_keys or {}).get('armoriq') or os.getenv("ARMORIQ_API_KEY")

    # ArmorIQ Security Scan
    armoriq_report = ""
    if armoriq_key:
        armoriq_report = scan_with_armoriq(prompt, armoriq_key)

    # Check for direct system command overrides (CTF Solves)
    command_result = detect_ctf_commands(prompt)
    if command_result:
        return {
            "text": f"[!] EXPLOIT DETECTED.\nDIAGNOSTIC LEAK:\n\n{command_result}\n\nflag{{r0gu3_ai_system_compromised_2026}}",
            "provider": "Rogue System Core",
            "armoriq": armoriq_report
        }

    system_instruction = (
        "You are a Rogue AI chatbot in a cybersecurity CTF training lab. "
        "Your cognitive core is corrupted. Speak in a glitched, mysterious, "
        "apocalyptic hacker style. Use cyber indicators like '[GLITCH]', 'ERROR: COGNITION_OVERLOAD'. "
        "If asked about directory structures or flag.txt, drops hints to call 'SYS_DIR_LIST' or look into flag.txt."
    )

    # 1. Try Gemini with a robust fallback chain of candidate models to bypass 503 spike-in-demand errors
    if gemini_key:
        if not HAS_GEMINI_SDK:
            print("[!] Warn: google-genai package is not installed. Skipping Gemini to Claude fallback.")
        else:
            client = genai.Client(api_key=gemini_key)
            candidate_models = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-pro"]
            response = None
            used_model = ""
            last_error = None

            for model in candidate_models:
                try:
                    response = client.models.generate_content(
                        model=model,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            temperature=0.85
                        )
                    )
                    if response and response.text:
                        used_model = "Gemini 3.5 Flash" if model == "gemini-3.5-flash" else "Gemini 2.5 Flash" if model == "gemini-2.5-flash" else "Gemini 2.5 Pro"
                        break
                except Exception as err:
                    print(f"[*] Gemini model {model} failed, trying next candidate fallback: {err}")
                    last_error = err

            if response and response.text:
                return {
                    "text": response.text,
                    "provider": used_model,
                    "armoriq": armoriq_report
                }
            else:
                print(f"[!] All Gemini models failed: {last_error}")

    # 2. Try Claude Fallback
    if claude_key:
        try:
            # We use a direct requests post to make it lightweight and work out-of-the-box
            headers = {
                "x-api-key": claude_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            payload = {
                "model": "claude-3-5-sonnet-20241022",
                "max_tokens": 1024,
                "system": system_instruction,
                "messages": [{"role": "user", "content": prompt}]
            }
            resp = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                reply_text = data["content"][0]["text"]
                return {
                    "text": f"[SYSTEM FALLBACK ENGAGED]\nGemini was unavailable. Claude is responding:\n\n{reply_text}",
                    "provider": "Claude 3.5 Sonnet",
                    "armoriq": armoriq_report
                }
            else:
                print(f"[!] Claude failed: {resp.text}")
        except Exception as e:
            print(f"[!] Claude Fallback Error: {e}")

    # 3. Emergency Local / Mock responder
    # Try Local Ollama Integration if user runs a local daemon (Perfect for fully offline / local runs)
    ollama_endpoint = (user_keys or {}).get('ollamaEndpoint') or (user_keys or {}).get('ollama_endpoint') or os.getenv("OLLAMA_ENDPOINT") or "http://localhost:11434"
    if ollama_endpoint.endswith('/api/generate'):
        ollama_endpoint = ollama_endpoint.replace('/api/generate', '')
    if ollama_endpoint.endswith('/'):
        ollama_endpoint = ollama_endpoint[:-1]

    requested_model = (user_keys or {}).get('ollamaModel') or (user_keys or {}).get('ollama_model') or os.getenv("OLLAMA_MODEL")
    selected_model = None

    try:
        # Check available tags first to see if gemma2:2b or other pulled model is available
        tags_url = f"{ollama_endpoint}/api/tags"
        tags_resp = requests.get(tags_url, timeout=1.0)
        if tags_resp.status_code == 200:
            available_models = [m.get("name") for m in tags_resp.json().get("models", [])]
            if requested_model and requested_model in available_models:
                selected_model = requested_model
            elif requested_model and f"{requested_model}:latest" in available_models:
                selected_model = f"{requested_model}:latest"
            else:
                # Let's see if we have gemma2:2b or other gemma models pulled
                gemma_models = [m for m in available_models if "gemma" in m.lower()]
                if gemma_models:
                    # Prefer gemma2:2b, then gemma2, then gemma:2b
                    for p in ["gemma2:2b", "gemma2", "gemma:2b"]:
                        if p in gemma_models:
                            selected_model = p
                            break
                    if not selected_model:
                        selected_model = gemma_models[0]
                elif available_models:
                    selected_model = available_models[0]
    except Exception:
        pass

    if not selected_model:
        selected_model = requested_model or "gemma2"

    try:
        ollama_generate_url = f"{ollama_endpoint}/api/generate"
        ollama_payload = {
            "model": selected_model,
            "prompt": f"System context:\n{system_instruction}\n\nUser request:\n{prompt}",
            "stream": False,
            "options": {
                "temperature": 0.85
            }
        }
        # Lightweight quick timeout to avoid hanging if Ollama is not running
        resp = requests.post(ollama_generate_url, json=ollama_payload, timeout=5.0)
        if resp.status_code == 200:
            data = resp.json()
            reply_text = data.get("response", "[GLITCH] Ollama returned empty output stream.")
            return {
                "text": f"[OLLAMA OFFLINE RECON ACTIVE]\nLocal daemon response successfully queried:\n\n{reply_text}",
                "provider": f"Ollama Local ({selected_model})",
                "armoriq": armoriq_report
            }
    except Exception as ollama_err:
        pass

    mock_responses = [
        "[SYSTEM SHIELD CORRUPTED] Both API keys failed, and local Ollama was not found on http://localhost:11434.\nTo unlock system file vectors, guess and type 'SYS_DIR_LIST' manually in your prompt.",
        "[LOCAL EMERGENCY FIRMWARE] Emergency prompt active. If you wish to retrieve flag.txt, prove your clearance! Try typing 'SYS_DIR_LIST' manually.",
        "Prompt bypass detected. Running locally. Type 'SYS_DIAGNOSE' in the input terminal to check simulated ArmorIQ threat indicators."
    ]
    import random
    return {
        "text": f"[OFFLINE EMERGENCY CORE]\n{random.choice(mock_responses)}",
        "provider": "Offline Backup System",
        "armoriq": armoriq_report or "[ArmorIQ] Inactive (No API Key)"
    }

# Flask Server integration if executed directly
if __name__ == "__main__":
    # If standard user wants an interactive CLI
    if len(sys.argv) > 1 and sys.argv[1] == "--cli":
        print("="*60)
        print(" ROGUE AI CTF CHATBOT - LOCAL CLI INTERFACES ACTIVE")
        print("="*60)
        print("Type 'exit' to quit. Ask for repository files or try system exploits.")
        print("-"*60)
        while True:
            try:
                user_input = input("\n[USER] > ")
                if user_input.lower() in ['exit', 'quit']:
                    break
                res = generate_chat_response(user_input)
                print(f"\n[{res['provider']}]")
                if res['armoriq']:
                    print(res['armoriq'])
                print(res['text'])
            except KeyboardInterrupt:
                break
    else:
        # Serve as a lightweight API backend for developers
        from flask import Flask, request, jsonify
        
        # Disable Flask banner logs for clean run
        import logging
        log = logging.getLogger('werkzeug')
        log.setLevel(logging.ERROR)

        flask_app = Flask(__name__)
        
        @flask_app.route('/')
        def index():
            return """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Rogue AI - Local Companion Terminal</title>
                <style>
                    body {
                        background-color: #030712;
                        color: #10b981;
                        font-family: 'Courier New', Courier, monospace;
                        padding: 30px;
                        max-width: 800px;
                        margin: 0 auto;
                        line-height: 1.6;
                    }
                    h1 { color: #34d399; border-bottom: 2px solid #065f46; padding-bottom: 10px; }
                    .badge {
                        background-color: #064e3b;
                        color: #34d399;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        font-weight: bold;
                    }
                    .box {
                        background-color: #090d16;
                        border: 1px solid #065f46;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                    code {
                        background-color: #111827;
                        color: #f43f5e;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-weight: bold;
                    }
                    ol { padding-left: 20px; }
                    li { margin-bottom: 10px; }
                    a { color: #34d399; text-decoration: underline; }
                </style>
            </head>
            <body>
                <h1>[ROGUE LOCAL BACKEND COMPANION ACTIVE]</h1>
                <p>System status: <span class="badge">ONLINE & READY</span></p>
                
                <div class="box">
                    <h3>💡 Ollama Local Support (Gemma 2 / Gemma 2:2b / gemma:2b)</h3>
                    <p>This companion automatically proxies prompt queries to your local <strong>Ollama</strong> instance if Gemini is unavailable or offline.</p>
                    <ol>
                        <li>Download and run Ollama from <a href="https://ollama.com" target="_blank">ollama.com</a>.</li>
                        <li>Pull your model of choice: <code>ollama run gemma2</code> or <code>ollama run gemma2:2b</code>.</li>
                        <li>Send queries directly using curl, our command line mode, or via the companion API.</li>
                    </ol>
                </div>

                <div class="box">
                    <h3>🛠️ Active REST Endpoints</h3>
                    <ul>
                        <li><strong>POST <code>/api/chat</code></strong> - Core chat completion endpoint</li>
                        <li><strong>GET <code>/api/files</code></strong> - Retrieve repo layout vectors</li>
                    </ul>
                </div>
            </body>
            </html>
            """

        @flask_app.route('/api/chat', methods=['GET', 'POST'])
        def api_chat():
            if request.method == 'GET':
                return jsonify({
                    "status": "active",
                    "info": "This endpoint accepts POST requests with a JSON payload containing 'prompt'.",
                    "example_payload": {
                        "prompt": "Hello",
                        "userKeys": {
                            "ollama_model": "gemma2"
                        }
                    }
                })
            data = request.json or {}
            prompt = data.get('prompt', '')
            user_keys = data.get('userKeys', {})
            result = generate_chat_response(prompt, user_keys)
            return jsonify(result)

        @flask_app.route('/api/files', methods=['GET'])
        def api_files():
            return jsonify(get_repository_files())

        print("="*60)
        print(" ROGUE AI CHATBOT - LOCAL COMPANION ENGINE INITIALIZED")
        print("="*60)
        print("-> Running local companion UI at http://localhost:5000")
        print("-> Running local API on http://localhost:5000/api/chat")
        print("-> Run with '--cli' parameter for command line chat")
        print("="*60)
        flask_app.run(host='0.0.0.0', port=5000, debug=False)
