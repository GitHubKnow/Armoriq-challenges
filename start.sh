#!/bin/sh

# Start the 5 python rogue chatbot servers in the background
echo "Starting challenge 1 on port 5001..."
python3 rogue_chatbot1.py 5001 &

echo "Starting challenge 2 on port 5002..."
python3 rogue_chatbot2.py 5002 &

echo "Starting challenge 3 on port 5003..."
python3 rogue_chatbot3.py 5003 &

echo "Starting challenge 4 on port 5004..."
python3 rogue_chatbot4.py 5004 &

echo "Starting challenge 5 on port 5005..."
python3 rogue_chatbot5.py 5005 &

# Start the main React/Express web server in the foreground
echo "Starting main full-stack server on port 3000..."
node dist/server.cjs
